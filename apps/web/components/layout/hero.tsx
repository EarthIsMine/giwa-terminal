import { NaruScene } from "@/components/layout/naru-scene";

/**
 * 히어로 - 브랜드 워드마크를 반복하지 않는다(헤더에 이미 있음).
 * 대신 진짜 나루터 풍경(물·산·나룻배)이 아이덴티티를 말한다.
 * 절대 규칙 3: 통계 카드는 3장뿐. 값은 전부 온체인·업비트 실데이터다.
 * (거래대금·참여 지갑 카드는 인덱서 연결 시 복원한다)
 */
export function Hero({
  assetCount,
  depositDisplay,
  depositIsKrw,
  ethKrwLabel,
}: {
  assetCount: number;
  depositDisplay: string;
  depositIsKrw: boolean;
  ethKrwLabel: string | null;
}) {
  return (
    <section className="relative overflow-hidden border-b border-black/40">
      <NaruScene />
      {/* 좌측 텍스트 가독용 스크림 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(19,13,7,0.68),rgba(19,13,7,0.26)_45%,transparent_60%)]"
      />

      <div className="relative mx-auto flex min-h-[220px] w-full max-w-page flex-wrap items-end justify-between gap-x-10 gap-y-6 px-page pb-7 pt-9 sm:min-h-[280px] sm:gap-y-7 sm:pb-10 sm:pt-12">
        {/* 헤드라인은 위쪽에 둔다 - 아래로 내려오면 물결·배와 겹쳐 액센트가 묻힌다 */}
        <div className="max-w-[680px] self-start">
          <h1 className="font-serif text-[26px] font-bold leading-[1.32] tracking-[-0.01em] text-ink sm:text-[32px] lg:text-[36px]">
            업비트에서 기와체인으로
            <br />
            오는 <span className="text-accent">나룻길</span>
          </h1>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-2 sm:mt-4 sm:text-[14px]">
            나루는 발행 주체의 신원을 확인한 기와체인 자산만 다룹니다.
          </p>
        </div>

        {/* 모바일에서는 카드가 전폭을 나눠 갖고, 넓어지면 내용 폭만 차지한다 */}
        <dl className="flex w-full flex-wrap gap-2 sm:w-auto sm:gap-2.5">
          <div className="min-w-[148px] flex-1 rounded-xl carved px-4 py-3.5 sm:flex-none sm:px-5 sm:py-4">
            <dt className="text-[11.5px] font-medium tracking-[0.12em] text-ink-3">
              검증 자산
            </dt>
            <dd className="mt-1.5 font-mono text-[24px] font-semibold leading-none">
              {assetCount}
              <span className="ml-1 font-sans text-[12px] font-normal text-ink-3">
                종
              </span>
            </dd>
            <p className="mt-2 text-[11px] text-ink-3">발행 심사를 통과한 자산</p>
          </div>

          <div className="min-w-[172px] flex-1 rounded-xl carved px-4 py-3.5 sm:flex-none sm:px-5 sm:py-4">
            <dt className="text-[11.5px] font-medium tracking-[0.12em] text-ink-3">
              총 예치 규모
            </dt>
            <dd className="mt-1.5 font-mono text-[24px] font-semibold leading-none">
              {depositDisplay}
            </dd>
            <p className="mt-2 text-[11px] text-ink-3">
              {depositIsKrw ? "업비트 시세로 환산" : "환산 일시 불가 · ETH 표시"}
            </p>
          </div>

          <div className="min-w-[172px] flex-1 rounded-xl carved px-4 py-3.5 sm:flex-none sm:px-5 sm:py-4">
            <dt className="text-[11.5px] font-medium tracking-[0.12em] text-ink-3">
              환산 기준 시세
            </dt>
            <dd className="mt-1.5 font-mono text-[24px] font-semibold leading-none">
              {ethKrwLabel ?? "-"}
            </dd>
            <p className="mt-2 text-[11px] text-ink-3">
              {ethKrwLabel ? "업비트 KRW-ETH · 60초 갱신" : "업비트 시세 조회 불가"}
            </p>
          </div>
        </dl>
      </div>
    </section>
  );
}
