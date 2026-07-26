"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { explorerAddressUrl, giwaChain } from "@giwa/config";
import { shortHex } from "@giwa/shared";

/**
 * 검증 런치패드 (2026-07-21 팀 결정: 제품이다).
 * 퍼미션리스가 아니라 신원 검증 발행이 정체성 — 흐름은 신청 → 검증 → 상장.
 * 데모 단계: 검증·발행 신청은 시뮬레이션이며 화면에 명시한다.
 * 발행 게이트(TokenFactory)·신원 원장(IdentityRegistry)은 GIWA Sepolia에 배포·검증
 * 완료 — 주소는 env로 주입되며(절대 규칙 4) 우측 카드에서 익스플로러로 확인할 수 있다.
 */

const INPUT_CLASS =
  "h-10 w-full rounded-lg border border-hairline bg-panel px-3.5 text-[13.5px] text-ink placeholder:text-ink-3";

const LABEL_CLASS = "mb-1.5 block text-[12.5px] font-medium text-ink-2";

type GateMethod = "dojang" | "giwa-id";
type GateStatus = "idle" | "verifying" | "verified";

const GATE_LABEL: Record<GateMethod, string> = {
  dojang: "도장 어테스테이션",
  "giwa-id": "GIWA ID 연동",
};

function CheckIcon({ size = 13 }: { size?: number }) {
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

/* ---------- 진행 단계 스텝퍼 ---------- */

type StepState = "done" | "active" | "pending";

interface Step {
  label: string;
  desc: string;
  state: StepState;
}

/** 신청 → 상장 사다리를 항상 보여준다 — 지금 어디까지 왔는지가 한눈에 읽힌다 */
function Stepper({ steps }: { steps: readonly Step[] }) {
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

function SummaryRow({
  label,
  value,
  mono = true,
  valueClass = "",
}: {
  label: string;
  value: string;
  mono?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline/60 py-3 last:border-0">
      <dt className="shrink-0 text-[12.5px] text-ink-3">{label}</dt>
      <dd
        className={`text-right text-[13px] ${mono ? "font-mono tabular-nums" : ""} ${valueClass}`}
      >
        {value}
      </dd>
    </div>
  );
}

export function LaunchForm() {
  const [gate, setGate] = useState<GateMethod | null>(null);
  const [gateStatus, setGateStatus] = useState<GateStatus>("idle");
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoError, setLogoError] = useState(false);
  const [website, setWebsite] = useState("");
  const [xUrl, setXUrl] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const verified = gateStatus === "verified";
  const formValid = name.trim() !== "" && ticker.length >= 2;
  const showLogo = logoUrl.trim() !== "" && !logoError;

  /* 사다리 상태 — 폼 진행과 1:1로 연동 */
  const steps: readonly Step[] = [
    {
      label: "신원 검증",
      desc: "도장 · GIWA ID",
      state: verified ? "done" : "active",
    },
    {
      label: "자산 정보",
      desc: "이름 · 심볼 · 로고",
      state: formValid ? "done" : verified ? "active" : "pending",
    },
    {
      label: "발행 신청",
      desc: "조건 확정 · 접수",
      state: submitted ? "done" : verified && formValid ? "active" : "pending",
    },
    {
      label: "심사 후 상장",
      desc: "검증 배지와 함께 목록 노출",
      state: submitted ? "active" : "pending",
    },
  ];

  // 검증 시뮬레이션 타이머 — 리셋·언마운트 시 정리해 유령 setState 를 막는다
  const verifyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (verifyTimer.current !== null) clearTimeout(verifyTimer.current);
    };
  }, []);

  const startVerification = () => {
    if (gate === null || gateStatus !== "idle") return;
    setGateStatus("verifying");
    // 데모 시뮬레이션 — 실제 검증은 도장/GIWA ID 연동 후 대체된다
    verifyTimer.current = setTimeout(() => setGateStatus("verified"), 1400);
  };

  const reset = () => {
    if (verifyTimer.current !== null) {
      clearTimeout(verifyTimer.current);
      verifyTimer.current = null;
    }
    setGate(null);
    setGateStatus("idle");
    setName("");
    setTicker("");
    setLogoUrl("");
    setLogoError(false);
    setWebsite("");
    setXUrl("");
    setSubmitted(false);
  };

  /* ---------- 접수 완료 화면 ---------- */
  if (submitted) {
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
              onClick={reset}
              className="rounded-lg border border-hairline px-5 py-2.5 text-[13.5px] text-ink-2 transition-colors hover:bg-panel-2"
            >
              새로 작성
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- 발행 폼 ---------- */
  return (
    <div className="mx-auto w-full max-w-[1840px] px-8 pb-4 pt-12">
      <h1 className="text-[40px] font-bold leading-tight tracking-tight">
        기와체인 최초의 <span className="text-accent">검증 런치패드</span>
      </h1>
      <div className="mt-4 max-w-[720px] space-y-1 text-[14.5px] leading-relaxed text-ink-2">
        <p>
          나루는 퍼미션리스 발행을 지원하지 않습니다.{" "}
          <span className="font-medium text-good">검증된 발행 주체</span>만
          자산을 올릴 수 있습니다.
        </p>
        <p>
          <span className="text-ink">도장(Dojang) 어테스테이션</span> 또는{" "}
          <span className="text-ink">GIWA ID 연동</span>이 전제이며, 흐름은
          신청 → 검증 → 상장입니다.
        </p>
      </div>

      {/* 진행 사다리 — 폼 상태와 연동 */}
      <div className="mt-8 max-w-[980px]">
        <Stepper steps={steps} />
      </div>

      <div className="mt-9 flex flex-col items-start gap-5 xl:flex-row">
        {/* 좌: 단계별 폼 */}
        <div className="w-full min-w-0 flex-1 space-y-4">
          {/* 1. 신원 검증 — 게이트가 1단계다 */}
          <section className="rounded-xl carved p-6">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[15px] font-semibold">1. 신원 검증</h2>
              <span className="rounded-md border border-good/25 bg-good/10 px-1.5 py-0.5 text-[11.5px] font-medium text-good">
                필수
              </span>
              <span className="ml-auto flex items-center gap-1.5 text-[12px]">
                {gateStatus === "idle" ? (
                  <span className="text-ink-3">상태: 미검증</span>
                ) : gateStatus === "verifying" ? (
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
            </div>
            <p className="mt-1.5 text-[12.5px] text-ink-3">
              발행 주체의 신원을 먼저 확인합니다. 검증 방식을 선택하세요.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <GateTile
                selected={gate === "dojang"}
                disabled={gateStatus !== "idle"}
                onSelect={() => setGate("dojang")}
                title="도장(Dojang) 어테스테이션"
                desc="사업자·단체의 오프체인 증빙을 온체인에서 검증합니다."
              />
              <GateTile
                selected={gate === "giwa-id"}
                disabled={gateStatus !== "idle"}
                onSelect={() => setGate("giwa-id")}
                title="GIWA ID 연동"
                desc="KYC 검증 주소에 종속된 GIWA ID로 발행 주체를 증명합니다."
              />
            </div>
            <div className="mt-4 flex items-center gap-2.5">
              <button
                type="button"
                disabled={gate === null || gateStatus !== "idle"}
                onClick={startVerification}
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

          {/* 2. 자산 정보 */}
          <section className="rounded-xl carved p-6">
            <h2 className="text-[15px] font-semibold">2. 자산 정보</h2>
            <p className="mt-1.5 text-[12.5px] text-ink-3">
              공급량은 발행 시 고정되며, 이후 추가 발행·과세·소유자 권한이
              없습니다.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="asset-name" className={LABEL_CLASS}>
                  자산 이름
                </label>
                <input
                  id="asset-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 청자"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label htmlFor="asset-ticker" className={LABEL_CLASS}>
                  심볼
                </label>
                <input
                  id="asset-ticker"
                  type="text"
                  value={ticker}
                  onChange={(e) =>
                    setTicker(
                      e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, "")
                        .slice(0, 10),
                    )
                  }
                  placeholder="예: CHUNGJA"
                  className={`${INPUT_CLASS} font-mono`}
                />
              </div>
            </div>
            <div className="mt-4">
              <span className={LABEL_CLASS}>
                로고{" "}
                <span className="font-normal text-ink-3">(이미지 URL)</span>
              </span>
              <div className="flex items-center gap-4">
                <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-dashed border-hairline text-[11px] text-ink-3">
                  {showLogo ? (
                    // 미리보기 전용 원격 이미지 — 업로드 전 확인 용도라 next/image 최적화 대상이 아니다
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt="로고 미리보기"
                      className="size-16 object-cover"
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    "로고 없음"
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <label htmlFor="asset-logo" className="sr-only">
                    로고 이미지 URL
                  </label>
                  <input
                    id="asset-logo"
                    type="url"
                    value={logoUrl}
                    onChange={(e) => {
                      setLogoUrl(e.target.value);
                      setLogoError(false);
                    }}
                    placeholder="https://…/logo.png"
                    className={INPUT_CLASS}
                  />
                  <p className="mt-1.5 text-[11.5px] text-ink-3">
                    정사각형 PNG/JPG 직링크. IPFS나 자체 서버 모두 가능합니다.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 3. 링크 (선택) */}
          <section className="rounded-xl carved p-6">
            <h2 className="text-[15px] font-semibold">
              3. 링크{" "}
              <span className="text-[12px] font-normal text-ink-3">(선택)</span>
            </h2>
            <p className="mt-1.5 text-[12.5px] text-ink-3">
              자산 상세 페이지에 표시됩니다. 발행 후 발행자 서명으로 변경할 수
              있습니다.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="asset-website" className={LABEL_CLASS}>
                  웹사이트
                </label>
                <input
                  id="asset-website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourasset.xyz"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label htmlFor="asset-x" className={LABEL_CLASS}>
                  X (트위터)
                </label>
                <input
                  id="asset-x"
                  type="url"
                  value={xUrl}
                  onChange={(e) => setXUrl(e.target.value)}
                  placeholder="https://x.com/yourasset"
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </section>
        </div>

        {/* 우: 요약 */}
        <aside className="w-full shrink-0 xl:w-[400px]">
          <div className="rounded-xl carved p-6">
            <h2 className="text-[15px] font-semibold">요약</h2>
            <p className="mt-1.5 text-[12.5px] text-ink-3">
              아래 조건은 발행 시 컨트랙트로 고정됩니다.
            </p>
            <dl className="mt-4">
              <SummaryRow
                label="자산"
                value={name.trim() === "" ? "—" : name}
                mono={false}
              />
              <SummaryRow
                label="페어"
                value={`${ticker === "" ? "—" : ticker}/WETH`}
              />
              <SummaryRow label="공급량" value="1,000,000,000 (고정)" />
              <SummaryRow label="추가 발행 · 과세" value="불가" mono={false} />
              <SummaryRow
                label="노출 위치"
                value="나루 자산 목록"
                mono={false}
              />
              <SummaryRow
                label="발행 조건"
                value={verified ? "신원 검증 완료" : "신원 검증 필요"}
                mono={false}
                valueClass={verified ? "font-medium text-good" : ""}
              />
            </dl>

            <div className="mt-4 flex gap-2.5 rounded-lg border border-good/20 bg-good/[0.06] p-3.5">
              <svg
                viewBox="0 0 16 16"
                width={15}
                height={15}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="mt-0.5 shrink-0 text-good"
              >
                <path d="M8 1.5l5 1.8v3.6c0 3.3-2.1 5.7-5 7-2.9-1.3-5-3.7-5-7V3.3L8 1.5z" />
                <path d="M5.8 7.9l1.6 1.6 2.8-3.1" />
              </svg>
              <p className="text-[12.5px] leading-relaxed text-ink-2">
                <span className="font-medium text-good">
                  검증 배지가 함께 표시됩니다.
                </span>{" "}
                검증되지 않은 자산은 나루에 노출되지 않습니다.
              </p>
            </div>

            {verified && formValid ? (
              <button
                type="button"
                onClick={() => setSubmitted(true)}
                className="mt-4 w-full rounded-lg bg-accent py-3 text-[13.5px] font-semibold text-accent-ink transition-[filter] hover:brightness-110"
              >
                발행 신청
              </button>
            ) : (
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="mt-4 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-hairline bg-accent/15 py-3 text-[13.5px] font-medium text-ink-3"
              >
                {verified ? null : (
                  <svg
                    viewBox="0 0 14 14"
                    width={13}
                    height={13}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <rect x="2.5" y="6" width="9" height="6" rx="1.2" />
                    <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" />
                  </svg>
                )}
                {verified
                  ? "자산 이름과 심볼을 입력하세요"
                  : "신원 검증 후 발행할 수 있습니다"}
              </button>
            )}

            <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
              테스트넷 데모입니다. 검증·발행 신청은 시뮬레이션이며, 아래 발행
              게이트 컨트랙트와의 연동을 준비 중입니다.
            </p>
          </div>

          {/* 발행 게이트 온체인 — 배포·검증된 실제 컨트랙트 (주소는 env 주입) */}
          {giwaChain.tokenFactoryAddress ? (
            <div className="mt-4 rounded-xl carved p-6">
              <h2 className="text-[15px] font-semibold">발행 게이트 온체인</h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-3">
                이 폼이 연결될 컨트랙트는 {giwaChain.name}에 배포되어 있고
                소스가 공개 검증되어 있습니다.
              </p>
              <dl className="mt-3">
                <div className="flex items-center justify-between gap-4 border-b border-hairline/60 py-2.5">
                  <dt className="text-[12.5px] text-ink-3">발행 게이트</dt>
                  <dd>
                    <a
                      href={explorerAddressUrl(giwaChain.tokenFactoryAddress)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-[12.5px] text-ink-2 transition-colors hover:text-accent"
                    >
                      {shortHex(giwaChain.tokenFactoryAddress)}
                      <span aria-hidden className="text-[11px]">↗</span>
                    </a>
                  </dd>
                </div>
                {giwaChain.identityRegistryAddress ? (
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-[12.5px] text-ink-3">신원 검증 원장</dt>
                    <dd>
                      <a
                        href={explorerAddressUrl(giwaChain.identityRegistryAddress)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-[12.5px] text-ink-2 transition-colors hover:text-accent"
                      >
                        {shortHex(giwaChain.identityRegistryAddress)}
                        <span aria-hidden className="text-[11px]">↗</span>
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
              <p className="mt-2.5 text-[11px] leading-relaxed text-ink-3">
                참여자 검증(업비트 아이디 로그인)도 준비 중입니다. 발행과
                참여 모두 신원 기반으로 갑니다.
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
