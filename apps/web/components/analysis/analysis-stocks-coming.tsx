/**
 * 온체인 주식 — 준비 중 패널 (기획서 §온체인 주식).
 * 데이터 원천 연결 전이라 화면을 채우지 않는다. 시세를 흉내 낸 자리표시나
 * 가짜 숫자 대신 "아직 없다"만 크게 말한다 — 추정 금지의 연장이고,
 * 절대 규칙 3(정보 밀도를 낮춘다)에도 맞다.
 * 확정 고지(조회 전용 · 파생상품이며 주식 소유권 아님)는 한 줄로만 남긴다.
 */
export function AnalysisStocksComing() {
  return (
    <section className="mt-8">
      <div className="grid min-h-[420px] place-items-center rounded-xl carved px-6 py-16 text-center">
        <div>
          <p className="font-serif text-[42px] font-bold leading-none tracking-tight text-accent/85">
            준비 중
          </p>
          <p className="mx-auto mt-5 max-w-[420px] text-[13px] leading-relaxed text-ink-3">
            온체인 주식 시세를 조회 전용으로 보여드릴 예정입니다.
          </p>
        </div>
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
        · 여기 표시될 가격은 파생상품 시세이며 주식 소유권이 아닙니다. 시세와
        포지션을 읽기만 하는 조회 전용 보드입니다.
      </p>
    </section>
  );
}
