import {
  formatCountCompact,
  formatEth,
  formatKrw,
  weiToDisplayKrw,
} from "@giwa/shared";
// 체인 이름을 카피에 박지 않는다 - 메인넷 전환 시 config 만 바뀌어야 한다 (절대 규칙 4)
import { giwaChain } from "@giwa/config";
import type { ChainOverview } from "@/lib/chain";
import { ChainActivityChart } from "@/components/analysis/chain-activity-chart";

/**
 * 기와체인 활동 - 분석 화면의 첫 레이어.
 *
 * DEX 스캐너의 반대로 간다 (절대 규칙 3). 지표를 표로 늘어놓지 않고
 * 문장 하나로 판을 요약한 뒤, 업저씨가 실제로 궁금해할 넷만 크게 세운다:
 * 얼마나 돌아가나 · 몇 명이 있나 · 한 번에 얼마 드나 · 얼마나 빠른가.
 * 값이 없으면 그 자리를 비운다 - 0 이나 "-" 로 채우면 무거래와 구분이 안 된다.
 */

/**
 * 최근 7일 하루 평균. 진행 중인 오늘은 getDaily 가 이미 잘라내므로
 * 여기 들어오는 것은 전부 완결된 하루다 (차트와 같은 모집단).
 */
function recentDailyAverage(daily: ChainOverview["daily"]): number | null {
  if (daily.length === 0) return null;
  const window = daily.slice(-7);
  const sum = window.reduce((acc, d) => acc + d.count, 0);
  return Math.trunc(sum / window.length);
}

function Stat({
  label,
  value,
  unit,
  note,
}: {
  label: string;
  value: string;
  unit?: string;
  note: string;
}) {
  return (
    <div className="min-w-[168px] flex-1 rounded-xl carved px-4 py-3.5 sm:flex-none sm:px-5 sm:py-4">
      <dt className="text-[11.5px] font-medium tracking-[0.12em] text-ink-3">
        {label}
      </dt>
      <dd className="mt-1.5 font-mono text-[24px] font-semibold leading-none">
        {value}
        {unit ? (
          <span className="ml-1 font-sans text-[12px] font-normal text-ink-3">
            {unit}
          </span>
        ) : null}
      </dd>
      <p className="mt-2 text-[11px] leading-snug text-ink-3">{note}</p>
    </div>
  );
}

export function ChainPulse({
  chain,
  ethKrw,
}: {
  chain: ChainOverview;
  ethKrw: bigint | null;
}) {
  const dailyAvg = recentDailyAverage(chain.daily);
  const feeKrw =
    chain.medianFeeWei !== null && ethKrw !== null
      ? weiToDisplayKrw(chain.medianFeeWei, ethKrw)
      : null;

  // 원천(Blockscout)이 통째로 죽으면 제목만 남은 빈 섹션이 된다 - 보드째 감춘다
  // (명세서: 외부 데이터 원천 장애 시 해당 보드만 숨긴다)
  const hasAnything =
    chain.txTotal !== null ||
    chain.addressTotal !== null ||
    chain.blockSeconds !== null ||
    chain.medianFeeWei !== null ||
    dailyAvg !== null;
  if (!hasAnything) return null;

  return (
    // 분석 화면의 오프너 - "분석" h1 을 시각적으로 없애며(2026-09-01 결정) 첫
    // 섹션 제목이 화면 제목 역할을 이어받는다. 제목 스타일은 다른 라우트의
    // h1(font-serif 27px)과 같은 급으로 - 작게 두면 상단이 빈 공간으로 남는다
    <section>
      <h2 className="font-serif text-[27px] font-bold tracking-tight">
        기와체인 활동
      </h2>

      {/*
        누적 규모는 "라벨: 값" 한 줄로 짧게 - 카드에서 빠지므로 카드는
        "지금 어떤가" 세 장으로 줄어든다 (절대 규칙 3).
      */}
      <p className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[13px] leading-relaxed text-ink-2">
        {chain.txTotal !== null ? (
          <span>
            <span className="text-ink-3">총 거래</span>{" "}
            <strong className="font-semibold text-ink">
              {formatCountCompact(chain.txTotal)}건
            </strong>
          </span>
        ) : null}
        {/* addressTotal 은 지갑+컨트랙트 합이지만 억 단위 축약이라 "지갑"으로 단순화 (업저씨 언어) */}
        {chain.addressTotal !== null ? (
          <span>
            <span className="text-ink-3">총 지갑</span>{" "}
            <strong className="font-semibold text-ink">
              {formatCountCompact(chain.addressTotal)}개
            </strong>
          </span>
        ) : null}
      </p>

      <dl className="mt-5 flex flex-wrap gap-2.5">
        {dailyAvg !== null ? (
          <Stat
            label="하루 거래"
            value={formatCountCompact(dailyAvg)}
            unit="건"
            note="최근 7일 평균, 진행 중인 오늘 제외"
          />
        ) : null}

        {/* 업비트 출금 수수료와 곧장 비교되는 자리 - 업저씨가 가장 먼저 계산해 볼 숫자다 */}
        {chain.medianFeeWei !== null ? (
          <Stat
            label="현재 수수료"
            value={
              feeKrw !== null
                ? `₩${formatKrw(feeKrw)}`
                : formatEth(chain.medianFeeWei, 9)
            }
            unit={feeKrw !== null ? undefined : "ETH"}
            note="최근 거래 중앙값, 데이터 수수료 포함"
          />
        ) : null}

        {chain.blockSeconds !== null ? (
          <Stat
            label="블록 간격"
            value={chain.blockSeconds.toFixed(chain.blockSeconds < 10 ? 1 : 0)}
            unit="초"
            note="거래 처리 속도"
          />
        ) : null}
      </dl>

      <ChainActivityChart daily={chain.daily} />

      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
        체인 집계는 {giwaChain.name} 공개 기록(Blockscout)에서 가져온 값이며 나루
        인덱서 집계와 별개입니다. 체인 전체 거래대금과 예치 규모는 전 구간 인덱싱
        전까지 제공하지 않습니다.
      </p>
    </section>
  );
}
