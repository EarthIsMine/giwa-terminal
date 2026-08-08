/**
 * 분석 라우트 인트로 — 제목·리드 카피는 여기서만 관리한다 (page 는 조립 전용).
 * 카피 규칙: 해석·경고를 앞서 말하지 않는다 — 산정 기준이 붙은 사실 수치만
 * 보여주고 판단은 독자 몫으로 남긴다. 고지 문구는 보드 하단에 상시 노출.
 */
export function AnalysisIntro() {
  return (
    <>
      <h1 className="font-serif text-[27px] font-bold tracking-tight">분석</h1>
      <p className="mt-2 max-w-[660px] text-[13px] leading-relaxed text-ink-3">
        기와체인의 거래량과 수수료를 확인하고, 나루에 등록된 자산의 보유 구조를
        비교해 보세요.
      </p>
    </>
  );
}
