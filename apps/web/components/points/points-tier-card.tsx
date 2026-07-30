import type { PointsTier } from "@/components/points/points-eligibility-card";

/**
 * 얼마나 쌓이나 — 잔고 구간표를 계단 그림으로.
 *
 * 표(구간 5행 × 점수)는 약관처럼 읽힌다. 같은 정보를 "잔고가 오를수록
 * 게이지가 차오르는" 기둥 다섯 개로 바꾸면 규칙이 2초 만에 읽힌다.
 * 게이지는 분석 보드 지분 막대와 같은 문법(검은 홈 + 한지빛) — 화면끼리
 * 시각 언어를 하나로 유지한다.
 *
 * 매수 가점·소멸·조작 방어 세 문단은 내용을 그대로 두고 <details> 로 접는다.
 * 산식 전문 공개(검증 가능한 적립) 원칙은 유지하되, 첫눈에 읽는 것은
 * 잔고 규칙 하나로 좁힌다 (절대 규칙 3).
 */
export function PointsTierCard({ tiers }: { tiers: readonly PointsTier[] }) {
  // TIERS 는 내림차순(1억↑ 먼저) — 계단은 낮은 데서 높은 데로 오른다
  const asc = [...tiers].reverse();
  const maxPoints = Math.max(...asc.map((t) => t.points), 1);

  return (
    // id: 행로 1단계 "산식 보기" 앵커의 착지점. scroll-mt 는 스티키 헤더 높이만큼
    <section id="points-formula" className="h-full scroll-mt-20 rounded-xl carved p-6">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h2 className="text-[15px] font-semibold">얼마나 쌓이나요</h2>
        <span className="text-[11px] text-ink-3">
          산식은 전부 공개합니다 · 검증 가능한 적립이 원칙
        </span>
      </div>

      <p className="mt-3 text-[12.5px] text-ink-2">
        보유 잔고 구간에 따라 매일 1회, 아래만큼 쌓입니다.
      </p>

      <ol className="mt-5 grid grid-cols-5 gap-2.5">
        {asc.map((t) => (
          <li key={t.label} className="flex flex-col items-center gap-2">
            <span className="font-mono text-[15px] font-semibold tabular-nums leading-none">
              {t.points}
              <span className="ml-0.5 font-sans text-[10px] font-normal text-ink-3">
                점/일
              </span>
            </span>
            {/* 홈은 다섯 기둥 모두 같은 높이 — 채워진 만큼만 다르다.
                0점 구간은 빈 홈 그대로 보인다 ("적립 없음"이 그림으로 읽힌다) */}
            <span
              aria-hidden
              className="flex h-[84px] w-6 items-end overflow-hidden rounded-full bg-black/50"
            >
              <span
                className="block w-full rounded-full bg-[rgba(199,186,163,0.72)]"
                style={{ height: `${(t.points / maxPoints) * 100}%` }}
              />
            </span>
            <span className="text-center text-[10.5px] leading-tight text-ink-3">
              {t.label}
            </span>
          </li>
        ))}
      </ol>

      <p className="mt-4 text-[11.5px] leading-relaxed text-ink-3">
        스냅샷 시각은 매일 무작위이며, 기준 블록번호를 사후 공개해 누구나 자기
        점수를 재계산할 수 있습니다. LP 포지션은 2배 가중.
      </p>

      <details className="group mt-4 rounded-lg bg-black/20 px-4 py-3">
        <summary className="cursor-pointer list-none text-[12.5px] font-medium text-ink-2 transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
          <span
            aria-hidden
            className="mr-2 inline-block text-[10px] text-ink-3 transition-transform group-open:rotate-90"
          >
            ▶
          </span>
          자세한 규칙 · 매수 가점 / 15일 뒤 소멸 / 조작 방어
        </summary>
        <div className="mt-3 space-y-3 text-[12px] leading-relaxed text-ink-3">
          <p>
            <b className="text-ink-2">매수 포인트</b>: 일일 순매수(매수 − 매도)
            3,000원부터, 금액이 2배가 될 때마다 1점씩 추가됩니다. 신규 상장
            자산은 상장 후 30일간 2배.
          </p>
          <p>
            <b className="text-ink-2">15일 롤링</b>: 포인트는 적립 후 15일이
            지나면 소멸하고, 참여 시 차감은 가장 오래된 적립분부터
            적용됩니다(FIFO).
          </p>
          <p>
            <b className="text-ink-2">조작 방어</b>: 매수분은 다음 잔고
            스냅샷까지 보유해야 확정되고(사고 바로 팔면 무효), 같은 클러스터
            지갑끼리의 거래는 상계되며, 발행자·팀 지갑은 자사 자산 이벤트에
            참여할 수 없습니다.
          </p>
        </div>
      </details>
    </section>
  );
}
