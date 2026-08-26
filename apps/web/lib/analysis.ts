/**
 * 온체인 분석 v0 - 보유 분포 (개발 명세서 §2.2의 부분 선행).
 *
 * 데이터 원천:
 * - 홀더 수·상위 홀더: Blockscout API (CLAUDE.md - 토큰 메타/홀더/트랜스퍼는 Blockscout 제공)
 * - 발행자 물량: RPC balanceOf 직접 조회 (홀더 목록 페이지 밖일 가능성 방어)
 *
 * 인사이더·스나이퍼·홀더 관계도(버블맵)는 Transfer 전수 원장(P1 인덱서 확장)이
 * 전제라 여기 없다 - 추정으로 채우지 않는다 (절대 규칙 1의 정신).
 * 서버 전용. fetch 60초 캐시로 익스플로러 부하를 묶는다.
 */
import { giwaChain } from "@giwa/config";
import { getTokenBalance } from "./onchain";

/**
 * 익스플로러 응답 상한. 분석 화면은 자산 수만큼(현 19종) 이 함수를 병렬 호출하고
 * Promise.all 로 묶으므로, 타임아웃이 없으면 느린 토큰 하나가 페이지 전체를
 * 붙잡는다 (홀더가 많은 토큰의 /holders 는 실제로 20초를 넘긴다).
 * 초과분은 catch 로 떨어져 해당 행만 "-"가 된다.
 */
const EXPLORER_TIMEOUT_MS = 8_000;

interface BlockscoutHolder {
  address: { hash: string };
  value: string;
}

export interface TopHolderWire {
  address: `0x${string}`;
  /** 보유량 wei (문자열 bigint) */
  balance: string;
  /** 총공급 대비 ‰ (bigint 내림 후 변환) */
  permille: number;
  label: "issuer" | "pair" | null;
}

export interface HolderAnalysisWire {
  holderCount: number;
  /** 발행자 지갑 보유 ‰ */
  issuerPermille: number;
  /** 상위 10 합산 ‰ - 인프라 주소(유동성 페어) 제외 (명세서 §2.2 정의) */
  top10Permille: number;
  topHolders: TopHolderWire[];
}

export async function getHolderAnalysis(args: {
  token: `0x${string}`;
  pair: `0x${string}`;
  issuer: `0x${string}`;
  totalSupply: string;
}): Promise<HolderAnalysisWire | null> {
  const total = BigInt(args.totalSupply);
  if (total === 0n) return null;
  try {
    const base = `${giwaChain.explorerUrl}/api/v2/tokens/${args.token}`;
    const [infoRes, holdersRes, issuerBalance] = await Promise.all([
      fetch(base, { next: { revalidate: 60 }, signal: AbortSignal.timeout(EXPLORER_TIMEOUT_MS) }),
      fetch(`${base}/holders`, {
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(EXPLORER_TIMEOUT_MS),
      }),
      getTokenBalance(args.token, args.issuer),
    ]);
    if (!infoRes.ok || !holdersRes.ok) return null;
    const info = (await infoRes.json()) as { holders_count?: string | null };
    const holders = (await holdersRes.json()) as { items?: BlockscoutHolder[] };
    const items = holders.items ?? [];

    const permilleOf = (v: bigint) => Number((v * 1_000n) / total);
    const pairLower = args.pair.toLowerCase();
    const issuerLower = args.issuer.toLowerCase();

    // Blockscout 홀더 목록은 잔고 내림차순 - 유동성 페어를 뺀 상위 10 합산
    const top10 = items
      .filter((h) => h.address.hash.toLowerCase() !== pairLower)
      .slice(0, 10)
      .reduce((acc, h) => acc + BigInt(h.value), 0n);

    return {
      holderCount: Number(info.holders_count ?? items.length),
      issuerPermille: permilleOf(issuerBalance),
      top10Permille: permilleOf(top10),
      topHolders: items.slice(0, 7).map((h) => {
        const lower = h.address.hash.toLowerCase();
        return {
          address: h.address.hash as `0x${string}`,
          balance: h.value,
          permille: permilleOf(BigInt(h.value)),
          label:
            lower === issuerLower
              ? ("issuer" as const)
              : lower === pairLower
                ? ("pair" as const)
                : null,
        };
      }),
    };
  } catch {
    // 익스플로러·RPC 히컵 - 섹션이 자리표시로 폴백한다
    return null;
  }
}
