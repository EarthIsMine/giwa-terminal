/**
 * ⚠️ 데모 시드 데이터 (절대 규칙 5: 숨기지 않는다)
 *
 * 인덱서/가격 API가 올라오기 전, 터미널 첫 화면을 위한 정적 시드다.
 * 화면(툴바 칩·푸터)에 테스트넷 시드 데이터임을 명시한다.
 * 실제 단계에서는 이 모듈 전체가 가격 API 응답으로 대체된다.
 * (자산 주소는 데모용 더미 — 컨트랙트 배포 후 실주소로 교체)
 *
 * trend 는 스파크라인 전용 상대값(차트 기하)이라 화폐 bigint 규칙 대상이 아니며,
 * 끝점을 변동률과 정합시키는 결정적 워크로 생성한다.
 */

import { ethToWei } from "@giwa/shared";
import type {
  AssetLinks,
  NetworkWindowStats,
  StatWindow,
  VerifiedAsset,
  WindowStats,
} from "@giwa/shared";
import { hashSeed, mulberry32 } from "./prng";

/**
 * 업비트 KRW-ETH 시세 데모 고정값 (원 단위).
 * API 단계에서 api.upbit.com/v1/ticker?markets=KRW-ETH 주입 + 60초 캐시로 대체.
 * 업비트 시세를 기준으로 쓰는 것은 의도적 선택이다 — 다른 소스로 바꾸지 않는다.
 */
export const MOCK_ETH_KRW = 5_842_000n;

const TREND_POINTS = 16;

/** 시작점 = 100/(1+변동률), 끝점 = 100 — 표의 변동률과 스파크라인이 항상 정합 */
function trend(changeBps: number, seedKey: string): number[] {
  const rnd = mulberry32(hashSeed(seedKey));
  const r = changeBps / 10_000;
  const start = 100 / (1 + r);
  const target = Math.log(100);
  const vol = Math.min(0.02, Math.max(0.002, Math.abs(r) / 10 + 0.003));

  const pts: number[] = [start];
  let cur = Math.log(start);
  for (let i = 1; i < TREND_POINTS; i++) {
    const remaining = TREND_POINTS - 1 - i;
    if (remaining === 0) {
      pts.push(100);
      break;
    }
    const drift = (target - cur) / (remaining + 1);
    cur += drift + (rnd() * 2 - 1) * vol;
    pts.push(Math.exp(cur));
  }
  return pts.map((p) => Math.round(p * 10) / 10);
}

/** [변동 bps, 거래대금 ETH, 참여 인원] */
type WindowSpec = readonly [number, string, number];

interface AssetSpec {
  address: `0x${string}`;
  symbol: string;
  nameKo: string;
  links?: AssetLinks;
  anchor?: boolean;
  method: "dojang" | "giwa-id";
  priceEth: string;
  liqEth: string;
  /** 총 발행량(토큰 개수) — 시가총액 = supply × price, 소각·락업 없음 가정 */
  supply: bigint;
  today: WindowSpec;
  week: WindowSpec;
  month: WindowSpec;
}

function windowStats(symbol: string, w: StatWindow, spec: WindowSpec): WindowStats {
  const [changeBps, volEth, traders] = spec;
  return {
    changeBps,
    volumeWei: ethToWei(volEth),
    traders,
    trend: trend(changeBps, `${symbol}:${w}`),
  };
}

function makeAsset(s: AssetSpec): VerifiedAsset {
  return {
    address: s.address,
    symbol: s.symbol,
    nameKo: s.nameKo,
    links: s.links,
    isQuoteAnchor: s.anchor ?? false,
    verification:
      s.method === "dojang"
        ? { status: "verified", method: "dojang", label: "도장 검증" }
        : { status: "verified", method: "giwa-id", label: "GIWA ID 발행자" },
    priceWei: ethToWei(s.priceEth),
    liquidityWei: ethToWei(s.liqEth),
    totalSupply: s.supply * 10n ** 18n,
    stats: {
      today: windowStats(s.symbol, "today", s.today),
      week: windowStats(s.symbol, "week", s.week),
      month: windowStats(s.symbol, "month", s.month),
    },
  };
}

