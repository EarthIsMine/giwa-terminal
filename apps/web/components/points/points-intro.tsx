/**
 * 포인트 라우트 인트로 - 제목·리드 카피는 여기서만 관리한다.
 * 카피 규칙: 확률형·기대이익 암시 금지(기획서 §4.4), KYC 게이트를 명시한다.
 * 은유 없이 사실 서술로 쓴다 - 구조 설명은 문장이 아니라 그림이 맡는다
 * (PointsLoop 의 배분 구조 다이어그램).
 */
export function PointsIntro() {
  return (
    <>
      <h1 className="font-serif text-[27px] font-bold tracking-tight">
        나루 포인트 (테스트)
      </h1>
      <p className="mt-2 max-w-[640px] text-[13px] leading-relaxed text-ink-3">
        예치하고 거래해 쌓은 포인트로 새 자산 배분에 참여할 수 있습니다. 업비트
        KYC 인증 지갑만 포인트가 적립됩니다.
      </p>
    </>
  );
}
