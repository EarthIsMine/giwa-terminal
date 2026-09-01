import {
  formatAmount,
  formatDateKo,
  formatSigned,
  toChartNumber,
  tooltipEdge,
} from "@/components/analysis/flow-format";

/**
 * 나루 거래 흐름의 개별 차트 조각들 - 상태 없는 순수 렌더.
 * 데이터 집계·윈도우 결정은 컨테이너(naru-flow)가 쥔다 (프론트 구조 규칙:
 * 상태·로직은 도메인 메인 컴포넌트, 서브컴포넌트는 props 만).
 */

/** 구성비 막대 한 행 - 거래대금 비중·예치 규모 구성이 같은 모양을 쓴다 */
export interface ShareRow {
  key: string;
  label: string;
  sub: string | null;
  value: bigint;
  /** 전체 대비 ‰ (bigint 내림) */
  permille: number;
}

export function ShareBars({
  title,
  shares,
  ethKrw,
}: {
  title: string;
  shares: ShareRow[];
  ethKrw: bigint | null;
}) {
  if (shares.length === 0) return null;
  return (
    <div className="rounded-xl carved px-6 py-5">
      <h3 className="text-[11.5px] font-medium tracking-[0.12em] text-ink-3">
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5">
        {shares.map((s) => (
          <li key={s.key} className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-[12.5px] sm:w-44">
              {s.label}
              {s.sub ? (
                <span className="ml-1.5 font-mono text-[10.5px] text-ink-3">
                  {s.sub}
                </span>
              ) : null}
            </span>
            <span className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              {/* 절대 스케일(트랙 전체 = 100%) - 최대 행 기준으로 늘리면 "29%인데
                  꽉 찬 막대"가 되어 수치와 길이가 어긋난다 (2026-09-01 피드백) */}
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-accent/75"
                style={{ width: `${Math.max(s.permille / 10, 0.8)}%` }}
              />
            </span>
            <span className="w-28 shrink-0 text-right font-mono text-[11.5px] tabular-nums text-ink-2 sm:w-36">
              {formatAmount(s.value, ethKrw)}
              <span className="ml-1.5 text-ink-3">
                {(s.permille / 10).toFixed(1)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 순유입 랭킹 한 행. gap 행은 "외 N종" 생략 표시다 */
export type RankRow =
  | {
      kind: "asset";
      key: string;
      label: string;
      sub: string;
      net: bigint;
    }
  | { kind: "gap"; key: string; hidden: number };

export function NetflowRanking({
  rows,
  ethKrw,
}: {
  rows: RankRow[];
  ethKrw: bigint | null;
}) {
  const nets = rows.flatMap((r) => (r.kind === "asset" ? [r.net] : []));
  if (nets.length === 0) return null;
  const maxAbs = nets.reduce((m, v) => {
    const abs = v < 0n ? -v : v;
    return abs > m ? abs : m;
  }, 0n);
  if (maxAbs === 0n) return null;
  const maxN = toChartNumber(maxAbs);

  return (
    <div className="rounded-xl carved px-6 py-5">
      <h3 className="text-[11.5px] font-medium tracking-[0.12em] text-ink-3">
        순유입 상위·하위
      </h3>
      <p className="mt-1.5 text-[11px] leading-snug text-ink-3">
        가운데 축 기준 오른쪽 = 순매수 우위, 왼쪽 = 순매도 우위
      </p>
      <ul className="mt-4 space-y-2.5">
        {rows.map((r) => {
          if (r.kind === "gap") {
            return (
              <li
                key={r.key}
                className="text-center text-[11px] leading-none text-ink-3/70"
              >
                ⋯ 외 {r.hidden}종 ⋯
              </li>
            );
          }
          const w = (Math.abs(toChartNumber(r.net)) / maxN) * 50;
          return (
            <li key={r.key} className="flex items-center gap-3">
              <span className="w-32 shrink-0 truncate text-[12.5px] sm:w-44">
                {r.label}
                <span className="ml-1.5 font-mono text-[10.5px] text-ink-3">
                  {r.sub}
                </span>
              </span>
              <span className="relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-1/2 w-px bg-white/20"
                />
                {r.net !== 0n ? (
                  <span
                    className={`absolute inset-y-0 ${
                      r.net > 0n
                        ? "left-1/2 rounded-r-full bg-up/70"
                        : "right-1/2 rounded-l-full bg-down/70"
                    }`}
                    style={{ width: `${Math.max(w, 0.8)}%` }}
                  />
                ) : null}
              </span>
              <span
                className={`w-28 shrink-0 text-right font-mono text-[11.5px] tabular-nums sm:w-36 ${
                  r.net > 0n ? "text-up" : r.net < 0n ? "text-down" : "text-ink-2"
                }`}
              >
                {formatSigned(r.net, ethKrw)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** 시간대별(KST 0~23시) 거래대금 분포 - 24개 세로 막대 */
export function HourlyVolume({
  hours,
  ethKrw,
}: {
  /** KST 시각 인덱스(0~23) → 윈도우 내 거래대금 합 */
  hours: bigint[];
  ethKrw: bigint | null;
}) {
  const max = hours.reduce((m, v) => (v > m ? v : m), 0n);
  if (max === 0n) return null;
  const maxN = toChartNumber(max);

  return (
    // h-full + flex-1: 그리드에서 옆 카드(순유입 랭킹)가 더 길면 막대 영역이
    // 늘어나 카드 하단이 비지 않는다 (막대 높이는 % 라 컨테이너를 따라간다)
    <figure className="flex h-full flex-col rounded-xl carved px-6 py-5">
      <figcaption className="text-[11.5px] font-medium tracking-[0.12em] text-ink-3">
        시간대별 거래 분포
        <span className="ml-2 font-normal tracking-normal text-ink-3/80">
          한국 시간 기준
        </span>
      </figcaption>

      <div
        role="img"
        aria-label={`한국 시간 0시부터 23시까지 시간대별 거래대금 분포. 최다 시간대 ${formatAmount(max, ethKrw)}.`}
        className="relative mt-4 flex min-h-40 flex-1 items-end gap-[3px]"
      >
        {hours.map((v, h) => {
          const pct = (toChartNumber(v) / maxN) * 100;
          return (
            <div
              key={h}
              className="group relative flex h-full flex-1 items-end"
            >
              <div
                className="w-full rounded-t-[2px] bg-accent/55 transition-colors group-hover:bg-accent"
                style={{ height: `${Math.max(pct, v > 0n ? 1.5 : 0)}%` }}
              />
              <div
                className={`pointer-events-none absolute bottom-full z-10 mb-1.5 hidden whitespace-nowrap rounded-md border border-white/10 bg-[#120c06] px-2.5 py-1.5 text-[11px] leading-tight shadow-lg group-hover:block ${tooltipEdge(h, hours.length)}`}
              >
                <span className="text-ink-3">{h}시</span>{" "}
                <span className="font-mono font-semibold tabular-nums text-ink">
                  {formatAmount(v, ethKrw)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between border-t border-white/15 pt-1.5 font-mono text-[10.5px] tabular-nums text-ink-3">
        <span>0시</span>
        <span>6시</span>
        <span>12시</span>
        <span>18시</span>
        <span>23시</span>
      </div>
    </figure>
  );
}

export interface FeePoint {
  date: string;
  /** 상장 이후 해당일까지의 누적 총수수료 (WETH wei) */
  fee: bigint;
}

/** 누적 총수수료 추이 - 단조 증가 면 그래프 */
export function CumulativeFees({
  points,
  ethKrw,
}: {
  points: FeePoint[];
  ethKrw: bigint | null;
}) {
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  if (!last || last.fee === 0n) return null;
  const maxN = toChartNumber(last.fee);

  const W = 600;
  const H = 120;
  const coords = points.map((p, i) => ({
    x: ((i + 0.5) / points.length) * W,
    y: H - (toChartNumber(p.fee) / maxN) * H,
    pct: (toChartNumber(p.fee) / maxN) * 100,
  }));
  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1]?.x.toFixed(1)},${H} L${coords[0]?.x.toFixed(1)},${H} Z`;

  const first = points[0]?.date ?? "";

  return (
    <figure className="rounded-xl carved px-6 py-5">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[11.5px] font-medium tracking-[0.12em] text-ink-3">
          누적 총수수료
        </span>
        <span className="font-mono text-[15px] font-semibold tabular-nums">
          {formatAmount(last.fee, ethKrw)}
        </span>
      </figcaption>

      <div className="relative mt-3">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          aria-hidden
          className="block h-28 w-full text-accent"
        >
          <defs>
            <linearGradient id="naru-fees-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0.28" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#naru-fees-fill)" />
          <path
            d={linePath}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className="opacity-90"
          />
        </svg>

        <div
          role="img"
          aria-label={`${first}부터 어제까지 누적 총수수료 추이. 현재 ${formatAmount(last.fee, ethKrw)}.`}
          className="absolute inset-0 flex border-b border-white/15"
        >
          {points.map((p, i) => {
            const c = coords[i];
            if (!c) return null;
            return (
              <div key={p.date} className="group relative flex-1">
                <div
                  aria-hidden
                  className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-white/20 group-hover:block"
                />
                <div
                  className={`pointer-events-none absolute bottom-full z-10 mb-1.5 hidden whitespace-nowrap rounded-md border border-white/10 bg-[#120c06] px-2.5 py-1.5 text-[11px] leading-tight shadow-lg group-hover:block ${tooltipEdge(i, points.length)}`}
                >
                  <span className="text-ink-3">{formatDateKo(p.date)}까지</span>{" "}
                  <span className="font-mono font-semibold tabular-nums text-ink">
                    {formatAmount(p.fee, ethKrw)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex justify-between font-mono text-[10.5px] tabular-nums text-ink-3">
        {/* "상장"이라 쓰지 않는다 - 첫 캔들은 첫 체결일이지 상장일이 아니다 */}
        <span>{first} 첫 체결</span>
        <span>어제까지</span>
      </div>
    </figure>
  );
}
