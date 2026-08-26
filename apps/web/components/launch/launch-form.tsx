"use client";

import { useEffect, useRef, useState } from "react";
import { isOptionalAssetLinkValid } from "@giwa/shared";
import { LaunchAssetSection, LaunchLinksSection } from "@/components/launch/launch-asset-fields";
import { Stepper, type Step } from "@/components/launch/launch-stepper";
import { LaunchSubmitted } from "@/components/launch/launch-submitted";
import { LaunchSummaryAside } from "@/components/launch/launch-summary";
import {
  LaunchVerificationSection,
  type GateMethod,
  type GateStatus,
} from "@/components/launch/launch-verification";

/**
 * 검증 런치패드 (2026-07-21 팀 결정: 제품이다).
 * 퍼미션리스가 아니라 신원 검증 발행이 정체성 - 흐름은 신청 → 검증 → 상장.
 * 데모 단계: 검증·발행 신청은 시뮬레이션이며 화면에 명시한다.
 * 발행 게이트(TokenFactory)·신원 원장(IdentityRegistry)은 GIWA Sepolia에 배포·검증
 * 완료 - 주소는 env로 주입되며(절대 규칙 4) 우측 카드에서 익스플로러로 확인할 수 있다.
 *
 * 이 파일은 상태·단계 머신만 소유한다. 단계별 화면은
 * launch-verification / launch-asset-fields / launch-summary / launch-submitted 로 분리.
 */

/* 사다리 상태 - 폼 진행과 1:1로 연동 */
function buildSteps(
  verified: boolean,
  formValid: boolean,
  submitted: boolean,
): readonly Step[] {
  return [
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
}

/* 상단 타이틀·소개 카피 - 규제 검토를 거친 문구. 의미를 바꾸는 수정 금지 (2026-08-09 표현만 정리) */
function LaunchIntro() {
  return (
    <>
      <h1 className="text-[27px] font-bold leading-tight tracking-tight sm:text-[34px] lg:text-[40px]">
        기와체인 최초의 <span className="text-accent">검증 런치패드</span>
      </h1>
      <div className="mt-4 max-w-[720px] space-y-1 text-[13.5px] leading-relaxed text-ink-2 sm:text-[14.5px]">
        <p>
          나루는 검증되지 않은 발행을 지원하지 않습니다.{" "}
          <span className="font-medium text-good">검증된 발행 주체</span>만
          자산을 올릴 수 있습니다.
        </p>
        <p>
          <span className="text-ink">도장(Dojang) 어테스테이션</span> 또는{" "}
          <span className="text-ink">GIWA ID 연동</span>을 전제로 하며, 발행
          과정은 신청 → 검증 → 상장입니다.
        </p>
      </div>
    </>
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
  const [telegramUrl, setTelegramUrl] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const verified = gateStatus === "verified";
  const websiteValid = isOptionalAssetLinkValid("website", website);
  const xUrlValid = isOptionalAssetLinkValid("x", xUrl);
  const telegramUrlValid = isOptionalAssetLinkValid("telegram", telegramUrl);
  const linksValid = websiteValid && xUrlValid && telegramUrlValid;
  const formValid = name.trim() !== "" && ticker.length >= 2 && linksValid;
  const showLogo = logoUrl.trim() !== "" && !logoError;

  const steps = buildSteps(verified, formValid, submitted);

  // 검증 시뮬레이션 타이머 - 리셋·언마운트 시 정리해 유령 setState 를 막는다
  const verifyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearVerifyTimer = () => {
    if (verifyTimer.current !== null) {
      clearTimeout(verifyTimer.current);
      verifyTimer.current = null;
    }
  };

  useEffect(() => clearVerifyTimer, []);

  // 데모 시뮬레이션 - 실제 검증은 도장/GIWA ID 연동 후 대체된다
  const scheduleVerifySimulation = () => {
    verifyTimer.current = setTimeout(() => setGateStatus("verified"), 1400);
  };

  const startVerification = () => {
    if (gate === null || gateStatus !== "idle") return;
    setGateStatus("verifying");
    scheduleVerifySimulation();
  };

  const reset = () => {
    clearVerifyTimer();
    setGate(null);
    setGateStatus("idle");
    setName("");
    setTicker("");
    setLogoUrl("");
    setLogoError(false);
    setWebsite("");
    setXUrl("");
    setTelegramUrl("");
    setSubmitted(false);
  };

  /* ---------- 접수 완료 화면 ---------- */
  if (submitted) {
    return (
      <LaunchSubmitted
        steps={steps}
        name={name}
        ticker={ticker}
        gate={gate}
        website={website}
        xUrl={xUrl}
        telegramUrl={telegramUrl}
        onReset={reset}
      />
    );
  }

  /* ---------- 발행 폼 ---------- */
  return (
    <div className="mx-auto w-full max-w-[1840px] px-page pb-4 pt-8 sm:pt-12">
      <LaunchIntro />

      {/* 진행 사다리 - 폼 상태와 연동 */}
      <div className="mt-8 max-w-[980px]">
        <Stepper steps={steps} />
      </div>

      <div className="mt-9 flex flex-col items-start gap-5 xl:flex-row">
        {/* 좌: 단계별 폼 */}
        <div className="w-full min-w-0 flex-1 space-y-4">
          {/* 1. 신원 검증 - 게이트가 1단계다 */}
          <LaunchVerificationSection
            gate={gate}
            gateStatus={gateStatus}
            onSelectGate={setGate}
            onStartVerification={startVerification}
          />

          {/* 2. 자산 정보 */}
          <LaunchAssetSection
            name={name}
            onNameChange={setName}
            ticker={ticker}
            onTickerChange={setTicker}
            logoUrl={logoUrl}
            onLogoUrlChange={(value) => {
              setLogoUrl(value);
              setLogoError(false);
            }}
            showLogo={showLogo}
            onLogoError={() => setLogoError(true)}
          />

          {/* 3. 링크 (선택) */}
          <LaunchLinksSection
            website={website}
            onWebsiteChange={setWebsite}
            websiteValid={websiteValid}
            xUrl={xUrl}
            onXUrlChange={setXUrl}
            xUrlValid={xUrlValid}
            telegramUrl={telegramUrl}
            onTelegramUrlChange={setTelegramUrl}
            telegramUrlValid={telegramUrlValid}
          />
        </div>

        {/* 우: 요약 */}
        <LaunchSummaryAside
          name={name}
          ticker={ticker}
          verified={verified}
          formValid={formValid}
          linksValid={linksValid}
          website={website}
          websiteValid={websiteValid}
          xUrl={xUrl}
          xUrlValid={xUrlValid}
          telegramUrl={telegramUrl}
          telegramUrlValid={telegramUrlValid}
          onSubmit={() => setSubmitted(true)}
        />
      </div>
    </div>
  );
}
