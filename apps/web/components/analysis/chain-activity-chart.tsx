import { formatCountCompact } from "@giwa/shared";
import type { DailyTxPoint } from "@/lib/chain";

/**
 * 일별 거래 수 30일 — 막대 하나가 하루다.
 *
 * 캔들·툴팁·격자를 쓰지 않는다. 이 화면이 답할 질문은 "이 체인이 살아 있나"
 * 하나뿐이고, 그건 막대 높이의 흐름만으로 읽힌다 (절대 규칙 3).
 * 서버에서 그대로 그린 SVG — 읽기 전용 그림에 클라이언트 JS 를 붙이지 않는다.
 */

const W = 600;
const H = 96;
const GAP = 2;

export function ChainActivityChart({ daily }: { daily: DailyTxPoint[] }) {
  // 이틀치도 안 되면 "흐름"이라 할 게 없다 — 차트를 접는다
  if (daily.length < 2) return null;

  const max = Math.max(...daily.map((d) => d.count));
  if (max <= 0) return null;

  const barW = (W - GAP * (daily.length - 1)) / daily.length;
  const first = daily[0]?.date ?? "";
  const last = daily[daily.length - 1]?.date ?? "";

  return (
    <figure className="mt-7 rounded-xl carved px-6 py-5">
      <figcaption className="flex items-baseline justify-between">
        <span className="text-[11.5px] font-medium tracking-[0.12em] text-ink-3">
          일별 거래 수 · 최근 {daily.length}일
        </span>
        <span className="font-mono text-[11px] tabular-nums text-ink-3">
          최다 {formatCountCompact(max)}건
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${first}부터 ${last}까지 일별 거래 수 추이. 최다 ${formatCountCompact(max)}건.`}
        className="mt-3 h-[96px] w-full"
      >
        {daily.map((d, i) => {
          // 값이 있는 날은 최소 1px 은 보이게 — 0 과 "아주 적음"은 다르다
          const h = Math.max(d.count > 0 ? 1 : 0, (d.count / max) * H);
          return (
            <rect
              key={d.date}
              x={i * (barW + GAP)}
              y={H - h}
              width={barW}
              height={h}
              rx={1}
              className="fill-accent/45"
            />
          );
        })}
      </svg>

      <div className="mt-2 flex justify-between font-mono text-[10.5px] tabular-nums text-ink-3">
        <span>{first}</span>
        <span>{last}</span>
      </div>
    </figure>
  );
}
