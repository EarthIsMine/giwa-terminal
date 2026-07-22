/**
 * 인덱서가 구독하는 이벤트 ABI — 원본은 packages/contracts/src/interfaces.
 * 시그니처는 Uniswap V2 캐노니컬과 동일 (INaruswapV2Pair.sol 주석 참조).
 *
 * topic0 검증 (cast keccak, 2026-07-23):
 *   PairCreated(address,address,address,uint256)
 *     0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9
 *   Swap(address,uint256,uint256,uint256,uint256,address)
 *     0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822
 *   Sync(uint112,uint112)
 *     0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1
 */

export const naruswapV2FactoryAbi = [
  {
    type: "event",
    name: "PairCreated",
    inputs: [
      { name: "token0", type: "address", indexed: true },
      { name: "token1", type: "address", indexed: true },
      { name: "pair", type: "address", indexed: false },
      { name: "allPairsLength", type: "uint256", indexed: false },
    ],
  },
] as const;

export const naruswapV2PairAbi = [
  {
    type: "event",
    name: "Swap",
    inputs: [
      { name: "sender", type: "address", indexed: true },
      { name: "amount0In", type: "uint256", indexed: false },
      { name: "amount1In", type: "uint256", indexed: false },
      { name: "amount0Out", type: "uint256", indexed: false },
      { name: "amount1Out", type: "uint256", indexed: false },
      { name: "to", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "Sync",
    inputs: [
      { name: "reserve0", type: "uint112", indexed: false },
      { name: "reserve1", type: "uint112", indexed: false },
    ],
  },
] as const;
