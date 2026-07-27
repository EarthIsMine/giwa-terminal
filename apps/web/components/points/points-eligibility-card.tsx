"use client";

import { formatKrwCompact } from "@giwa/shared";
import type { DisplayKrw } from "@giwa/shared";

/** 도장 KYC 조회 상태 — 조회 로직은 PointsView 가 쥐고, 이 카드는 표시만 한다 */
export type KycState = "idle" | "loading" | "verified" | "unverified" | "error";

/** 잔고 구간 한 칸 (명세서 §2.5) — minKrwMilli 비교는 PointsView 몫 */
export interface PointsTier {
  points: number;
  label: string;
}

interface PointsEligibilityCardProps {
  account: string | null;
  onConnect: () => void;
  kyc: KycState;
  tier: PointsTier | null;
  /* DisplayKrw 로 받는다 — 언브랜드 bigint 면 WeiAmount 가 그대로 통과해
     wei 수량이 원화로 렌더된다 (절대 규칙 1: 온체인 값과 환산 값은 타입 레벨 분리) */
  valueKrwMilli: DisplayKrw | null;
  valueLoaded: boolean;
}

/** 좌: 내 자격·미리보기 — KYC 게이트 결과와 예상 잔고 포인트 렌더 전용 */
export function PointsEligibilityCard({
  account,
  onConnect,
  kyc,
  tier,
  valueKrwMilli,
  valueLoaded,
}: PointsEligibilityCardProps) {
  return (
    <div className="rounded-xl carved p-6">
      <h2 className="text-[15px] font-semibold">참여 자격 확인</h2>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">
        포인트 적립과 배분 참여는{" "}
        <b className="text-ink-2">업비트 KYC 인증 지갑</b>(도장 Verified
        Address)에만 열립니다. 인증 여부는 기와의 도장 컨트랙트에서 직접
        조회합니다.
      </p>

      {!account ? (
        <button
          type="button"
          onClick={onConnect}
          className="mt-4 w-full rounded-lg bg-accent py-3 text-[13.5px] font-semibold text-accent-ink transition-[filter] hover:brightness-110"
        >
          지갑 연결하고 자격 확인
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          {kyc === "loading" ? (
            <p className="text-[12.5px] text-ink-3">
              도장 어테스테이션 조회 중…
            </p>
          ) : kyc === "verified" ? (
            <p className="rounded-lg border border-good/25 bg-good/10 px-3.5 py-2.5 text-[12.5px] text-good">
              업비트 KYC 인증 지갑입니다 · 시즌 0 적립 대상
            </p>
          ) : kyc === "unverified" ? (
            <div className="rounded-lg border border-hairline bg-black/20 px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-3">
              이 지갑에는 업비트 KYC 어테스테이션(UPBIT_KOREA)이 없습니다.
              <br />
              테스트넷에서의 발급 정책은 기와팀과 확인 중입니다. 시즌 0
              산식은 인증 발급 상황에 맞춰 조정될 수 있습니다.
            </div>
          ) : (
            <p className="text-[12.5px] text-ink-3">
              도장 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.
            </p>
          )}

          {/* 예상 잔고 포인트 미리보기 */}
          <div className="rounded-lg border border-hairline/60 bg-black/20 p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-[11.5px] text-ink-3">
                예상 잔고 포인트 (미리보기)
              </p>
              <span className="text-[11px] text-ink-3">
                적립은 시즌 0 개시 후
              </span>
            </div>
            {tier !== null && valueKrwMilli !== null ? (
              <>
                <p className="mt-2 font-mono text-[26px] font-bold tabular-nums">
                  {tier.points}
                  <span className="ml-1 text-[13px] font-medium text-ink-3">
                    점/일
                  </span>
                </p>
                <p className="mt-1 text-[11px] text-ink-3">
                  평가액{" "}
                  {formatKrwCompact(valueKrwMilli)}원 ·{" "}
                  {tier.label} 구간
                </p>
              </>
            ) : (
              <p className="mt-2 text-[12px] text-ink-3">
                {valueLoaded
                  ? "원화 환산이 일시 불가해 계산할 수 없습니다."
                  : "온체인 잔고 계산 중…"}
              </p>
            )}
            <p className="mt-2.5 border-t border-hairline/40 pt-2 text-[11.5px] leading-relaxed text-ink-3">
              평가액 = GIWA ETH + 검증 자산. 검증 자산은 시세가 아니라{" "}
              <b className="text-ink-2">
                풀에 실제 매도했을 때 받는 금액
              </b>
              으로 평가합니다. 얇은 풀에서 시세를 띄워 구간을 올리는 조작이
              통하지 않습니다. LP 포지션 가중(2배)은 시즌 0에서 반영됩니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
