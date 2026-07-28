/**
 * 분석 라우트 인트로 — 제목·리드 카피는 여기서만 관리한다 (page 는 조립 전용).
 * 카피 규칙: 해석·경고를 앞서 말하지 않는다 — 산정 기준이 붙은 사실 수치만
 * 보여주고 판단은 독자 몫으로 남긴다. 고지 문구는 보드 하단에 상시 노출.
 */
export function AnalysisIntro() {
  return (
    <>
      <h1 className="font-serif text-[27px] font-bold tracking-tight">분석</h1>
      <p className="mt-2 max-w-[640px] text-[13px] leading-relaxed text-ink-3">
        상장 자산의 보유 구조를 한 자리에서 견줘 봅니다. 홀더 수, 발행자 물량,
        상위 지갑 집중도, 참여 인원 — 가격 아래에 있는 구조를 보는 화면입니다.
        발행자 지갑은 심사에서 등록되고 보유 · 전송은 전수 수집됩니다 —
        추정이 아니라 기록입니다.
      </p>
    </>
  );
}
