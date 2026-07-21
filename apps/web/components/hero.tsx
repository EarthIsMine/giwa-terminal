import { NaruScene } from "./naru-scene";

/**
 * 히어로 — 브랜드 워드마크를 반복하지 않는다(헤더에 이미 있음).
 * 대신 진짜 나루터 풍경(물·산·나룻배)이 아이덴티티를 말한다.
 * 절대 규칙 3: 통계 카드는 3장뿐.
 */
export function Hero({
  assetCount,
  todayVolumeCompact,
  todayTraders,
}: {
  assetCount: number;
  todayVolumeCompact: string;
  todayTraders: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-black/40">
      <NaruScene />
      {/* 좌측 텍스트 가독용 스크림 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(19,13,7,0.7),rgba(19,13,7,0.28)_45%,transparent_68%)]"
      />

      <div className="relative mx-auto flex min-h-[280px] w-full max-w-[1840px] flex-wrap items-end justify-between gap-x-10 gap-y-7 px-8 pb-10 pt-16">
        <div className="max-w-[680px]">
          <h1 className="font-serif text-[36px] font-bold leading-[1.32] tracking-[-0.01em] text-ink">
            업비트에서 기와 온체인으로
            <br />
            오는 <span className="text-accent">나룻길</span>
          </h1>
          <p className="mt-4 text-[14px] leading-relaxed text-ink-2">
            나루는 기와체인의 신원 검증 자산만 익숙한 원화 감각으로 보여줍니다.
          </p>
        </div>

        <dl className="flex flex-wrap gap-2.5">
          <div className="min-w-[148px] rounded-xl carved px-5 py-4">
            <dt className="text-[10.5px] font-medium tracking-[0.12em] text-ink-3">
              검증 자산
            </dt>
            <dd className="mt-1.5 font-mono text-[24px] font-semibold leading-none">
              {assetCount}
              <span className="ml-1 font-sans text-[12px] font-normal text-ink-3">
                종
              </span>
            </dd>
          </div>

          <div className="min-w-[172px] rounded-xl carved px-5 py-4">
            <dt className="text-[10.5px] font-medium tracking-[0.12em] text-ink-3">
              오늘 거래대금
            </dt>
            <dd className="mt-1.5 font-mono text-[24px] font-semibold leading-none">
              {todayVolumeCompact}
              <span className="ml-1 font-sans text-[12px] font-normal text-ink-3">
                원
              </span>
            </dd>
            <p className="mt-2 text-[10px] text-ink-3">업비트 시세 환산</p>
          </div>

          <div className="min-w-[148px] rounded-xl carved px-5 py-4">
            <dt className="text-[10.5px] font-medium tracking-[0.12em] text-ink-3">
              오늘 참여 인원
            </dt>
            <dd className="mt-1.5 font-mono text-[24px] font-semibold leading-none">
              {todayTraders}
              <span className="ml-1 font-sans text-[12px] font-normal text-ink-3">
                명
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
