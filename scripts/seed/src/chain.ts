import "./env.js";
import {
  http,
  createPublicClient,
  createWalletClient,
  defineChain,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { giwaChain } from "@giwa/config";

/** 테스트넷 전용 봇 — 다른 체인(특히 메인넷)으로는 절대 돌지 않게 명시적으로 잠근다 */
const EXPECTED_TESTNET_CHAIN_ID = 91342;
if (giwaChain.chainId !== EXPECTED_TESTNET_CHAIN_ID || !giwaChain.testnet) {
  throw new Error(
    `시드 봇은 GIWA Sepolia(91342) 전용입니다 — 현재 설정: ${giwaChain.chainId}, testnet=${giwaChain.testnet}`,
  );
}

/** 봇 전용 RPC — 상시 가동 봇이 레이트리밋 걸린 공개 RPC의 최대 소비자가 되지
 *  않도록 전용 엔드포인트(Nodit 등)를 SEED_RPC_URL 로 주입한다. 미설정 시 공개 RPC 폴백. */
const rpcUrl = process.env.SEED_RPC_URL ?? giwaChain.rpcUrl;

export const chain = defineChain({
  id: giwaChain.chainId,
  name: giwaChain.name,
  nativeCurrency: giwaChain.nativeCurrency,
  rpcUrls: { default: { http: [rpcUrl] } },
  testnet: true,
});

function requireAddress(v: `0x${string}` | null, name: string): Address {
  if (!v) throw new Error(`${name} 주소가 없습니다 — 루트 .env를 확인하세요`);
  return v;
}

export const addresses = {
  tokenFactory: requireAddress(giwaChain.tokenFactoryAddress, "TokenFactory"),
  router: requireAddress(giwaChain.routerAddress, "Router"),
  dexFactory: requireAddress(giwaChain.factoryAddress, "NaruswapV2Factory"),
  weth: giwaChain.wethAddress as Address,
};

export const publicClient = createPublicClient({ chain, transport: http() });

export function walletFor(privateKey: `0x${string}`) {
  return createWalletClient({
    chain,
    transport: http(),
    account: privateKeyToAccount(privateKey),
  });
}

/** 운영자(검증된 발행 주체) 지갑 — 배포 지갑과 동일, 발행 단계에서만 사용 */
export function operatorWallet() {
  const key = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}` | undefined;
  if (!key) {
    throw new Error("DEPLOYER_PRIVATE_KEY 없음 — packages/contracts/.env 확인");
  }
  return walletFor(key);
}
