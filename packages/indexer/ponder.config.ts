import "./src/env"; // 반드시 @giwa/config 보다 먼저 (루트 .env 로딩)

import { createConfig, factory } from "ponder";
import { getAbiItem } from "viem";
import { giwaChain } from "@giwa/config";
import { naruswapV2FactoryAbi, naruswapV2PairAbi } from "./abis/naruswap";

/**
 * 체인 파라미터는 전부 주입식 (절대 규칙 4) — 값의 원천은 config/chains.ts + 루트 .env.
 * 프라이빗 메인넷 초대 시 env 교체만으로 재싱크된다.
 *
 * RPC: 공개 RPC는 레이트리밋이 있어 인덱서 전용 엔드포인트(Nodit 등)를
 * GIWA_INDEXER_RPC_URL 로 따로 주입할 수 있게 한다. 미설정 시 공개 RPC 폴백.
 */
const factoryAddress = giwaChain.factoryAddress;
const startBlock = giwaChain.startBlock;

if (!factoryAddress || startBlock === null) {
  throw new Error(
    "인덱서 기동 불가: NEXT_PUBLIC_GIWA_FACTORY_ADDRESS / NEXT_PUBLIC_GIWA_START_BLOCK 를 루트 .env 에 설정하세요 (컨트랙트 배포 출력값)",
  );
}

export default createConfig({
  chains: {
    giwa: {
      id: giwaChain.chainId,
      rpc: process.env.GIWA_INDEXER_RPC_URL ?? giwaChain.rpcUrl,
    },
  },
  contracts: {
    NaruswapV2Factory: {
      chain: "giwa",
      abi: naruswapV2FactoryAbi,
      address: factoryAddress,
      startBlock: Number(startBlock),
    },
    NaruswapV2Pair: {
      chain: "giwa",
      abi: naruswapV2PairAbi,
      address: factory({
        address: factoryAddress,
        event: getAbiItem({ abi: naruswapV2FactoryAbi, name: "PairCreated" }),
        parameter: "pair",
      }),
      startBlock: Number(startBlock),
    },
  },
});
