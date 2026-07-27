"use client";

import type { PointsTier } from "@/components/points/points-eligibility-card";

/**
 * 우: 루프·산식 공개 — 전부 정적 설명 블록.
 * 산식 구간표만 props 로 받는다(구간 정의의 단일 소스는 PointsView 의 TIERS).
 */
export function PointsGuide({ tiers }: { tiers: readonly PointsTier[] }) {
  return (
    <>
      <div className="rounded-xl carved p-6">
        <h2 className="text-[15px] font-semibold">포인트가 도는 길</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-4">
          {[
            ["쌓기", "보유 잔고와 순매수로 매일 포인트가 쌓입니다 (15일 롤링)"],
            ["문턱", "새 자산 상장 이벤트마다 참여 문턱 점수가 열립니다"],
            ["소각", "참여를 확정하면 포인트 15점이 소각됩니다"],
            ["배분", "문턱을 넘은 인증 지갑에 균등 배분 · 추첨 없는 확정형"],
          ].map(([title, body], i) => (
            <li
              key={title}
              className="rounded-lg border border-hairline/60 bg-black/20 p-4"
            >
              <span className="grid size-5 place-items-center rounded-full bg-accent/15 font-mono text-[11.5px] font-bold text-accent">
                {i + 1}
              </span>
              <p className="mt-2 text-[13px] font-semibold">{title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-3">
                {body}
              </p>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-xl carved p-6">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-[15px] font-semibold">산식 공개</h2>
          <span className="text-[11px] text-ink-3">
            규칙을 전부 공개합니다. 검증 가능한 적립이 원칙입니다
          </span>
        </div>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div>
            <p className="text-[12.5px] font-medium text-ink-2">
              잔고 포인트 (일 1회 스냅샷)
            </p>
            <table className="mt-2 w-full text-[12px]">
              <tbody>
                {[...tiers].reverse().map((t) => (
                  <tr
                    key={t.label}
                    className="border-b border-black/25 last:border-0"
                  >
                    <td className="py-1.5 text-ink-3">{t.label}</td>
                    <td className="py-1.5 text-right font-mono tabular-nums">
                      {t.points}점/일
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
              스냅샷 시각은 매일 무작위이며, 기준 블록번호를 사후 공개해 누구나
              자기 점수를 재계산할 수 있게 합니다. LP 포지션은 2배 가중.
            </p>
          </div>
          <div className="space-y-3 text-[12px] leading-relaxed text-ink-3">
            <p>
              <b className="text-ink-2">매수 포인트</b>: 일일 순매수(매수 −
              매도) 3,000원부터, 금액이 2배가 될 때마다 1점씩 추가됩니다.
              신규 상장 자산은 상장 후 30일간 2배.
            </p>
            <p>
              <b className="text-ink-2">15일 롤링 · FIFO 소각</b>: 포인트는
              적립 후 15일이 지나면 소멸하고, 소각은 가장 오래된 적립분부터
              차감됩니다.
            </p>
            <p>
              <b className="text-ink-2">조작 방어</b>: 매수분은 다음 잔고
              스냅샷까지 보유해야 확정되고(사고 바로 팔면 무효), 같은 클러스터
              지갑끼리의 거래는 상계되며, 발행자·팀 지갑은 자사 자산 이벤트에
              참여할 수 없습니다.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl carved p-6">
        <h2 className="text-[15px] font-semibold">다가오는 상장 이벤트</h2>
        <p className="mt-3 grid h-[88px] place-items-center rounded-lg border border-dashed border-hairline text-[12.5px] text-ink-3">
          시즌 0 개시 후 이곳에 열립니다. 첫 검증 상장과 함께 시작합니다
        </p>
      </div>

      <p className="text-[11px] leading-relaxed text-ink-3">
        · 포인트는 양도·환금할 수 없고 온체인 토큰이 아닙니다. 배분은 추첨
        없는 확정형이며 확률형 요소를 도입하지 않습니다.
        <br />· 인증 지갑 하나에 나루 계정 하나만 연결됩니다. 로그인 자체는
        누구나 가능하고, 시세·분석 조회에는 제한이 없습니다.
        <br />· 배분 참여는 투자 권유가 아니며, 배분 자산의 가치는 변동할 수
        있습니다.
      </p>
    </>
  );
}
