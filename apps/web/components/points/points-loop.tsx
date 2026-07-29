import { PointsAllocationDiagram } from "@/components/points/points-allocation-diagram";

/**
 * 포인트가 도는 길 — 전폭 4걸음 행로 + 상장 배분 구조도.
 *
 * 문단이 아니라 걸음이다: 단어 하나 + 한 줄 설명, 걸음 사이는 홈줄 하나로 잇는다.
 * 타겟 유저는 "쌓기→문턱→소각→배분" 네 단어를 문장으로 읽지 않는다 —
 * 왼쪽에서 오른쪽으로 눈이 흐르는 그림 하나로 만들어야 한다 (절대 규칙 3).
 * 카피는 기존 문안을 줄인 것: 숫자·조건을 새로 만들지 않는다.
 * 2~4단계(문턱·소각·배분)는 아래 구조도가 그림으로 한 번 더 말한다.
 */

const STEPS = [
  ["쌓기", "잔고와 순매수로 매일 자동 적립"],
  ["문턱", "새 자산 상장마다 기준 점수 공개"],
  ["소각", "참여를 확정하면 15점 차감"],
  ["배분", "문턱 넘은 지갑에 균등 · 추첨 없음"],
] as const;

export function PointsLoop() {
  return (
    <section className="rounded-xl carved px-6 py-6">
      <h2 className="text-[15px] font-semibold">포인트가 도는 길</h2>
      <ol className="relative mt-6 grid gap-x-6 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
        {/* 걸음을 잇는 홈줄 — 넓은 화면에서만 (세로 쌓임에선 오히려 헷갈린다) */}
        <span
          aria-hidden
          className="absolute inset-x-10 top-[15px] hidden h-px bg-hairline lg:block"
        />
        {STEPS.map(([title, body], i) => (
          <li key={title} className="relative">
            <span className="grid size-8 place-items-center rounded-full border border-accent/45 bg-base font-mono text-[13px] font-bold text-accent">
              {i + 1}
            </span>
            <p className="mt-3 text-[16px] font-bold tracking-tight">{title}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{body}</p>
          </li>
        ))}
      </ol>

      <PointsAllocationDiagram />
    </section>
  );
}
