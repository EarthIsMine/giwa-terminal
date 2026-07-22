/**
 * 온체인 리더 — 보드/상세가 GIWA Sepolia를 직접 읽는다 (목데이터 대체, 2026-07-22).
 *
 * 범위: 자산 목록·현재가·예치 규모·발행자 메타 = 현재 상태 조회로 충분한 것들.
 * 변동률·거래량·참여 인원·캔들은 이벤트 집계가 필요하므로 인덱서(Ponder) 몫이다.
 *
 * 서버 전용. Multicall3(카나니컬 주소, GIWA Sepolia 배포 확인)로 호출을 묶고,
 * 모듈 메모(10초 TTL) + 페이지 ISR로 공개 RPC 레이트리밋을 방어한다.
 * bigint는 RSC 직렬화 이슈를 피하려고 문자열로 내보낸다(표시 직전 복원).
 */
import { createPublicClient, defineChain, http, parseAbi } from "viem";
import { giwaChain } from "@giwa/config";

const chain = defineChain({
  id: giwaChain.chainId,
  name: giwaChain.name,
  nativeCurrency: giwaChain.nativeCurrency,
  rpcUrls: { default: { http: [giwaChain.rpcUrl] } },
  contracts: {
    multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" },
  },
  testnet: giwaChain.testnet,
});

const client = createPublicClient({
  chain,
  transport: http(),
  batch: { multicall: true },
});

const factoryAbi = parseAbi([
  "function allTokensLength() view returns (uint256)",
  "function allTokens(uint256) view returns (address)",
  "function issuedTokens(address) view returns (address issuer, bytes32 identityRef, address pair, uint64 issuedAt, string metadataURI)",
]);
const tokenAbi = parseAbi([
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
]);
const pairAbi = parseAbi([
  "function getReserves() view returns (uint112, uint112, uint32)",
  "function token0() view returns (address)",
]);

export interface LiveAssetWire {
  address: `0x${string}`;
  pair: `0x${string}`;
  symbol: string;
  nameKo: string;
  issuerName: string;
  /** 토큰 1개당 WETH wei (문자열 bigint) */
  priceWei: string;
  /** 풀 WETH 잔고 × 2 (지표 정의 "유동성") — 문자열 bigint */
  liquidityWei: string;
  /** 페어 준비금 — 거래 패널의 V2 견적 계산용 (문자열 bigint) */
  tokenReserveWei: string;
  wethReserveWei: string;
  totalSupply: string;
  issuedAt: number;
  identityRef: `0x${string}`;
}

interface SeedMetadata {
  nameKo: string;
  issuerName: string;
}

/**
 * 현행 시드 세대 — scripts/seed/src/assets.ts 의 SEED_METADATA_VERSION 과 짝.
 * 경제 재설계로 재발행할 때 버전을 올려 구세대를 보드에서 내린다.
 */
const SEED_METADATA_VERSION = 2;

/** metadataURI(인라인 JSON)에서 표시 메타를 읽는다.
 *  파싱 불가·구세대 버전이면 보드 비노출 (예: 스모크 잔재, v1 시드) */
function parseMetadata(uri: string): SeedMetadata | null {
  try {
    const parsed: unknown = JSON.parse(uri);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "nameKo" in parsed &&
      "issuerName" in parsed &&
      "v" in parsed &&
      typeof parsed.nameKo === "string" &&
      typeof parsed.issuerName === "string" &&
      parsed.v === SEED_METADATA_VERSION
    ) {
      return { nameKo: parsed.nameKo, issuerName: parsed.issuerName };
    }
    return null;
  } catch {
    return null;
  }
}

/** 공개 RPC 보호용 모듈 메모 — ISR과 별개로 서버 프로세스 안에서 한 번 더 묶는다 */
let memo: { at: number; data: LiveAssetWire[] } | null = null;
const MEMO_TTL_MS = 10_000;

