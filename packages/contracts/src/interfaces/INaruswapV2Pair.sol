// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice 페어 인터페이스 — 라우터/발행 게이트가 호출하는 표면 + 인덱서가 구독하는 이벤트.
/// 이벤트 시그니처는 Uniswap V2 캐노니컬과 완전히 동일하게 유지한다.
/// (인덱서가 topic0 상수로 구독한다 — CLAUDE.md "인덱싱 참고" 참조. 바꾸면 인덱서가 눈이 먼다.)
interface INaruswapV2Pair {
    // --- V2 표준 이벤트 (시그니처 변경 금지) ---
    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);

    // --- LP 토큰 (표준 ERC-20) ---
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function totalSupply() external view returns (uint256);
    function balanceOf(address owner) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);

    // --- 페어 코어 ---
    function factory() external view returns (address);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves()
        external
        view
        returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);

    function initialize(address token0_, address token1_) external;
    function mint(address to) external returns (uint256 liquidity);
    function burn(address to) external returns (uint256 amount0, uint256 amount1);
    function swap(uint256 amount0Out, uint256 amount1Out, address to) external;
    function skim(address to) external;
    function sync() external;
}
