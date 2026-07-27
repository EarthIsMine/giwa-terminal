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
        업비트에서 기와체인까지 네 걸음입니다. 비용과 기다림은 겪기 전에 미리
        알려드립니다.
      </p>
    </>
  );
}
