import Link from "next/link";

/**
 * NFT — 준비 중 패널.
 * 온체인 주식 패널(analysis-stocks-coming)과 같은 문법으로 쓴다: 데이터 원천이
 * 붙기 전에는 화면을 채우지 않는다. 가짜 컬렉션·자리표시 시세 대신 "아직 없다"만
 * 크게 말한다 (추정 금지의 연장, 절대 규칙 3).
 *
 * 빈손으로 돌려보내지는 않는다 — 지금 볼 수 있는 화면(토큰 목록)으로 나가는
 * 길을 하나 둔다. 여기까지 온 사람은 볼 게 있어서 온 사람이다.
 */
export function NftComing() {
  return (
    <section className="mt-8">
      <div className="grid min-h-[420px] place-items-center rounded-xl carved px-6 py-16 text-center">
        <div>
          <p className="font-serif text-[42px] font-bold leading-none tracking-tight text-accent/85">
            준비 중
          </p>
          <p className="mx-auto mt-5 max-w-[420px] text-[13px] leading-relaxed text-ink-3">
            나루만의 NFT를 준비하고 있습니다.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg border border-hairline px-4 py-2 text-[13px] text-ink-2 transition-colors hover:text-ink"
          >
            토큰 목록 보기
          </Link>
        </div>
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
        · 열리는 시점은 정해지지 않았습니다. 표시 대상은 다른 화면과 마찬가지로
        신원 검증을 통과한 자산으로 한정됩니다.
      </p>
    </section>
  );
}
