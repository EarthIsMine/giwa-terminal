// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {NaruswapV2Factory} from "../src/dex/NaruswapV2Factory.sol";
import {NaruswapV2Pair} from "../src/dex/NaruswapV2Pair.sol";
import {NaruswapV2Router} from "../src/dex/NaruswapV2Router.sol";
import {WETH9} from "./mocks/WETH9.sol";
import {TestERC20} from "./mocks/TestERC20.sol";

contract RouterTest is Test {
    WETH9 internal weth;
    NaruswapV2Factory internal factory;
    NaruswapV2Router internal router;
    TestERC20 internal token;

    address internal user = makeAddr("user");
    uint256 internal deadline;

    function setUp() public {
        weth = new WETH9();
        factory = new NaruswapV2Factory();
        router = new NaruswapV2Router(address(factory), address(weth));
        token = new TestERC20("Naru Test", "NRT");

        token.mint(user, 1_000_000e18);
        vm.deal(user, 1_000 ether);
        vm.prank(user);
        token.approve(address(router), type(uint256).max);
        deadline = block.timestamp + 1 hours;
    }

    function _addInitialLiquidity() internal returns (address pair) {
        // 40,000 NRT : 10 ETH → 1 ETH = 4,000 NRT
        vm.prank(user);
        router.addLiquidityETH{value: 10 ether}(
            address(token), 40_000e18, 40_000e18, 10 ether, user, deadline
        );
        pair = factory.getPair(address(token), address(weth));
    }

    /// @dev 페어 정렬과 무관하게 (토큰 준비금, WETH 준비금)으로 돌려준다
    function _reserves(address pair) internal view returns (uint256 tokenR, uint256 wethR) {
        (uint112 r0, uint112 r1,) = NaruswapV2Pair(pair).getReserves();
        (tokenR, wethR) =
            address(token) < address(weth) ? (uint256(r0), uint256(r1)) : (uint256(r1), uint256(r0));
    }

    function test_addLiquidityETH_createsPoolWithExactReserves() public {
        address pair = _addInitialLiquidity();
        (uint256 tokenR, uint256 wethR) = _reserves(pair);
        assertEq(tokenR, 40_000e18);
        assertEq(wethR, 10 ether);
        assertGt(NaruswapV2Pair(pair).balanceOf(user), 0);
    }

    function test_addLiquidityETH_secondAddRefundsExcessETH() public {
        _addInitialLiquidity();
        uint256 balanceBefore = user.balance;

        // 4,000 NRT에는 1 ETH면 충분한데 2 ETH를 보낸다 → 1 ETH 환불
        vm.prank(user);
        (, uint256 amountETH,) = router.addLiquidityETH{value: 2 ether}(
            address(token), 4_000e18, 4_000e18, 1 ether, user, deadline
        );
        assertEq(amountETH, 1 ether);
        assertEq(balanceBefore - user.balance, 1 ether); // 실제 차감도 1 ETH뿐
    }

    function test_swapExactETHForTokens_deliversQuotedAmount() public {
        _addInitialLiquidity();

        address[] memory path = new address[](2);
        path[0] = address(weth);
        path[1] = address(token);
        uint256[] memory amounts = router.getAmountsOut(1 ether, path);

        uint256 before = token.balanceOf(user);
        vm.prank(user);
        router.swapExactETHForTokens{value: 1 ether}(amounts[1], path, user, deadline);
        assertEq(token.balanceOf(user) - before, amounts[1]);
    }

    function test_swapExactETHForTokens_slippageGuardReverts() public {
        _addInitialLiquidity();
        address[] memory path = new address[](2);
        path[0] = address(weth);
        path[1] = address(token);
        uint256[] memory amounts = router.getAmountsOut(1 ether, path);

        vm.prank(user);
        vm.expectRevert(bytes("Naruswap: INSUFFICIENT_OUTPUT_AMOUNT"));
        router.swapExactETHForTokens{value: 1 ether}(amounts[1] + 1, path, user, deadline);
    }

    function test_expiredDeadlineReverts() public {
        _addInitialLiquidity();
        address[] memory path = new address[](2);
        path[0] = address(weth);
        path[1] = address(token);

        vm.prank(user);
        vm.expectRevert(bytes("Naruswap: EXPIRED"));
        router.swapExactETHForTokens{value: 1 ether}(0, path, user, block.timestamp - 1);
    }

    function test_swapExactTokensForETH_deliversQuotedAmount() public {
        _addInitialLiquidity();
        address[] memory path = new address[](2);
        path[0] = address(token);
        path[1] = address(weth);
        uint256[] memory amounts = router.getAmountsOut(4_000e18, path);

        uint256 before = user.balance;
        vm.prank(user);
        router.swapExactTokensForETH(4_000e18, amounts[1], path, user, deadline);
        assertEq(user.balance - before, amounts[1]);
    }

    function test_removeLiquidityETH_returnsBothAssets() public {
        address pair = _addInitialLiquidity();
        uint256 liquidity = NaruswapV2Pair(pair).balanceOf(user);

        uint256 tokenBefore = token.balanceOf(user);
        uint256 ethBefore = user.balance;
        vm.startPrank(user);
        NaruswapV2Pair(pair).approve(address(router), liquidity);
        (uint256 amountToken, uint256 amountETH) = router.removeLiquidityETH(
            address(token), liquidity, 0, 0, user, deadline
        );
        vm.stopPrank();

        // MINIMUM_LIQUIDITY 몫을 제외한 전량 회수
        assertEq(token.balanceOf(user) - tokenBefore, amountToken);
        assertEq(user.balance - ethBefore, amountETH);
        assertApproxEqRel(amountToken, 40_000e18, 1e12); // 잠금 몫만큼의 오차
        assertApproxEqRel(amountETH, 10 ether, 1e12);
    }

    function test_multiHopSwap_throughWETH() public {
        _addInitialLiquidity();

        // 두 번째 자산 상장: 20,000 NRB : 10 ETH
        TestERC20 tokenB = new TestERC20("Naru B", "NRB");
        tokenB.mint(user, 100_000e18);
        vm.startPrank(user);
        tokenB.approve(address(router), type(uint256).max);
        router.addLiquidityETH{value: 10 ether}(
            address(tokenB), 20_000e18, 20_000e18, 10 ether, user, deadline
        );

        address[] memory path = new address[](3);
        path[0] = address(token);
        path[1] = address(weth);
        path[2] = address(tokenB);
        uint256[] memory amounts = router.getAmountsOut(4_000e18, path);

        uint256 before = tokenB.balanceOf(user);
        router.swapExactTokensForTokens(4_000e18, amounts[2], path, user, deadline);
        vm.stopPrank();
        assertEq(tokenB.balanceOf(user) - before, amounts[2]);
    }

    function test_quoteViews() public {
        _addInitialLiquidity();
        assertEq(router.quote(1e18, 2e18, 4e18), 2e18);
        // V2 공식 스팟체크: 997*1e18*10e18 / (10e18*1000 + 997*1e18)
        uint256 out = router.getAmountOut(1e18, 10e18, 10e18);
        assertEq(out, uint256(997e18 * 10e18) / (10_000e18 + 997e18));
    }
}
