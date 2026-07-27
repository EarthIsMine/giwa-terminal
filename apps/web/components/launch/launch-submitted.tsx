"use client";

import Link from "next/link";
import { CheckIcon, Stepper, type Step } from "@/components/launch/launch-stepper";
import { GATE_LABEL, type GateMethod } from "@/components/launch/launch-verification";
import { SummaryRow } from "@/components/launch/launch-summary";

/* 접수 완료 화면 — 신청 내용을 요약해 보여주고 목록/재작성 동선을 제공한다 */

export function LaunchSubmitted({
  steps,
  name,
  ticker,
  gate,
  onReset,
}: {
  steps: readonly Step[];
  name: string;
  ticker: string;
  gate: GateMethod | null;
  onReset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-[1840px] px-8 pb-4 pt-12">
      <div className="mx-auto max-w-[640px]">
        <Stepper steps={steps} />
      </div>
      <div className="mx-auto mt-8 max-w-[640px] rounded-2xl carved p-10 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full border border-good/30 bg-good/10 text-good">
          <CheckIcon size={26} />
        </div>
        <h1 className="mt-5 text-[26px] font-bold tracking-tight">
          발행 신청이 접수되었습니다
        </h1>
        <p className="mt-2.5 text-[14px] leading-relaxed text-ink-2">
          신원 검증 심사가 끝나면 자산이 검증 배지와 함께
          <br />
          나루 목록에 표시됩니다.
        </p>

        <dl className="mt-7 rounded-xl carved px-5 text-left">
          <SummaryRow label="자산" value={name} mono={false} />
          <SummaryRow label="페어" value={`${ticker}/WETH`} />
          <SummaryRow label="공급량" value="1,000,000,000 (고정)" />
          <SummaryRow
            label="검증 방식"
            value={gate ? GATE_LABEL[gate] : "—"}
            mono={false}
            valueClass="text-good"
          />
        </dl>

        <p className="mt-5 text-[11.5px] leading-relaxed text-ink-3">
          테스트넷 데모 · 신청은 시뮬레이션입니다. 발행 게이트 컨트랙트는
          GIWA Sepolia에 배포되어 있으며, 폼 연동을 준비 중입니다.
        </p>

        <div className="mt-6 flex justify-center gap-2.5">
          <Link
            href="/"
            className="rounded-lg bg-accent px-5 py-2.5 text-[13.5px] font-semibold text-accent-ink transition-[filter] hover:brightness-110"
          >
            자산 목록 보기
          </Link>
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-hairline px-5 py-2.5 text-[13.5px] text-ink-2 transition-colors hover:bg-panel-2"
          >
            새로 작성
          </button>
        </div>
      </div>
    </div>
  );
}
