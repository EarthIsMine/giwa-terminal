import { formatCountCompact } from "@giwa/shared";
import type { DailyTxPoint } from "@/lib/chain";

/**
 * 일별 거래 수 30일 - 라인 + 영역 차트.
 *
 * 막대 30개는 눈금처럼 읽혀서 흐름이 안 잡힌다는 피드백(2026-09-01)으로
 * 면 그래프로 전환. 날짜별 수치는 호버 툴팁으로 읽는다. 클라이언트 JS 는
 * 안 붙인다 - 점·가이드선·툴팁 전부 CSS group-hover 만으로 동작하는 서버
 * 렌더이고, SVG 는 선·면만 그리고 호버 레이어는 HTML 오버레이가 맡는다.
 * 기준선은 최다·절반 두 줄만 - 격자를 채우면 흐름이 묻힌다 (절대 규칙 3).
 */

const W = 600;
const H = 160;

/** "YYYY-MM-DD" → "M월 D일" - 툴팁은 업저씨가 읽는 자리라 ISO 를 그대로 안 쓴다 */
function formatDateKo(iso: string): string {
  const [, m, d] = iso.split("-");
  if (!m || !d) return iso;
  return `${Number(m)}월 ${Number(d)}일`;
}

export function ChainActivityChart({ daily }: { daily: DailyTxPoint[] }) {
  // 이틀치도 안 되면 "흐름"이라 할 게 없다 - 차트를 접는다
  if (daily.length < 2) return null;

  const max = Math.max(...daily.map((d) => d.count));
  if (max <= 0) return null;

  const first = daily[0]?.date ?? "";
  const last = daily[daily.length - 1]?.date ?? "";

  // 점 x 는 열 중심 (i+0.5)/n - HTML 호버 열(flex-1)의 중심과 정확히 겹치게
  const points = daily.map((d, i) => ({
    x: ((i + 0.5) / daily.length) * W,
    y: H - (d.count / max) * H,
    pct: (d.count / max) * 100,
  }));
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${points[points.length - 1]?.x.toFixed(1)},${H} L${points[0]?.x.toFixed(1)},${H} Z`;

  return (
    <figure className="mt-7 rounded-xl carved px-6 py-5">
      <figcaption className="text-[11.5px] font-medium tracking-[0.12em] text-ink-3">
        최근 {daily.length}일 일별 거래 수
      </figcaption>

      <div className="relative mt-4">
        {/* 기준선 - 최다와 그 절반. 선 높이를 숫자로 번역해 주는 최소한의 눈금 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 border-t border-white/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-white/[0.07]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 -translate-y-full pb-0.5 font-mono text-[10px] tabular-nums text-ink-3"
        >
          {formatCountCompact(max)}건
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute right-0 top-1/2 -translate-y-full pb-0.5 font-mono text-[10px] tabular-nums text-ink-3/80"
        >
          {formatCountCompact(Math.round(max / 2))}건
        </span>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          aria-hidden
          className="block h-40 w-full text-accent"
        >
          <defs>
            <linearGradient id="chain-activity-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0.32" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#chain-activity-fill)" />
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

        {/* 호버 레이어 - 열 전체가 히트 영역. 가이드선 + 점 + 툴팁을 CSS 로만 켠다 */}
        <div
          role="img"
          aria-label={`${first}부터 ${last}까지 일별 거래 수 추이. 최다 ${formatCountCompact(max)}건.`}
          className="absolute inset-0 flex border-b border-white/15"
        >
          {daily.map((d, i) => {
            const p = points[i];
            if (!p) return null;
            // 툴팁이 카드 밖으로 새지 않게 가장자리 열은 정렬을 바꾼다
            const edge =
              i < 4
                ? "left-0"
                : i >= daily.length - 4
                  ? "right-0"
                  : "left-1/2 -translate-x-1/2";
            return (
              <div key={d.date} className="group relative flex-1">
                <div
                  aria-hidden
                  className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-white/20 group-hover:block"
                />
                <div
                  aria-hidden
                  className="absolute left-1/2 hidden h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-accent bg-[#120c06] group-hover:block"
                  style={{ bottom: `${p.pct}%` }}
                />
                <div
                  className={`pointer-events-none absolute bottom-full z-10 mb-1.5 hidden whitespace-nowrap rounded-md border border-white/10 bg-[#120c06] px-2.5 py-1.5 text-[11px] leading-tight shadow-lg group-hover:block ${edge}`}
                >
                  <span className="text-ink-3">{formatDateKo(d.date)}</span>{" "}
                  <span className="font-mono font-semibold tabular-nums text-ink">
                    {formatCountCompact(d.count)}건
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex justify-between font-mono text-[10.5px] tabular-nums text-ink-3">
        <span>{first}</span>
        <span>{last}</span>
      </div>
    </figure>
  );
}
