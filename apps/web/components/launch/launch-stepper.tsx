"use client";

/* 발행 진행 사다리(스텝퍼) + 런치패드 공용 체크 아이콘 */

export function CheckIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 14 14"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2.5 7.5l3 3 6-6.5" />
    </svg>
  );
}

export type StepState = "done" | "active" | "pending";

export interface Step {
  label: string;
  desc: string;
  state: StepState;
}

/** 신청 → 상장 사다리를 항상 보여준다 - 지금 어디까지 왔는지가 한눈에 읽힌다 */
export function Stepper({ steps }: { steps: readonly Step[] }) {
  return (
    <ol className="flex flex-wrap gap-y-4">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <li
            key={step.label}
            className={`flex items-start gap-3 ${isLast ? "" : "flex-1"} min-w-[150px]`}
          >
            <span
              aria-hidden
              className={`mt-px grid size-7 shrink-0 place-items-center rounded-full border text-[12px] font-semibold ${
                step.state === "done"
                  ? "border-good/40 bg-good/10 text-good"
                  : step.state === "active"
                    ? "border-accent/45 bg-accent/15 text-accent"
                    : "border-hairline text-ink-3"
              }`}
            >
              {step.state === "done" ? <CheckIcon size={12} /> : i + 1}
            </span>
            <span className="min-w-0 shrink-0">
              <span
                className={`block text-[13px] font-semibold ${
                  step.state === "pending" ? "text-ink-3" : ""
                }`}
              >
                {step.label}
              </span>
              <span className="mt-0.5 block text-[11.5px] text-ink-3">
                {step.desc}
              </span>
            </span>
            {!isLast ? (
              <span
                aria-hidden
                className={`mt-3.5 h-px min-w-6 flex-1 ${
                  step.state === "done" ? "bg-good/30" : "bg-hairline"
                }`}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
