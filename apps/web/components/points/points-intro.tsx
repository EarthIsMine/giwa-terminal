/**
 * 포인트 라우트 인트로 — 제목·리드 카피는 여기서만 관리한다.
 * 카피 규칙: 확률형·기대이익 암시 금지(기획서 §4.4), KYC 게이트를 명시한다.
 * 은유 없이 사실 서술로 쓴다 — 구조 설명은 문장이 아니라 그림이 맡는다
 * (PointsLoop 의 배분 구조 다이어그램).
 */
export function PointsIntro() {
  return (
    <>
      <h1 className="font-serif text-[27px] font-bold tracking-tight">
        나루 포인트
      </h1>
      <p className="mt-2 max-w-[640px] text-[13px] leading-relaxed text-ink-3">
        예치와 거래로 포인트를 쌓고, 새 자산이 상장될 때 포인트를 소각해 배분에
        참여합니다. 참여 자격은 업비트 KYC 인증 지갑입니다. 지갑을 아무리
        만들어도 인증 없이는 적립되지 않습니다.
      </p>
    </>
  );
}
