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
        기와체인이라는 판 전체를 먼저 보고, 그 위에 올라온 자산으로 내려갑니다.
        체인이 얼마나 돌아가는지, 한 번 거래에 얼마가 드는지, 그 안에서 나루가
        무엇을 검증했는지. 가격 아래에 있는 구조를 보는 화면입니다.
      </p>
    </>
  );
}
