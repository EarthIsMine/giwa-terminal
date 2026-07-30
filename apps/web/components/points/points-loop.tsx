import { PointsAllocationDiagram } from "@/components/points/points-allocation-diagram";

/**
 * 포인트가 도는 길 — 전폭 4걸음 행로 + 상장 배분 구조도.
 *
 * 문단이 아니라 걸음이다: 단어 하나 + 한 줄 설명, 걸음 사이는 홈줄 하나로 잇는다.
 * 타겟 유저는 "쌓기→자격→차감→배분" 네 단어를 문장으로 읽지 않는다 —
 * 왼쪽에서 오른쪽으로 눈이 흐르는 그림 하나로 만들어야 한다 (절대 규칙 3).
 * 카피는 기존 문안을 줄인 것: 숫자·조건을 새로 만들지 않는다.
 * 2~4단계(자격·차감·배분)는 아래 구조도가 그림으로 한 번 더 말한다.
 *
 * 용어(2026-07-31): "소각"→"차감", "문턱"→"자격"/"기준 점수" — 크립토 용어와
 * 은유를 유저 노출 카피에서 걷어낸다(커트라인 감각의 "기준 점수"가 익숙하다).
 * 스냅샷 시각은 무작위(조작 방어)이므로 "자정" 같은 특정 시각을 적지 않는다.
 */

const STEPS: readonly {
  label: string;
  desc: string;
  /** 같은 화면 산식 카드로 내리는 앵커 — 새 화면 이동 아님 */
  anchor?: { href: string; text: string };
}[] = [
  {
    label: "쌓기",
    desc: "잔고와 순매수만큼 매일 1회 쌓입니다",
    anchor: { href: "#points-formula", text: "산식 보기" },
  },
  { label: "자격", desc: "새 자산 상장마다 참여 기준 점수가 공지됩니다" },
  {
    label: "차감",
    desc: "참여를 확정하면 15점이 빠집니다 · 남은 점수는 소멸(적립 후 15일) 전까지 다음 회차에 쓸 수 있습니다",
  },
  { label: "배분", desc: "참여한 인증 지갑에 추첨 없이 균등 배분됩니다" },
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
        {STEPS.map((step, i) => (
          <li key={step.label} className="relative">
            <span className="grid size-8 place-items-center rounded-full border border-accent/45 bg-base font-mono text-[13px] font-bold text-accent">
              {i + 1}
            </span>
            <p className="mt-3 text-[16px] font-bold tracking-tight">
              {step.label}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
              {step.desc}
              {step.anchor ? (
                <>
                  {" · "}
                  <a
                    href={step.anchor.href}
                    className="text-accent underline decoration-accent/40 underline-offset-2 transition-colors hover:decoration-accent"
                  >
                    {step.anchor.text}
                  </a>
                </>
              ) : null}
            </p>
          </li>
        ))}
      </ol>

      <PointsAllocationDiagram />
    </section>
  );
}
