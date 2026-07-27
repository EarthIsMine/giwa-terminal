"use client";

import { CheckIcon } from "@/components/launch/launch-stepper";

/*
 * 1. 신원 검증 섹션 — 게이트가 1단계다.
 * 검증 상태·전이는 부모(LaunchForm)가 소유하고, 여기는 렌더와 입력 이벤트만 담당한다.
 */

export type GateMethod = "dojang" | "giwa-id";
export type GateStatus = "idle" | "verifying" | "verified";

export const GATE_LABEL: Record<GateMethod, string> = {
  dojang: "도장 어테스테이션",
  "giwa-id": "GIWA ID 연동",
};

function GateTile({
  selected,
  disabled,
  onSelect,
  title,
  desc,
}: {
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`rounded-xl border px-4 py-3.5 text-left transition-colors ${
        selected
          ? "border-good/40 bg-good/10"
          : disabled
            ? "cursor-not-allowed border-hairline bg-panel opacity-50"
            : "border-hairline bg-panel hover:border-ink-3/30"
      }`}
    >
      <p className="flex items-center gap-1.5 text-[13.5px] font-semibold">
        {selected ? (
          <span className="text-good">
            <CheckIcon />
          </span>
        ) : null}
        {title}
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{desc}</p>
    </button>
  );
}

/* 검증 상태 표시 배지 — idle / verifying / verified */
function GateStatusBadge({ status }: { status: GateStatus }) {
  return (
    <span className="ml-auto flex items-center gap-1.5 text-[12px]">
      {status === "idle" ? (
        <span className="text-ink-3">상태: 미검증</span>
      ) : status === "verifying" ? (
        <span className="flex items-center gap-1.5 text-ink-2">
          <span
            aria-hidden
            className="size-3 animate-spin rounded-full border-[1.5px] border-hairline border-t-accent"
          />
          검증 중…
        </span>
      ) : (
        <span className="flex items-center gap-1 font-medium text-good">
          <CheckIcon size={12} />
          검증 완료
        </span>
      )}
    </span>
  );
}

export function LaunchVerificationSection({
  gate,
  gateStatus,
  onSelectGate,
  onStartVerification,
}: {
  gate: GateMethod | null;
  gateStatus: GateStatus;
  onSelectGate: (gate: GateMethod) => void;
  onStartVerification: () => void;
}) {
  return (
    <section className="rounded-xl carved p-6">
      <div className="flex items-center gap-2.5">
        <h2 className="text-[15px] font-semibold">1. 신원 검증</h2>
        <span className="rounded-md border border-good/25 bg-good/10 px-1.5 py-0.5 text-[11.5px] font-medium text-good">
          필수
        </span>
        <GateStatusBadge status={gateStatus} />
      </div>
      <p className="mt-1.5 text-[12.5px] text-ink-3">
        발행 주체의 신원을 먼저 확인합니다. 검증 방식을 선택하세요.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <GateTile
          selected={gate === "dojang"}
          disabled={gateStatus !== "idle"}
          onSelect={() => onSelectGate("dojang")}
          title="도장(Dojang) 어테스테이션"
          desc="사업자·단체의 오프체인 증빙을 온체인에서 검증합니다."
        />
        <GateTile
          selected={gate === "giwa-id"}
          disabled={gateStatus !== "idle"}
          onSelect={() => onSelectGate("giwa-id")}
          title="GIWA ID 연동"
          desc="KYC 검증 주소에 종속된 GIWA ID로 발행 주체를 증명합니다."
        />
      </div>
      <div className="mt-4 flex items-center gap-2.5">
        <button
          type="button"
          disabled={gate === null || gateStatus !== "idle"}
          onClick={onStartVerification}
          className={`rounded-lg border px-4 py-2 text-[13px] font-medium transition-colors ${
            gate === null || gateStatus !== "idle"
              ? "cursor-not-allowed border-hairline text-ink-3"
              : "border-good/35 bg-good/10 text-good hover:bg-good/15"
          }`}
        >
          {gateStatus === "verified" ? "검증되었습니다" : "검증 시작"}
        </button>
        <span className="rounded border border-warn/25 bg-warn/10 px-1.5 py-px text-[11px] text-warn">
          데모 시뮬레이션
        </span>
      </div>
    </section>
  );
}
