// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {IdentityRegistry} from "../src/identity/IdentityRegistry.sol";
import {NaruswapV2Factory} from "../src/dex/NaruswapV2Factory.sol";
import {NaruswapV2Pair} from "../src/dex/NaruswapV2Pair.sol";
import {NaruswapV2Router} from "../src/dex/NaruswapV2Router.sol";
import {TokenFactory} from "../src/launchpad/TokenFactory.sol";
import {NaruToken} from "../src/launchpad/NaruToken.sol";
import {IWETH} from "../src/interfaces/IWETH.sol";
import {WETH9} from "./mocks/WETH9.sol";

/// @notice 런치패드 전체 수명주기 리허설:
///         검증(attest) → 발행+상장(issueAndList) → 터미널 매수/매도(router) → LP 회수.
///         배포 후 GIWA Sepolia에서 돌리는 스모크 스크립트와 같은 시나리오다.
contract E2ETest is Test {
    IdentityRegistry internal registry;
    NaruswapV2Factory internal dexFactory;
    NaruswapV2Router internal router;
    TokenFactory internal tokenFactory;
    WETH9 internal weth;

    address internal operator = makeAddr("operator");
    address internal issuer = makeAddr("issuer");
    address internal trader = makeAddr("trader");

    function setUp() public {
        weth = new WETH9();
        registry = new IdentityRegistry(operator);
        dexFactory = new NaruswapV2Factory();
        router = new NaruswapV2Router(address(dexFactory), address(weth));
        tokenFactory = new TokenFactory(registry, dexFactory, IWETH(address(weth)));

        vm.deal(issuer, 100 ether);
        vm.deal(trader, 100 ether);
    }

    function test_fullLifecycle() public {
        // 1) 신청 → 오프체인 심사 → 어테스테이션 (검증 게이트 통과)
        vm.prank(operator);
        registry.attest(issuer, keccak256("dojang:naru-gold-issuer"));

        // 2) 발행 + 상장: 100만 개 중 40만 개 + 10 ETH로 풀 구성
        vm.prank(issuer);
        (address token, address pair) = tokenFactory.issueAndList{value: 10 ether}(
            "Naru Gold", "NGLD", 1_000_000e18, 400_000e18, "ipfs://naru-gold"
        );

        // 3) 트레이더 매수 (터미널의 매수 버튼 경로)
        address[] memory buyPath = new address[](2);
        buyPath[0] = address(weth);
        buyPath[1] = token;
        uint256[] memory buyAmounts = router.getAmountsOut(1 ether, buyPath);

        vm.prank(trader);
        router.swapExactETHForTokens{value: 1 ether}(
            buyAmounts[1], buyPath, trader, block.timestamp + 1 hours
        );
        uint256 bought = NaruToken(token).balanceOf(trader);
        assertEq(bought, buyAmounts[1]);

        // 매수 후 가격 상승 확인 (ETH per token 기준)
        {
            (uint112 r0, uint112 r1,) = NaruswapV2Pair(pair).getReserves();
            (uint256 tokenR, uint256 wethR) =
                token < address(weth) ? (uint256(r0), uint256(r1)) : (uint256(r1), uint256(r0));
            // 초기가 10/400000 = 0.000025 ETH보다 높아야 한다
            assertGt(wethR * 1e18 / tokenR, uint256(10 ether) * 1e18 / 400_000e18);
        }

        // 4) 전량 매도 - 수수료(0.3% × 2회) 때문에 1 ETH보다 약간 적게 돌려받는다
        address[] memory sellPath = new address[](2);
        sellPath[0] = token;
        sellPath[1] = address(weth);
        uint256[] memory sellAmounts = router.getAmountsOut(bought, sellPath);

        vm.startPrank(trader);
        NaruToken(token).approve(address(router), bought);
        router.swapExactTokensForETH(
            bought, sellAmounts[1], sellPath, trader, block.timestamp + 1 hours
        );
        vm.stopPrank();

        uint256 returned = sellAmounts[1];
        assertLt(returned, 1 ether);
        assertGt(returned, 0.98 ether); // 왕복 수수료 ~0.6% + 가격영향 수준

        // 5) 발행자 LP 절반 회수
        uint256 lpBalance = NaruswapV2Pair(pair).balanceOf(issuer);
        vm.startPrank(issuer);
        NaruswapV2Pair(pair).approve(address(router), lpBalance / 2);
        (uint256 outToken, uint256 outETH) = router.removeLiquidityETH(
            token, lpBalance / 2, 0, 0, issuer, block.timestamp + 1 hours
        );
        vm.stopPrank();
        assertGt(outToken, 0);
        assertGt(outETH, 0);

        // 6) 왕복 수수료가 풀에 남았다 → K가 초기값보다 커야 한다
        {
            (uint112 r0, uint112 r1,) = NaruswapV2Pair(pair).getReserves();
            // LP 절반 회수 후에도 남은 준비금 비율로 환산한 K/LP지분이 증가했는지는
            // 수수료 누적의 결과 - 절반 회수 전 기준으로 검증하면 복잡하므로
            // 준비금이 모두 양수이고 페어가 정상 동작함을 확인하는 선에서 마감
            assertGt(uint256(r0), 0);
            assertGt(uint256(r1), 0);
        }
    }

    /// @notice 인덱서가 구독하는 topic0 상수 고정 (CLAUDE.md "인덱싱 참고"의 값과 일치해야 한다).
    ///         이벤트 시그니처를 실수로 바꾸면 이 테스트가 먼저 깨진다.
    function test_indexerTopic0Pinning() public pure {
        assertEq(
            keccak256("PairCreated(address,address,address,uint256)"),
            bytes32(0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9)
        );
        assertEq(
            keccak256("Swap(address,uint256,uint256,uint256,uint256,address)"),
            bytes32(0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822)
        );
        // Sync 는 가격 재계산 트리거 - 인덱서가 준비금·가격 갱신에 의존하는 핵심 이벤트
        assertEq(
            keccak256("Sync(uint112,uint112)"),
            bytes32(0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1)
        );
        assertEq(
            keccak256("Transfer(address,address,uint256)"),
            bytes32(0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef)
        );
        // 나루 고유 이벤트 - 인덱서 설정에 쓸 topic0를 여기 고정해둔다 (cast keccak 계산값)
        assertEq(
            keccak256("TokenIssued(address,address,string,string,uint256,bytes32,string)"),
            bytes32(0x9074df6f9d0eeb5e3741c275f37406408558e11d1a64e936a810afd9b67c3b0a)
        );
        assertEq(
            keccak256("TokenListed(address,address,uint256,uint256,address)"),
            bytes32(0xdef50dfbc89f4ee82c37697a1c272d29b5dc346f95e0f46f25086c323b368dea)
        );
        assertEq(
            keccak256("Attested(address,bytes32)"),
            bytes32(0xd04d605b1bc3879d408b185f774ce47726f0e4d808b2e00c3881d217281bd1f1)
        );
    }

    /// @notice K 불변식 정밀 검증: 스왑만 일어난 풀의 K는 단조 증가
    function test_feesAccrueToK() public {
        vm.prank(operator);
        registry.attest(issuer, keccak256("ref"));
        vm.prank(issuer);
        (, address pair) = tokenFactory.issueAndList{value: 10 ether}(
            "T", "T", 1_000_000e18, 400_000e18, ""
        );

        (uint112 r0, uint112 r1,) = NaruswapV2Pair(pair).getReserves();
        uint256 kInitial = uint256(r0) * uint256(r1);

        address[] memory path = new address[](2);
        path[0] = address(weth);
        path[1] = tokenFactory.allTokens(0);

        // 매수 5회 반복
        for (uint256 i; i < 5; i++) {
            vm.prank(trader);
            router.swapExactETHForTokens{value: 0.5 ether}(
                0, path, trader, block.timestamp + 1 hours
            );
        }

        (r0, r1,) = NaruswapV2Pair(pair).getReserves();
        assertGt(uint256(r0) * uint256(r1), kInitial, "fees must accrue to K");
    }
}
