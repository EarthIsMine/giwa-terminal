import Link from "next/link";
import { formatCount } from "@giwa/shared";
import type { AssetVerification } from "@giwa/shared";
import { AssetAvatar } from "@/components/ui/asset-avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";

/**
 * 분석 탭 — 토큰 보드 (5면 구성 §분석 [토큰 · 온체인 주식]의 앞쪽 절반).
 * 자산 상세의 보유 분포(단건 조회)를 전 자산 가로 비교로 편 것.
 * 수치는 전부 산정 기준이 붙은 사실값만 — 위험 점수·등급 같은 해석 지표와
 * 인사이더·스나이퍼 같은 추정 지표는 만들지 않는다 (추정 금지).
 */
export interface AnalysisTokenRow {
  address: `0x${string}`;
  symbol: string;
  nameKo: string;
  issuerName: string;
  verification: AssetVerification;
  /** Blockscout 집계 실패면 null — 0 으로 채우지 않는다 */
  holderCount: number | null;
  /** 발행자 지갑 보유 ÷ 총공급, ‰ */
  issuerPermille: number | null;
  /** 상위 10 지갑 합산 ÷ 총공급, ‰ — 유동성 페어 제외 */
  top10Permille: number | null;
  /** 최근 30일 distinct tx.origin — 인덱서 미연결이면 null */
  traders30d: number | null;
}

/** ‰ → % 표시. null 은 "—" (집계 실패·미연결을 0 과 구분한다) */
function PermilleCell({ permille }: { permille: number | null }) {
  if (permille === null) {
    return <span className="text-ink-3">—</span>;
  }
  return (
    <span className="font-mono tabular-nums">
      {(permille / 10).toFixed(1)}
      <span className="ml-0.5 text-[11px] text-ink-3">%</span>
    </span>
  );
}

function CountCell({ count }: { count: number | null }) {
  if (count === null) {
    return <span className="text-ink-3">—</span>;
  }
  return <span className="font-mono tabular-nums">{formatCount(count)}</span>;
}

const HEADERS = [
  { key: "asset", label: "자산", right: false },
  { key: "holders", label: "홀더", right: true },
  { key: "issuer", label: "발행자 물량", right: true },
  { key: "top10", label: "상위 10 집중도", right: true },
  { key: "traders", label: "참여 인원 · 30일", right: true },
] as const;

export function AnalysisTokenBoard({ rows }: { rows: AnalysisTokenRow[] }) {
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-[15px] font-semibold">토큰</h2>
        <span className="text-[11px] text-ink-3">
          보유 구조 비교 · Blockscout 온체인 집계 + 인덱서 · 60초 갱신
        </span>
      </div>

      {/* 테이블은 자산 보드와 같은 문법 — 감싸는 패널 없이 검은 홈줄 행 + 인두 띠 헤더 */}
      <div className="mt-3 border-y border-black/45 bg-black/[0.12]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <caption className="sr-only">
              상장 자산 보유 구조 비교. 홀더 수, 발행자 물량, 상위 10 집중도,
              참여 인원
            </caption>
            <thead>
              <tr className="border-b border-black/45 bg-[#120c06]/[0.97]">
                {HEADERS.map((h) => (
                  <th
                    key={h.key}
                    scope="col"
                    className={`px-4 py-2.5 text-[11.5px] font-medium tracking-[0.1em] text-ink-3 first:pl-6 last:pr-6 ${h.right ? "text-right" : ""}`}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={HEADERS.length}
                    className="py-14 text-center text-[13.5px] text-ink-3"
                  >
                    온체인 자산을 불러오는 중이거나 아직 발행된 자산이 없습니다
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.address}
                    className="border-b border-black/30 transition-colors last:border-0 hover:bg-black/30"
                  >
                    <td className="px-4 py-2.5 first:pl-6">
                      <Link
                        href={`/asset/${row.address}`}
                        className="flex items-center gap-2.5"
                      >
                        <AssetAvatar symbol={row.symbol} size={30} />
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate text-[13px] font-medium text-ink">
                            {row.nameKo}
                          </span>
                          <span className="font-mono text-[11.5px] text-ink-3">
                            {row.symbol}
                          </span>
                          <VerifiedBadge verification={row.verification} />
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-right text-[12.5px]">
                      <CountCell count={row.holderCount} />
                    </td>
                    <td className="px-4 py-2.5 text-right text-[12.5px]">
                      <PermilleCell permille={row.issuerPermille} />
                    </td>
                    <td className="px-4 py-2.5 text-right text-[12.5px]">
                      <PermilleCell permille={row.top10Permille} />
                    </td>
                    <td className="px-4 py-2.5 text-right text-[12.5px] last:pr-6">
                      <CountCell count={row.traders30d} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 산정 기준·고지 — 수치는 기준 없이는 읽을 수 없다 (절대 규칙 1·5·6) */}
      <div className="mt-3 space-y-1 text-[11.5px] leading-relaxed text-ink-3">
        <p>
          · 발행자 물량 = 발행자 지갑 보유량 ÷ 총공급. 상위 10 집중도 = 상위
          10개 지갑 합산 ÷ 총공급이며 유동성 페어 등 인프라 주소는 제외한
          값입니다.
        </p>
        <p>
          · 참여 인원은 최근 30일 매수 · 매도 · 유동성 공급 · 회수에 참여한
          지갑 수입니다. 테스트넷 데모라 시드 봇 · 운영 지갑이 포함됩니다.
        </p>
        <p>
          · 집계에 실패한 값은 0 대신 —로 표시합니다. 인사이더 · 스나이퍼
          비중은 취득 이력 산식 연결 후 제공되며, 추정치로 채우지 않습니다.
        </p>
        <p>
          ·{" "}
          <b className="font-medium text-ink-2">
            검증은 사기 필터이지 투자 보증이 아닙니다.
          </b>{" "}
          발행 시점의 신원과 온체인 안전장치를 확인한 것입니다.
        </p>
      </div>
    </section>
  );
}