/** 전통 공예 모티프 데모 자산 20종 — 거래대금 내림차순으로 정의 */
const SPECS: readonly AssetSpec[] = [
  {
    address: "0xe7a1b4c2d9f05e6a318bc47d20f9a5c1e8d4b702",
    symbol: "WETH",
    nameKo: "이더리움",
    links: { website: "https://ethereum.org", x: "https://x.com/ethereum" },
    anchor: true,
    method: "dojang",
    priceEth: "1",
    liqEth: "96.5",
    supply: 1_240n, // 브릿지 유통량 가정
    today: [42, "12.4", 31],
    week: [-156, "61", 74],
    month: [820, "214", 168],
  },
  {
    address: "0xc4f8a2e61b3d97c05a4e8f1d2b6c93e750a1d8b3",
    symbol: "CHUNGJA",
    nameKo: "청자",
    links: {
      website: "https://chungja.example.com",
      x: "https://x.com/chungja_kr",
    },
    method: "giwa-id",
    priceEth: "0.00042",
    liqEth: "22",
    supply: 360_000n,
    today: [212, "3.1", 14],
    week: [684, "15.8", 38],
    month: [1930, "52", 91],
  },
  {
    address: "0xf2b7c9e4a1d68f3b52e9a0d7c4b81f6e3a95d2c0",
    symbol: "HANJI",
    nameKo: "한지",
    links: {
      website: "https://hanji.example.com",
      x: "https://x.com/hanji_paper",
    },
    method: "dojang",
    priceEth: "0.0000072",
    liqEth: "9.8",
    supply: 9_000_000n,
    today: [540, "2.6", 17],
    week: [1120, "11.2", 41],
    month: [2650, "39", 88],
  },
  {
    address: "0xa93d5f0c7e2b81a64d0f3c9e5b7a2d84c61e0f95",
    symbol: "BAEKJA",
    nameKo: "백자",
    links: { x: "https://x.com/baekja_kr" },
    method: "giwa-id",
    priceEth: "0.00019",
    liqEth: "15.4",
    supply: 420_000n,
    today: [-87, "1.8", 9],
    week: [-212, "8.4", 24],
    month: [410, "31", 57],
  },
  {
    address: "0xd05e8a3f6c1b92d74a3e5f8c0b6d21a97e4c8b61",
    symbol: "NAJEON",
    nameKo: "나전",
    method: "giwa-id",
    priceEth: "0.000031",
    liqEth: "7.7",
    supply: 1_600_000n,
    today: [-134, "0.9", 6],
    week: [-388, "5.1", 19],
    month: [-820, "18", 44],
  },
  {
    address: "0xb61f4d8e0a9c25b73f8d1e6a4c05b92d7e3a1f84",
    symbol: "SUMUK",
    nameKo: "수묵",
    links: { website: "https://sumuk.example.com" },
    method: "dojang",
    priceEth: "0.000088",
    liqEth: "6.2",
    supply: 480_000n,
    today: [18, "0.6", 5],
    week: [96, "3.3", 14],
    month: [510, "12", 31],
  },
  {
    address: "0x8c2a9f5d1e6b40c83d7f2a8e5c1b64d90a3e7f52",
    symbol: "DANCHNG",
    nameKo: "단청",
    method: "giwa-id",
    priceEth: "0.0000155",
    liqEth: "4.9",
    supply: 2_200_000n,
    today: [-22, "0.4", 3],
    week: [134, "2.2", 11],
    month: [380, "8.5", 26],
  },
  {
    address: "0x3f7a1c8e5d29b04f6a8c3e1d7b5f92a04c6e8d13",
    symbol: "BUNCHEONG",
    nameKo: "분청",
    links: { website: "https://buncheong.example.com" },
    method: "dojang",
    priceEth: "0.000052",
    liqEth: "4.2",
    supply: 800_000n,
    today: [64, "0.35", 4],
    week: [210, "1.9", 12],
    month: [880, "7.2", 25],
  },
  {
    address: "0x91d4e7a2c85f3b60d1a9e4c7f2b8035a6d1c9e47",
    symbol: "OTCHIL",
    nameKo: "옻칠",
    method: "giwa-id",
    priceEth: "0.00014",
    liqEth: "3.8",
    supply: 260_000n,
    today: [-45, "0.31", 3],
    week: [120, "1.6", 9],
    month: [430, "6.0", 21],
  },
  {
    address: "0x5b8e2f9c14a7d63e0b5f8a2d9c47e1063b8d5f29",
    symbol: "SOBAN",
    nameKo: "소반",
    method: "dojang",
    priceEth: "0.000019",
    liqEth: "3.5",
    supply: 1_900_000n,
    today: [128, "0.28", 4],
    week: [-260, "1.4", 8],
    month: [150, "5.1", 18],
  },
  {
    address: "0x2e9c5a1f8d47b3062c9e5a8f1d4b7920e5c3a816",
    symbol: "GAT",
    nameKo: "갓",
    method: "giwa-id",
    priceEth: "0.0000088",
    liqEth: "3.1",
    supply: 3_800_000n,
    today: [-210, "0.22", 3],
    week: [-540, "1.2", 7],
    month: [-1120, "4.4", 16],
  },
  {
    address: "0x7c4f1e8b5a92d360f7c1e4b8a5d29f306e8b1c74",
    symbol: "BUCHAE",
    nameKo: "부채",
    method: "dojang",
    priceEth: "0.0000315",
    liqEth: "2.9",
    supply: 1_050_000n,
    today: [35, "0.2", 2],
    week: [90, "1.0", 6],
    month: [310, "3.9", 14],
  },
  {
    address: "0x64a8d2f5c91e7b30a4d8f2c5e91b6073a4d8c2f9",
    symbol: "NORIGAE",
    nameKo: "노리개",
    links: { x: "https://x.com/norigae_kr" },
    method: "giwa-id",
    priceEth: "0.000062",
    liqEth: "2.6",
    supply: 460_000n,
    today: [540, "0.18", 3],
    week: [1480, "0.9", 6],
    month: [2100, "3.3", 12],
  },
  {
    address: "0x0d6b3f9a25c8e17d4b0f6a3c9e25d8104b6f3a9c",
    symbol: "MAEDEUP",
    nameKo: "매듭",
    method: "dojang",
    priceEth: "0.0000041",
    liqEth: "2.4",
    supply: 6_500_000n,
    today: [-18, "0.15", 2],
    week: [60, "0.8", 5],
    month: [-240, "2.9", 11],
  },
  {
    address: "0xa5e29c7f4d81b6305a9e2c7f4d1b8630a5e9c274",
    symbol: "GAYAGEUM",
    nameKo: "가야금",
    links: {
      website: "https://gayageum.example.com",
      x: "https://x.com/gayageum_kr",
    },
    method: "giwa-id",
    priceEth: "0.000205",
    liqEth: "2.2",
    supply: 120_000n,
    today: [92, "0.13", 2],
    week: [340, "0.7", 5],
    month: [760, "2.6", 10],
  },
  {
    address: "0xe8b5c2a9f61d4730e8b5c2a9f61d4730e8b5c2a9",
    symbol: "JANGGU",
    nameKo: "장구",
    method: "dojang",
    priceEth: "0.000024",
    liqEth: "2.0",
    supply: 900_000n,
    today: [-130, "0.11", 2],
    week: [-350, "0.6", 4],
    month: [180, "2.2", 9],
  },
  {
    address: "0x39f7d1a6c58e2b049c7f3d1a6e58b2049c7f3d1a",
    symbol: "HAHOE",
    nameKo: "하회",
    method: "giwa-id",
    priceEth: "0.0000132",
    liqEth: "1.8",
    supply: 1_500_000n,
    today: [260, "0.1", 2],
    week: [720, "0.5", 4],
    month: [1650, "1.9", 8],
  },
  {
    address: "0xb2c8e5f1a94d7630b2c8e5f1a94d7630b2c8e5f1",
    symbol: "HWAMUNSEOK",
    nameKo: "화문석",
    method: "dojang",
    priceEth: "0.0000068",
    liqEth: "1.6",
    supply: 2_600_000n,
    today: [0, "0.08", 1],
    week: [-140, "0.4", 3],
    month: [90, "1.6", 7],
  },
  {
    address: "0x47d9a3e6f28c5b1047d9a3e6f28c5b1047d9a3e6",
    symbol: "NUBI",
    nameKo: "누비",
    method: "giwa-id",
    priceEth: "0.0000029",
    liqEth: "1.4",
    supply: 5_200_000n,
    today: [15, "0.06", 1],
    week: [45, "0.3", 3],
    month: [-160, "1.3", 6],
  },
  {
    address: "0xf1a6c39d75e8b204f1a6c39d75e8b204f1a6c39d",
    symbol: "HYANGNO",
    nameKo: "향로",
    method: "dojang",
    priceEth: "0.000098",
    liqEth: "1.2",
    supply: 190_000n,
    today: [-75, "0.05", 1],
    week: [230, "0.25", 2],
    month: [520, "1.1", 5],
  },
];

export const SEED_ASSETS: readonly VerifiedAsset[] = SPECS.map(makeAsset);

/**
 * 네트워크 단위 집계.
 * 참여 인원(distinct tx.origin)은 자산별 합산 시 중복 계상되므로
 * 반드시 이 별도 집계를 쓴다 — 지표 정의 "거래자 수" 참고.
 */
export const NETWORK_STATS: Record<StatWindow, NetworkWindowStats> = {
  today: { distinctTraders: 58, swapCount: 214 },
  week: { distinctTraders: 150, swapCount: 1_080 },
  month: { distinctTraders: 320, swapCount: 3_860 },
};
