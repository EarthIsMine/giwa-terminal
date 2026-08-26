// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {IdentityRegistry} from "../src/identity/IdentityRegistry.sol";
import {NaruswapV2Factory} from "../src/dex/NaruswapV2Factory.sol";
import {NaruswapV2Pair} from "../src/dex/NaruswapV2Pair.sol";
import {TokenFactory} from "../src/launchpad/TokenFactory.sol";
import {NaruToken} from "../src/launchpad/NaruToken.sol";
import {IWETH} from "../src/interfaces/IWETH.sol";
import {WETH9} from "./mocks/WETH9.sol";

contract TokenFactoryTest is Test {
    IdentityRegistry internal registry;
    NaruswapV2Factory internal dexFactory;
    WETH9 internal weth;
    TokenFactory internal tokenFactory;

    address internal operator = makeAddr("operator");
    address internal issuer = makeAddr("issuer");
    address internal stranger = makeAddr("stranger");
    bytes32 internal constant REF = keccak256("dojang:attestation:issuer-1");

    uint256 internal constant SUPPLY = 1_000_000e18;
    string internal constant META = "ipfs://bafy.../meta.json";

    function setUp() public {
        registry = new IdentityRegistry(operator);
        dexFactory = new NaruswapV2Factory();
        weth = new WETH9();
        tokenFactory = new TokenFactory(registry, dexFactory, IWETH(address(weth)));

        vm.prank(operator);
        registry.attest(issuer, REF);
        vm.deal(issuer, 100 ether);
        vm.deal(stranger, 100 ether);
    }

    function test_unverifiedIssuerReverts() public {
        vm.prank(stranger);
        vm.expectRevert(TokenFactory.NotVerified.selector);
        tokenFactory.issueAndList("Naru Gold", "NGLD", SUPPLY, 0, META);
    }

    function test_issueOnly_mintsFullSupplyToIssuer() public {
        vm.prank(issuer);
        (address token, address pair) =
            tokenFactory.issueAndList("Naru Gold", "NGLD", SUPPLY, 0, META);

        assertEq(pair, address(0));
        NaruToken t = NaruToken(token);
        assertEq(t.balanceOf(issuer), SUPPLY);
        assertEq(t.totalSupply(), SUPPLY);
        assertEq(t.name(), "Naru Gold");
        assertEq(t.symbol(), "NGLD");
        assertEq(t.issuer(), issuer);
        assertEq(t.tokenFactory(), address(tokenFactory));

        (address issuer_, bytes32 ref, address pair_, uint64 issuedAt, string memory meta) =
            tokenFactory.issuedTokens(token);
        assertEq(issuer_, issuer);
        assertEq(ref, REF);
        assertEq(pair_, address(0));
        assertEq(issuedAt, block.timestamp);
        assertEq(meta, META);
        assertTrue(tokenFactory.isIssued(token));
        assertEq(tokenFactory.allTokensLength(), 1);
        assertEq(tokenFactory.allTokens(0), token);
    }

    function test_issueAndList_splitsSupplyAndSeedsPool() public {
        uint256 liquidityTokens = 400_000e18;
        vm.prank(issuer);
        (address token, address pair) =
            tokenFactory.issueAndList{value: 10 ether}("Naru Gold", "NGLD", SUPPLY, liquidityTokens, META);

        // 공급 분배: 유동성 40만 + 발행자 60만
        assertEq(NaruToken(token).balanceOf(issuer), SUPPLY - liquidityTokens);
        assertEq(NaruToken(token).balanceOf(pair), liquidityTokens);
        assertEq(weth.balanceOf(pair), 10 ether);

        // LP는 발행자에게 (MINIMUM_LIQUIDITY 제외 전량)
        NaruswapV2Pair p = NaruswapV2Pair(pair);
        assertEq(p.balanceOf(issuer), p.totalSupply() - 1000);

        // 레지스트리에 페어 기록
        (,, address pair_,,) = tokenFactory.issuedTokens(token);
        assertEq(pair_, pair);
        assertEq(dexFactory.getPair(token, address(weth)), pair);
    }

    function test_issueAndList_emitsEventsWithDeterministicToken() public {
        // TokenFactory의 첫 CREATE 논스는 1 → 토큰 주소는 사전 계산 가능
        address predicted = vm.computeCreateAddress(address(tokenFactory), 1);

        vm.expectEmit(address(tokenFactory));
        emit TokenFactory.TokenIssued(predicted, issuer, "Naru Gold", "NGLD", SUPPLY, REF, META);
        vm.prank(issuer);
        (address token,) = tokenFactory.issueAndList("Naru Gold", "NGLD", SUPPLY, 0, META);
        assertEq(token, predicted);
    }

    function test_paramValidation() public {
        vm.startPrank(issuer);

        vm.expectRevert(TokenFactory.ZeroSupply.selector);
        tokenFactory.issueAndList("A", "A", 0, 0, META);

        vm.expectRevert(TokenFactory.LiquidityExceedsSupply.selector);
        tokenFactory.issueAndList("A", "A", 100, 101, META);

        // ETH만 보내고 유동성 토큰 0
        vm.expectRevert(TokenFactory.LiquidityParamsMismatch.selector);
        tokenFactory.issueAndList{value: 1 ether}("A", "A", SUPPLY, 0, META);

        // 유동성 토큰만 있고 ETH 0
        vm.expectRevert(TokenFactory.LiquidityParamsMismatch.selector);
        tokenFactory.issueAndList("A", "A", SUPPLY, 1e18, META);

        vm.stopPrank();
    }

    function test_revokedIssuerCannotIssueAgain() public {
        vm.prank(issuer);
        (address token,) = tokenFactory.issueAndList("Naru Gold", "NGLD", SUPPLY, 0, META);

        vm.prank(operator);
        registry.revoke(issuer);

        vm.prank(issuer);
        vm.expectRevert(TokenFactory.NotVerified.selector);
        tokenFactory.issueAndList("Naru Silver", "NSLV", SUPPLY, 0, META);

        // 이미 발행된 토큰의 발행 시점 스냅샷은 불변 - "발행 당시 검증됨"은 사실로 남는다
        (, bytes32 ref,,,) = tokenFactory.issuedTokens(token);
        assertEq(ref, REF);
        assertTrue(tokenFactory.isIssued(token));
    }

    function test_naruTokenHasNoPrivilegedSurface() public {
        vm.prank(issuer);
        (address token,) = tokenFactory.issueAndList("Naru Gold", "NGLD", SUPPLY, 0, META);

        // 발행 후 총공급 고정 - mint 표면 자체가 없음을 셀렉터 호출로 확인
        (bool ok,) = token.call(abi.encodeWithSignature("mint(address,uint256)", issuer, 1e18));
        assertFalse(ok);
        (ok,) = token.call(abi.encodeWithSignature("burn(uint256)", 1e18));
        assertFalse(ok);
        assertEq(NaruToken(token).totalSupply(), SUPPLY);
    }
}
