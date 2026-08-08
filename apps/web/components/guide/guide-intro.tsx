/**
 * 가이드 라우트 인트로 — 제목·리드 카피는 여기서만 관리한다.
 * (오버레이는 GuideOverlay가 자체 축약 헤더를 렌더링한다)
 */
export function GuideIntro() {
  return (
    <>
      <h1 className="font-serif text-[27px] font-bold tracking-tight">
        처음 건너오는 길
      </h1>
      <p className="mb-8 mt-2 text-[13px] leading-relaxed text-ink-3">
        업비트 출금부터 기와체인 첫 거래까지 네 단계로 안내합니다. 필요한 비용과
        대기 시간도 함께 확인하세요.
      </p>
    </>
  );
}