export async function getLiveAssets(): Promise<LiveAssetWire[]> {
  const factory = giwaChain.tokenFactoryAddress;
  if (!factory) return [];
  if (memo && Date.now() - memo.at < MEMO_TTL_MS) return memo.data;

  const length = await client.readContract({
    address: factory,
    abi: factoryAbi,
    functionName: "allTokensLength",
  });

  const tokens = await Promise.all(
    Array.from({ length: Number(length) }, (_, i) =>
      client.readContract({
        address: factory,
        abi: factoryAbi,
        functionName: "allTokens",
        args: [BigInt(i)],
      }),
    ),
  );

  const entries = await Promise.all(
    tokens.map(async (token) => {
      const [symbol, totalSupply, issued] = await Promise.all([
        client.readContract({ address: token, abi: tokenAbi, functionName: "symbol" }),
        client.readContract({ address: token, abi: tokenAbi, functionName: "totalSupply" }),
        client.readContract({
          address: factory,
          abi: factoryAbi,
          functionName: "issuedTokens",
          args: [token],
        }),
      ]);
      const [, identityRef, pair, issuedAt, metadataURI] = issued;
      const meta = parseMetadata(metadataURI);
      if (!meta || pair === "0x0000000000000000000000000000000000000000") return null;

      const [reserves, token0] = await Promise.all([
        client.readContract({ address: pair, abi: pairAbi, functionName: "getReserves" }),
        client.readContract({ address: pair, abi: pairAbi, functionName: "token0" }),
      ]);
      const [reserve0, reserve1] = reserves;
      const tokenIsToken0 = token.toLowerCase() === token0.toLowerCase();
      const tokenReserve = tokenIsToken0 ? reserve0 : reserve1;
      const wethReserve = tokenIsToken0 ? reserve1 : reserve0;
      if (tokenReserve === 0n) return null;

      // 가격 = WETH 준비금 / 토큰 준비금 (지표 정의 §가격 — decimals 동일 18이라 보정 불필요)
      const priceWei = (wethReserve * 10n ** 18n) / tokenReserve;
      const liquidityWei = wethReserve * 2n;

      return {
        address: token,
        pair,
        symbol,
        nameKo: meta.nameKo,
        issuerName: meta.issuerName,
        priceWei: priceWei.toString(),
        liquidityWei: liquidityWei.toString(),
        tokenReserveWei: tokenReserve.toString(),
        wethReserveWei: wethReserve.toString(),
        totalSupply: totalSupply.toString(),
        issuedAt: Number(issuedAt),
        identityRef,
      } satisfies LiveAssetWire;
    }),
  );

  const data = entries
    .filter((e): e is LiveAssetWire => e !== null)
    .sort((a, b) => (BigInt(a.liquidityWei) < BigInt(b.liquidityWei) ? 1 : -1));
  memo = { at: Date.now(), data };
  return data;
}

export async function getLiveAsset(address: string): Promise<LiveAssetWire | null> {
  const assets = await getLiveAssets();
  return assets.find((a) => a.address.toLowerCase() === address.toLowerCase()) ?? null;
}

const balanceAbi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
]);

export interface PortfolioWire {
  /** 네이티브 ETH 잔고 (문자열 bigint) */
  ethBalance: string;
  /** 보드와 같은 자산 목록에 보유 수량을 얹은 것 */
  holdings: (LiveAssetWire & { balance: string })[];
}

/** 지갑 보유 자산 — 잔고는 캐시하지 않는다 (개인 잔고는 항상 신선해야 한다) */
export async function getPortfolio(address: `0x${string}`): Promise<PortfolioWire> {
  const assets = await getLiveAssets();
  const [ethBalance, balances] = await Promise.all([
    client.getBalance({ address }),
    Promise.all(
      assets.map((a) =>
        client.readContract({
          address: a.address,
          abi: balanceAbi,
          functionName: "balanceOf",
          args: [address],
        }),
      ),
    ),
  ]);
  return {
    ethBalance: ethBalance.toString(),
    holdings: assets.map((a, i) => ({
      ...a,
      balance: (balances[i] ?? 0n).toString(),
    })),
  };
}
