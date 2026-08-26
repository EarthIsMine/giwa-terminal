import { formatCount, formatEth, wei } from "@giwa/shared";
import type { HolderAnalysisWire } from "@/lib/analysis";
import type { HolderGraphWire } from "@/lib/indexer";
import { ExplorerLink } from "@/components/asset/asset-detail-info";
import { HolderGraph } from "@/components/asset/holder-graph";

/** 분포 지표 카드 - 게이지는 중립색(해석 색 입히지 않음), 산정 기준을 함께 표기 */
function AnalysisMetric({
  label,
  permille,
  desc,
}: {
  label: string;
  permille: number;
  desc: string;
}) {
  const pct = permille / 10;
  return (
    <div className="rounded-lg border border-hairline/60 bg-black/20 p-4">
      <p className="text-[11.5px] text-ink-3">{label}</p>
      <p className="mt-1.5 font-mono text-[22px] font-bold tabular-nums">
        {pct.toFixed(1)}
        <span className="ml-0.5 text-[13px] font-medium text-ink-3">%</span>
      </p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-ink-3/70"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">{desc}</p>
    </div>
  );
}

const HOLDER_LABEL: Record<
  NonNullable<HolderAnalysisWire["topHolders"][number]["label"]>,
  { text: string; className: string }
> = {
  issuer: {
    text: "발행자",
    className: "border-down/25 bg-down/10 text-down",
  },
  pair: {
    text: "예치 풀",
    className: "border-hairline bg-white/5 text-ink-3",
  },
};

/** 홀더 관계도 - 전송 원장 기반. 인덱싱 전이면 자리표시 폴백 */
function HolderRelationBlock({ graph }: { graph: HolderGraphWire | null }) {
  return (
    <div className="min-w-0 flex-1 rounded-lg border border-hairline/60 bg-black/20 p-4">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <p className="text-[12.5px] font-medium text-ink-2">
          홀더 관계도
        </p>
        <span className="text-[11.5px] text-ink-3">
          {graph && graph.nodes.length > 0
            ? graph.links.length > 0
              ? `상위 ${graph.nodes.length}개 지갑 · 서로 자금을 주고받은 지갑이 선으로 이어집니다`
              : `상위 ${graph.nodes.length}개 지갑 · 지갑끼리 직접 주고받은 기록이 없습니다`
            : "전송 원장 기반"}
        </span>
      </div>
      {graph && graph.nodes.length > 0 ? (
        <div className="mt-2">
          <HolderGraph graph={graph} />
        </div>
      ) : (
        <p className="grid h-[220px] place-items-center text-[12.5px] text-ink-3">
          전송 원장 인덱싱 후 표시됩니다. 인덱서 백필이 진행 중일 수
          있습니다.
        </p>
      )}
    </div>
  );
}

/** 상위 홀더 표 - Blockscout 집계 기반 */
function TopHoldersTable({
  topHolders,
}: {
  topHolders: HolderAnalysisWire["topHolders"];
}) {
  return (
    <div className="w-full shrink-0 xl:w-[400px]">
      <p className="text-[12.5px] font-medium text-ink-2">상위 홀더</p>
      <table className="mt-2 w-full border-collapse text-[12px]">
        <thead>
          <tr className="border-b border-black/40 text-[11.5px] tracking-[0.08em] text-ink-3">
            <th scope="col" className="py-1.5 text-left font-medium">
              주소
            </th>
            <th scope="col" className="py-1.5 text-left font-medium">
              라벨
            </th>
            <th scope="col" className="py-1.5 text-right font-medium">
              보유
            </th>
            <th scope="col" className="py-1.5 text-right font-medium">
              비중
            </th>
          </tr>
        </thead>
        <tbody>
          {topHolders.map((h) => (
            <tr key={h.address} className="border-b border-black/25 last:border-0">
              <td className="py-1.5">
                <ExplorerLink address={h.address} />
              </td>
              <td className="py-1.5">
                {h.label ? (
                  <span
                    className={`rounded border px-1.5 py-[1.5px] text-[11px] font-medium ${HOLDER_LABEL[h.label].className}`}
                  >
                    {HOLDER_LABEL[h.label].text}
                  </span>
                ) : (
                  <span className="text-ink-3">-</span>
                )}
              </td>
              <td className="py-1.5 text-right font-mono tabular-nums text-ink-2">
                {formatEth(wei(BigInt(h.balance)), 0)}
              </td>
              <td className="py-1.5 text-right font-mono tabular-nums">
                {(h.permille / 10).toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 온체인 분석 v0 - 보유 분포 (명세서 §2.2 부분 선행).
    인사이더·스나이퍼·관계도는 전송 전수 원장(P1) 전제 - 자리표시로 명시 */
export function AssetDetailAnalysis({
  analysis,
  graph,
}: {
  analysis: HolderAnalysisWire | null;
  graph: HolderGraphWire | null;
}) {
  return (
    <section className="mt-5 rounded-xl carved p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-[15px] font-semibold">보유 분석</h2>
        <span className="text-[11px] text-ink-3">
          보유 분포 · 기와체인 공개 기록 · 60초 갱신
        </span>
      </div>

      {analysis ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <AnalysisMetric
              label="발행자 물량"
              permille={analysis.issuerPermille}
              desc="발행자 지갑 보유량 ÷ 총공급. 물량 상한·베스팅의 온체인 강제는 심사 인프라 컨트랙트에서 예정"
            />
            <AnalysisMetric
              label="상위 10 집중도"
              permille={analysis.top10Permille}
              desc="상위 10개 지갑 합산 ÷ 총공급. 기반 주소(예치 풀)는 제외한 값"
            />
            <div className="rounded-lg border border-hairline/60 bg-black/20 p-4">
              <p className="text-[11.5px] text-ink-3">홀더</p>
              <p className="mt-1.5 font-mono text-[22px] font-bold tabular-nums">
                {formatCount(analysis.holderCount)}
                <span className="ml-1 text-[13px] font-medium text-ink-3">
                  지갑
                </span>
              </p>
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
                토큰을 보유한 지갑 수. 테스트넷 데모라 시드 봇·운영 지갑이
                포함됩니다
              </p>
            </div>
        </div>
      ) : (
        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">
          보유 분포를 불러오지 못했습니다. 공개 기록(Blockscout) 응답이
          지연될 수 있습니다. 잠시 후 새로고침해 주세요.
        </p>
      )}

      {/* 관계도(전송 원장 기반)와 상위 홀더(Blockscout 기반)는 원천이 달라 독립 분기 */}
      <div className="mt-4 flex flex-col gap-5 xl:flex-row">
        <HolderRelationBlock graph={graph} />

        {analysis ? <TopHoldersTable topHolders={analysis.topHolders} /> : null}
      </div>

      <p className="mt-4 border-t border-hairline/40 pt-3 text-[11px] leading-relaxed text-ink-3">
        · 관계도의 클러스터는 직접 전송으로 이어진 연결 성분입니다. 중간
        지갑을 거친 간접 연결도 같은 클러스터로 묶이며, 라우터·페어 같은
        인프라 주소 경유는 연결로 치지 않습니다.
        <br />· 인사이더 비중 · 스나이퍼 비중은 취득 이력 산식 연결 후
        제공됩니다. 추정치로 채우지 않습니다.
        <br />· 수치는 산정 기준에 따라 달라지므로 각 지표에 기준을 함께
        표기합니다. 발행자·팀 지갑 라벨은 심사에서 등록된 주소 기준입니다.
      </p>
    </section>
  );
}
