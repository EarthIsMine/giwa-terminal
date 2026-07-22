import { parseEther } from "viem";

/**
 * 데모 검증 자산 19종 — 전통 공예 모티프, "한정 발행 공예 자산" 컨셉.
 * WETH는 발행 대상이 아니라 quote(프리디플로이)라 목록에 없다.
 *
 * 경제 설계 (v2, 2026-07-22): 테스트넷 유동성 예산(풀당 0.0008~0.0015 ETH)에서
 * 개당 가격이 원화 표시 범위(₩0.1~수원)에 들어오도록 공급을 수천~수만 개로 잡는다.
 * v1(공급 10억)은 개당 가격이 ₩0.00001 수준이라 표시 규칙(소수 2자리 내림)에서
 * 전부 0으로 뭉개졌다 — LP 회수 후 이 세대로 재발행했다.
 *
 * 파레토 3티어 LP: 대표 3종 × 0.0015 + 중형 6종 × 0.001 + 소형 10종 × 0.0008
 */
export interface SeedAssetSpec {
  symbol: string;
  nameKo: string;
  issuerName: string;
  /** 총 발행량 (토큰 개수 — 18dec 적용 전) */
  supply: bigint;
  /** 초기 유동성 토큰 수량 (개수) */
  liquidityTokens: bigint;
  lpEth: bigint;
}

/** 시드 세대 버전 — 보드·봇은 이 버전의 메타데이터만 소비한다 */
export const SEED_METADATA_VERSION = 2;

const TIER_L = parseEther("0.0015");
const TIER_M = parseEther("0.001");
const TIER_S = parseEther("0.0008");

export const SEED_SPECS: readonly SeedAssetSpec[] = [
  // 대표 3종 — 개당 ₩3~7대 (업비트 시세 ₩2.8M/ETH 기준 참고값)
  { symbol: "CHUNGJA", nameKo: "청자", issuerName: "고려도예공방", supply: 1_500n, liquidityTokens: 600n, lpEth: TIER_L },
  { symbol: "HANJI", nameKo: "한지", issuerName: "전주한지협동조합", supply: 2_400n, liquidityTokens: 900n, lpEth: TIER_L },
  { symbol: "BAEKJA", nameKo: "백자", issuerName: "백자가마터", supply: 3_500n, liquidityTokens: 1_400n, lpEth: TIER_L },
  // 중형 6종 — 개당 ₩0.5~1.6
  { symbol: "NAJEON", nameKo: "나전", issuerName: "통영나전장", supply: 5_000n, liquidityTokens: 1_800n, lpEth: TIER_M },
  { symbol: "SUMUK", nameKo: "수묵", issuerName: "묵향서화원", supply: 6_000n, liquidityTokens: 2_400n, lpEth: TIER_M },
  { symbol: "DANCHNG", nameKo: "단청", issuerName: "단청보존회", supply: 8_000n, liquidityTokens: 3_000n, lpEth: TIER_M },
  { symbol: "BUNCHEONG", nameKo: "분청", issuerName: "계룡산도예촌", supply: 9_000n, liquidityTokens: 3_600n, lpEth: TIER_M },
  { symbol: "OTCHIL", nameKo: "옻칠", issuerName: "원주옻칠공방", supply: 12_000n, liquidityTokens: 4_500n, lpEth: TIER_M },
  { symbol: "SOBAN", nameKo: "소반", issuerName: "나주소반공방", supply: 14_000n, liquidityTokens: 5_500n, lpEth: TIER_M },
  // 소형 10종 — 개당 ₩0.14~0.32
  { symbol: "GAT", nameKo: "갓", issuerName: "제주갓일공방", supply: 18_000n, liquidityTokens: 7_000n, lpEth: TIER_S },
  { symbol: "BUCHAE", nameKo: "부채", issuerName: "전주부채연구소", supply: 20_000n, liquidityTokens: 8_000n, lpEth: TIER_S },
  { symbol: "NORIGAE", nameKo: "노리개", issuerName: "규방공예원", supply: 22_000n, liquidityTokens: 9_000n, lpEth: TIER_S },
  { symbol: "MAEDEUP", nameKo: "매듭", issuerName: "동림매듭공방", supply: 25_000n, liquidityTokens: 10_000n, lpEth: TIER_S },
  { symbol: "GAYAGEUM", nameKo: "가야금", issuerName: "고령국악사", supply: 28_000n, liquidityTokens: 11_000n, lpEth: TIER_S },
  { symbol: "JANGGU", nameKo: "장구", issuerName: "국악기명장공방", supply: 30_000n, liquidityTokens: 12_000n, lpEth: TIER_S },
  { symbol: "HAHOE", nameKo: "하회", issuerName: "안동탈보존회", supply: 32_000n, liquidityTokens: 13_000n, lpEth: TIER_S },
  { symbol: "HWAMUNSEOK", nameKo: "화문석", issuerName: "강화화문석마을", supply: 35_000n, liquidityTokens: 14_000n, lpEth: TIER_S },
  { symbol: "NUBI", nameKo: "누비", issuerName: "통영누비공방", supply: 38_000n, liquidityTokens: 15_000n, lpEth: TIER_S },
  { symbol: "HYANGNO", nameKo: "향로", issuerName: "부여향로공방", supply: 40_000n, liquidityTokens: 16_000n, lpEth: TIER_S },
];

/** 온체인 metadataURI — 인덱서/보드가 그대로 파싱해 쓴다 (데모: 인라인 JSON) */
export function metadataFor(spec: SeedAssetSpec): string {
  return JSON.stringify({
    nameKo: spec.nameKo,
    issuerName: spec.issuerName,
    seed: true, // 절대 규칙 5: 데모 시드 자산임을 온체인에도 명시
    v: SEED_METADATA_VERSION,
  });
}
