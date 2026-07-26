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

/**
 * 발행 게이트(TokenFactory) 이벤트 — 피드의 "신규 상장"과 발행자 라벨의 원천.
 * topic0 검증 (packages/contracts/test/E2E.t.sol 핀 테스트와 동일 값):
 *   TokenIssued(address,address,string,string,uint256,bytes32,string)
 *     0x9074df6f9d0eeb5e3741c275f37406408558e11d1a64e936a810afd9b67c3b0a
 *   TokenListed(address,address,uint256,uint256,address)
 *     0xdef50dfbc89f4ee82c37697a1c272d29b5dc346f95e0f46f25086c323b368dea
 */
export const tokenFactoryAbi = [
  {
    type: "event",
    name: "TokenIssued",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "issuer", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "symbol", type: "string", indexed: false },
      { name: "totalSupply", type: "uint256", indexed: false },
      { name: "identityRef", type: "bytes32", indexed: false },
      { name: "metadataURI", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TokenListed",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "pair", type: "address", indexed: true },
      { name: "tokenAmount", type: "uint256", indexed: false },
      { name: "ethAmount", type: "uint256", indexed: false },
      { name: "lpRecipient", type: "address", indexed: false },
    ],
  },
] as const;

/** 발행 토큰(NaruToken) ERC-20 Transfer — 홀더 원장·전송 그래프의 원천 */
export const naruTokenAbi = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
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
  // 유동성 공급·회수 — 체결과 함께 "거래 수·참여 인원"에 들어간다
  // topic0 (cast keccak, 2026-07-27):
  //   Mint(address,uint256,uint256)
  //     0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f
  //   Burn(address,uint256,uint256,address)
  //     0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496
  {
    type: "event",
    name: "Mint",
    inputs: [
      { name: "sender", type: "address", indexed: true },
      { name: "amount0", type: "uint256", indexed: false },
      { name: "amount1", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Burn",
    inputs: [
      { name: "sender", type: "address", indexed: true },
      { name: "amount0", type: "uint256", indexed: false },
      { name: "amount1", type: "uint256", indexed: false },
      { name: "to", type: "address", indexed: true },
    ],
  },
] as const;
