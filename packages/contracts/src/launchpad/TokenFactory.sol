// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IIdentityVerifier} from "../interfaces/IIdentityVerifier.sol";
import {INaruswapV2Factory} from "../interfaces/INaruswapV2Factory.sol";
import {INaruswapV2Pair} from "../interfaces/INaruswapV2Pair.sol";
import {IWETH} from "../interfaces/IWETH.sol";
import {NaruToken} from "./NaruToken.sol";

/// @title TokenFactory - 나루 런치패드의 발행 게이트
///
/// "런치패드는 제품이다" (2026-07-21 팀 결정). 퍼미션리스가 아니라 신원 검증 발행이
/// 정체성이며, 이 컨트랙트가 그 게이트다:
///
///   신청 → (오프체인 심사) → IdentityRegistry.attest → issueAndList → 상장
///
/// 검증된 신원만 통과할 수 있고, 발행 시점의 신원 참조(identityRef)를 레지스트리에
/// 스냅샷으로 남긴다. 터미널의 "검증 자산" 배지는 이 레지스트리를 원천으로 그린다.
/// 데모 시드 봇과 런치패드 제품이 같은 경로(이 컨트랙트)를 쓴다 - 경로가 갈리면
/// 데모와 제품이 다른 물건이 된다.
contract TokenFactory {
    IIdentityVerifier public immutable identity;
    INaruswapV2Factory public immutable dexFactory;
    IWETH public immutable weth;

    struct IssuedToken {
        /// @notice 발행자 주소 (발행 시점에 검증된 신원)
        address issuer;
        /// @notice 발행 시점 신원 참조 스냅샷 - 이후 revoke 되어도 "발행 당시 검증됨"은 불변 사실
        bytes32 identityRef;
        /// @notice 상장 풀 (WETH 페어). 미상장 발행이면 address(0)
        address pair;
        uint64 issuedAt;
        /// @notice 로고·소개 등 오프체인 메타데이터 포인터 (내용 해시 포함 URI 권장)
        string metadataURI;
    }

    mapping(address => IssuedToken) public issuedTokens;
    address[] public allTokens;

    /// @dev 인덱서 구독 대상. TokenIssued가 자산의 탄생, TokenListed가 거래 시작 시점이다.
    event TokenIssued(
        address indexed token,
        address indexed issuer,
        string name,
        string symbol,
        uint256 totalSupply,
        bytes32 identityRef,
        string metadataURI
    );
    event TokenListed(
        address indexed token,
        address indexed pair,
        uint256 tokenAmount,
        uint256 ethAmount,
        address lpRecipient
    );

    error NotVerified();
    error ZeroSupply();
    error LiquidityExceedsSupply();
    /// @dev 상장하려면 토큰과 ETH 둘 다, 발행만 하려면 둘 다 0이어야 한다
    error LiquidityParamsMismatch();

    constructor(IIdentityVerifier identity_, INaruswapV2Factory dexFactory_, IWETH weth_) {
        identity = identity_;
        dexFactory = dexFactory_;
        weth = weth_;
    }

    /// @notice 검증된 발행자가 토큰을 발행하고, 원하면 같은 트랜잭션에서 WETH 페어에 상장한다.
    /// @param name_           토큰 이름
    /// @param symbol_         티커
    /// @param totalSupply_    총 공급량 (고정, 이후 변경 불가)
    /// @param liquidityTokens 초기 유동성으로 넣을 토큰 수량 (0이면 발행만)
    /// @param metadataURI     오프체인 메타데이터 포인터
    /// @dev msg.value가 초기 유동성 ETH. LP 토큰은 발행자에게 간다 (v1은 LP 락 강제 없음 -
    ///      검증된 신원이 책임 주체라는 전제. 락 모듈은 이후 단계에서 옵션으로 추가).
    function issueAndList(
        string calldata name_,
        string calldata symbol_,
        uint256 totalSupply_,
        uint256 liquidityTokens,
        string calldata metadataURI
    ) external payable returns (address token, address pair) {
        if (!identity.isVerified(msg.sender)) revert NotVerified();
        if (totalSupply_ == 0) revert ZeroSupply();
        if (liquidityTokens > totalSupply_) revert LiquidityExceedsSupply();
        if ((liquidityTokens > 0) != (msg.value > 0)) revert LiquidityParamsMismatch();

        bytes32 identityRef = identity.identityRefOf(msg.sender);

        // 1) 발행 - 전량을 게이트가 받아 분배한다
        token = address(new NaruToken(name_, symbol_, totalSupply_, address(this), msg.sender));
        issuedTokens[token] = IssuedToken({
            issuer: msg.sender,
            identityRef: identityRef,
            pair: address(0),
            issuedAt: uint64(block.timestamp),
            metadataURI: metadataURI
        });
        allTokens.push(token);
        emit TokenIssued(
            token, msg.sender, name_, symbol_, totalSupply_, identityRef, metadataURI
        );

        // 2) 상장 (선택) - 페어 생성 후 양쪽을 직접 넣고 mint. 신규 페어라 슬리피지 개념 없음
        if (liquidityTokens > 0) {
            pair = dexFactory.createPair(token, address(weth));
            issuedTokens[token].pair = pair;
            // NaruToken은 이 파일의 고정 구현 - 잔고 부족 시 revert, 항상 true 반환
            // forge-lint: disable-next-line(erc20-unchecked-transfer)
            NaruToken(token).transfer(pair, liquidityTokens);
            weth.deposit{value: msg.value}();
            assert(weth.transfer(pair, msg.value));
            INaruswapV2Pair(pair).mint(msg.sender);
            emit TokenListed(token, pair, liquidityTokens, msg.value, msg.sender);
        }

        // 3) 잔여 공급량은 발행자에게
        uint256 rest = totalSupply_ - liquidityTokens;
        if (rest > 0) {
            // forge-lint: disable-next-line(erc20-unchecked-transfer)
            NaruToken(token).transfer(msg.sender, rest);
        }
    }

    function allTokensLength() external view returns (uint256) {
        return allTokens.length;
    }

    /// @notice 터미널 검증 배지의 온체인 판정 - 이 게이트를 거친 토큰인가
    function isIssued(address token) external view returns (bool) {
        return issuedTokens[token].issuer != address(0);
    }
}
