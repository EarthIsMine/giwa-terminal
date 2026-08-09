"use client";

import { explorerAddressUrl, giwaChain } from "@giwa/config";
import { shortHex } from "@giwa/shared";

/*
 * 우측 요약·인포 카드 — 발행 조건 요약, 발행 신청 버튼, 발행 게이트 온체인 안내.
 * 제출 판단(verified && formValid)은 부모가 내리고, 여기는 표시와 클릭 전달만 한다.
 */

export function SummaryRow({
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
        className={`min-w-0 max-w-full text-right text-[13px] [overflow-wrap:anywhere] ${mono ? "font-mono tabular-nums" : ""} ${valueClass}`}
      >
        {value}
      </dd>
    </div>
  );
}

/* 발행 신청 버튼 — 조건 충족 전에는 잠금 상태와 사유를 보여준다 */
function SubmitButton({
  verified,
  formValid,
  linksValid,
  onSubmit,
}: {
  verified: boolean;
  formValid: boolean;
  linksValid: boolean;
  onSubmit: () => void;
}) {
  if (verified && formValid) {
    return (
      <button
        type="button"
        onClick={onSubmit}
        className="mt-4 w-full rounded-lg bg-accent py-3 text-[13.5px] font-semibold text-accent-ink transition-[filter] hover:brightness-110"
      >
        발행 신청
      </button>
    );
  }
  return (
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
        ? linksValid
          ? "자산 이름과 심볼을 입력하세요"
          : "링크 URL을 확인하세요"
        : "신원 검증 후 발행할 수 있습니다"}
    </button>
  );
}

function linkSummaryValue(value: string, valid: boolean): string {
  if (value.trim() === "") return "—";
  return valid ? value.trim() : "잘못된 URL";
}

/* 발행 게이트 온체인 — 배포·검증된 실제 컨트랙트 (주소는 env 주입) */
function GateOnchainCard() {
  if (!giwaChain.tokenFactoryAddress) return null;
  return (
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
  );
}

export function LaunchSummaryAside({
  name,
  ticker,
  verified,
  formValid,
  linksValid,
  website,
  websiteValid,
  xUrl,
  xUrlValid,
  telegramUrl,
  telegramUrlValid,
  onSubmit,
}: {
  name: string;
  ticker: string;
  verified: boolean;
  formValid: boolean;
  linksValid: boolean;
  website: string;
  websiteValid: boolean;
  xUrl: string;
  xUrlValid: boolean;
  telegramUrl: string;
  telegramUrlValid: boolean;
  onSubmit: () => void;
}) {
  return (
    <aside className="w-full shrink-0 xl:w-[400px]">
      <div className="rounded-xl carved p-6">
        <h2 className="text-[15px] font-semibold">최종 확인</h2>
        <p className="mt-1.5 text-[12.5px] text-ink-3">
          아래 조건은 컨트랙트로 고정되어 추후에 변경하실 수 없습니다.
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
            label="X"
            value={linkSummaryValue(xUrl, xUrlValid)}
            mono={false}
            valueClass={xUrlValid ? "" : "text-down"}
          />
          <SummaryRow
            label="Telegram"
            value={linkSummaryValue(telegramUrl, telegramUrlValid)}
            mono={false}
            valueClass={telegramUrlValid ? "" : "text-down"}
          />
          <SummaryRow
            label="웹사이트"
            value={linkSummaryValue(website, websiteValid)}
            mono={false}
            valueClass={websiteValid ? "" : "text-down"}
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

        <SubmitButton
          verified={verified}
          formValid={formValid}
          linksValid={linksValid}
          onSubmit={onSubmit}
        />

        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
          테스트넷 데모입니다. 검증·발행 신청은 시뮬레이션이며, 아래 발행
          게이트 컨트랙트와의 연동을 준비 중입니다.
        </p>
      </div>

      <GateOnchainCard />
    </aside>
  );
}
