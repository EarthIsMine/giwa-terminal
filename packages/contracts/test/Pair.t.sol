// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {NaruswapV2Factory} from "../src/dex/NaruswapV2Factory.sol";
import {NaruswapV2Pair} from "../src/dex/NaruswapV2Pair.sol";
import {INaruswapV2Pair} from "../src/interfaces/INaruswapV2Pair.sol";
import {TestERC20} from "./mocks/TestERC20.sol";

contract PairTest is Test {
    NaruswapV2Factory internal factory;
    TestERC20 internal token0;
    TestERC20 internal token1;
    NaruswapV2Pair internal pair;

    function setUp() public {
        factory = new NaruswapV2Factory();
        TestERC20 a = new TestERC20("Token A", "TKA");
        TestERC20 b = new TestERC20("Token B", "TKB");
        // 페어와 동일한 정렬 기준(주소 오름차순)으로 token0/token1을 고정한다
        (token0, token1) = address(a) < address(b) ? (a, b) : (b, a);
        pair = NaruswapV2Pair(factory.createPair(address(token0), address(token1)));
    }

    /// @dev V2 패턴: 토큰을 페어로 먼저 보내고 mint 호출
    function _addLiquidity(uint256 amount0, uint256 amount1) internal returns (uint256 liquidity) {
        token0.mint(address(pair), amount0);
        token1.mint(address(pair), amount1);
        liquidity = pair.mint(address(this));
    }

    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        internal
        pure
        returns (uint256)
    {
        uint256 amountInWithFee = amountIn * 997;
        return (amountInWithFee * reserveOut) / (reserveIn * 1000 + amountInWithFee);
    }

    function test_createPair_initializesTokens() public view {
        assertEq(pair.token0(), address(token0));
        assertEq(pair.token1(), address(token1));
        assertEq(pair.factory(), address(factory));
        assertEq(factory.allPairsLength(), 1);
        assertEq(factory.getPair(address(token1), address(token0)), address(pair)); // 역방향
    }

    function test_createPair_duplicateReverts() public {
        vm.expectRevert(bytes("Naruswap: PAIR_EXISTS"));
        factory.createPair(address(token1), address(token0));
    }

    function test_initialMint_locksMinimumLiquidity() public {
        uint256 liquidity = _addLiquidity(4e18, 9e18);
        // sqrt(4e18 * 9e18) = 6e18
        assertEq(liquidity, 6e18 - 1000);
        assertEq(pair.totalSupply(), 6e18);
        assertEq(pair.balanceOf(address(0)), 1000); // 영구 잠금
        (uint112 r0, uint112 r1,) = pair.getReserves();
        assertEq(r0, 4e18);
        assertEq(r1, 9e18);
    }

    function test_initialMint_tinyAmountsRevert() public {
        // sqrt(1000*1000) = 1000 → liquidity 0
        token0.mint(address(pair), 1000);
        token1.mint(address(pair), 1000);
        vm.expectRevert(bytes("Naruswap: INSUFFICIENT_LIQUIDITY_MINTED"));
        pair.mint(address(this));
    }

    function test_secondMint_isProportional() public {
        _addLiquidity(1e18, 1e18); // totalSupply 1e18
        uint256 liquidity = _addLiquidity(5e17, 5e17);
        assertEq(liquidity, 5e17);
    }

    function test_swap_outputMatchesV2Formula() public {
        _addLiquidity(10e18, 10e18);
        uint256 amountIn = 1e18;
        uint256 expectedOut = _getAmountOut(amountIn, 10e18, 10e18);

        token0.mint(address(pair), amountIn);
        pair.swap(0, expectedOut, address(this));

        assertEq(token1.balanceOf(address(this)), expectedOut);
        (uint112 r0, uint112 r1,) = pair.getReserves();
        assertEq(r0, 10e18 + amountIn);
        assertEq(r1, 10e18 - expectedOut);
    }

    function test_swap_oneWeiOverFormulaViolatesK() public {
        _addLiquidity(10e18, 10e18);
        uint256 amountIn = 1e18;
        uint256 expectedOut = _getAmountOut(amountIn, 10e18, 10e18);

        token0.mint(address(pair), amountIn);
        vm.expectRevert(bytes("Naruswap: K"));
        pair.swap(0, expectedOut + 1, address(this));
    }

    function test_swap_withoutInputReverts() public {
        _addLiquidity(10e18, 10e18);
        vm.expectRevert(bytes("Naruswap: INSUFFICIENT_INPUT_AMOUNT"));
        pair.swap(0, 1e17, address(this));
    }

    function test_swap_emitsSwapAndSync() public {
        _addLiquidity(10e18, 10e18);
        uint256 amountIn = 1e18;
        uint256 out = _getAmountOut(amountIn, 10e18, 10e18);
        token0.mint(address(pair), amountIn);

        vm.expectEmit(address(pair));
        // 11e18과 (10e18 - out)은 uint112 범위(~5.19e33)를 한참 밑돈다
        // forge-lint: disable-next-line(unsafe-typecast)
        emit INaruswapV2Pair.Sync(uint112(10e18 + amountIn), uint112(10e18 - out));
        vm.expectEmit(address(pair));
        emit INaruswapV2Pair.Swap(address(this), amountIn, 0, 0, out, address(this));
        pair.swap(0, out, address(this));
    }

    function test_burn_returnsProRataShare() public {
        uint256 liquidity = _addLiquidity(3e18, 3e18);
        assertEq(pair.transfer(address(pair), liquidity), true);
        (uint256 amount0, uint256 amount1) = pair.burn(address(this));

        // MINIMUM_LIQUIDITY(1000)에 해당하는 몫만 풀에 남는다
        assertEq(amount0, 3e18 - 1000);
        assertEq(amount1, 3e18 - 1000);
        (uint112 r0, uint112 r1,) = pair.getReserves();
        assertEq(r0, 1000);
        assertEq(r1, 1000);
    }

    /// @notice 수수료가 있는 한 어떤 스왑도 K를 줄일 수 없다 (LP 지급불능 방지 핵심 불변식)
    function testFuzz_swapNeverDecreasesK(uint256 amountIn, bool zeroForOne) public {
        _addLiquidity(100e18, 100e18);
        amountIn = bound(amountIn, 1, 1_000_000e18);

        (uint112 r0Before, uint112 r1Before,) = pair.getReserves();
        uint256 kBefore = uint256(r0Before) * uint256(r1Before);

        (TestERC20 tokenIn, uint256 reserveIn, uint256 reserveOut) = zeroForOne
            ? (token0, uint256(r0Before), uint256(r1Before))
            : (token1, uint256(r1Before), uint256(r0Before));
        uint256 out = _getAmountOut(amountIn, reserveIn, reserveOut);
        vm.assume(out > 0);

        tokenIn.mint(address(pair), amountIn);
        (uint256 out0, uint256 out1) = zeroForOne ? (uint256(0), out) : (out, uint256(0));
        pair.swap(out0, out1, address(this));

        (uint112 r0After, uint112 r1After,) = pair.getReserves();
        assertGe(uint256(r0After) * uint256(r1After), kBefore, "K decreased");
    }

    function test_skim_recoversExcess() public {
        _addLiquidity(1e18, 1e18);
        token0.mint(address(pair), 5e17); // 직접 전송으로 쌓인 초과분
        address sweeper = makeAddr("sweeper");
        pair.skim(sweeper);
        assertEq(token0.balanceOf(sweeper), 5e17);
        (uint112 r0,,) = pair.getReserves();
        assertEq(r0, 1e18); // 준비금 불변
    }

    function test_sync_updatesReserves() public {
        _addLiquidity(1e18, 1e18);
        token0.mint(address(pair), 5e17);
        pair.sync();
        (uint112 r0, uint112 r1,) = pair.getReserves();
        assertEq(r0, 1.5e18);
        assertEq(r1, 1e18);
    }
}
