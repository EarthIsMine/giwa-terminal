/**
 * 체인 ↔ 나루 사이의 좌표 한 줄.
 *
 * 체인 전체 토큰을 순위표로 늘어놓지 않는다 — 그건 DEX 스캐너가 하는 일이고
 * (절대 규칙 3), 검증하지 않은 자산을 나루 화면에 세우면 "표시 자산은 신원 검증을
 * 통과한 자산으로 한정" 이라는 약속과 정면으로 어긋난다 (절대 규칙 6).
 * 대신 우리가 무엇을 다루고 무엇을 안 다루는지 범위만 밝힌다.
 */
export function AnalysisCoverage({ verifiedCount }: { verifiedCount: number }) {
  return (
    <section className="mt-9 rounded-xl carved px-6 py-5">
      <h2 className="text-[15px] font-semibold">나루가 다루는 범위</h2>
      <p className="mt-2 max-w-[720px] text-[13px] leading-relaxed text-ink-2">
        기와체인에는 나루를 거치지 않은 자산도 있습니다. 나루는 신원 검증을 통과한{" "}
        <strong className="font-semibold text-ink">{verifiedCount}종</strong>만
        목록에 세웁니다. 다른 발행 창구가 열리면 같은 기준을 통과한 자산부터 이
        화면으로 들어옵니다.
      </p>
      <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-3">
        · 검증은 사기 필터이지 투자 보증이 아닙니다. 발행 시점의 신원과 기와체인에 기록된
        안전장치를 확인한 것입니다.
      </p>
    </section>
  );
}
