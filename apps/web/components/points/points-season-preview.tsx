import { displayKrw, formatCount, formatKrw } from "@giwa/shared";
import {
  PREVIEW_EVENTS,
  PREVIEW_SNAPSHOT,
  type ListingEventPreview,
} from "@/lib/points-preview";

/**
 * 시즌 0 화면 시안 — 적립·문턱·배분 루프가 열렸을 때의 모습.
 *
 * 값은 전부 예시다. 라벨을 지우고 쓰면 안 된다: 이 제품은 테스트넷 시드 거래조차
 * 화면에 명시하는 원칙(절대 규칙 5) 위에 서 있고, 심사에서 실적립으로 오인되는
 * 순간 그 원칙이 통째로 의심받는다. 그래서 감추는 대신 "시안"이라고 크게 말하고
 * 보여준다 — 빈 자리표시보다 제품 의도가 훨씬 잘 전달된다.
 *
 * 카피 규칙: 수익·보상 보장 표현 금지 (절대 규칙 2). 기대이익을 암시하는
 * "무료 배분" 류도 쓰지 않는다.
 */

function EventCard({ event }: { event: ListingEventPreview }) {
  // 내 점수가 문턱의 어디쯤인지 — 넘었으면 가득 찬다
  const ratio = Math.min(1, PREVIEW_SNAPSHOT.total / event.threshold);
  const reached = PREVIEW_SNAPSHOT.total >= event.threshold;

  /*
   * 커뮤니티 스프레드시트가 하던 계산을 화면이 대신 한다:
   * 한 지갑 몫 = 배분 물량 ÷ 지금 문턱 넘은 지갑 수 (균등·확정형이라 나눗셈 하나).
   * 원화는 상장가 기준 환산 참고값 — "수익"이라는 말은 쓰지 않는다 (§4.4).
   */
  const shareTokens = Math.floor(event.allocationTokens / event.qualified);
  const shareKrw = displayKrw(
    BigInt(shareTokens) * BigInt(event.listPriceKrwMilli),
  );
  const listPrice = displayKrw(BigInt(event.listPriceKrwMilli));

  return (
    <li className="rounded-lg bg-black/20 px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="flex items-baseline gap-2">
          <span className="text-[14.5px] font-bold">{event.nameKo}</span>
          <span className="font-mono text-[10.5px] tracking-[0.08em] text-ink-3">
            {event.symbol}
          </span>
          <span className="text-[11.5px] text-ink-3">{event.issuerName}</span>
        </span>
        <span className="font-mono text-[11.5px] tabular-nums text-ink-3">
          {event.closesIn}
        </span>
      </div>

      <div className="mt-3 flex items-baseline justify-between text-[12px]">
        <span className="text-ink-3">
          참여 문턱{" "}
          <span className="font-mono tabular-nums text-ink-2">
            {formatCount(event.threshold)}점
          </span>
        </span>
        <span className="text-ink-3">
          문턱을 넘긴 지갑{" "}
          <span className="font-mono tabular-nums text-ink-2">
            {formatCount(event.qualified)}
          </span>
        </span>
      </div>

      {/* 내 점수 대비 문턱 — 분석 보드의 지분 막대와 같은 문법(검은 홈 + 한지빛) */}
      <div className="mt-2.5">
        <span
          aria-hidden
          className="block h-[5px] w-full overflow-hidden rounded-full bg-black/55"
        >
          <span
            className="block h-full rounded-full bg-[rgba(199,186,163,0.72)]"
            style={{ width: `${ratio * 100}%` }}
          />
        </span>
        <p className="mt-1.5 text-[11.5px] text-ink-3">
          내 점수 {formatCount(PREVIEW_SNAPSHOT.total)}점 ·{" "}
          {reached
            ? "문턱을 넘었습니다"
            : `${formatCount(event.threshold - PREVIEW_SNAPSHOT.total)}점 남았습니다`}
        </p>
      </div>

      {/* 몫 계산 — 답(받는 수량)이 이 카드에서 가장 큰 숫자여야 한다 */}
      <div className="mt-3 rounded-md bg-black/25 px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="text-[11.5px] text-ink-3">
            지금 참여 지갑 기준 · 한 지갑 몫
          </span>
          <span className="text-[11px] text-ink-3">
            배분 물량 {formatCount(event.allocationTokens)} {event.symbol}
          </span>
        </div>
        <p className="mt-1.5 font-mono text-[19px] font-semibold tabular-nums leading-none">
          {formatCount(shareTokens)}
          <span className="ml-1 font-sans text-[11.5px] font-normal text-ink-3">
            {event.symbol}
          </span>
          <span className="ml-3 text-[14px] font-medium text-ink-2">
            ≈ ₩{formatKrw(shareKrw)}
          </span>
          <span className="ml-1.5 font-sans text-[11px] font-normal text-ink-3">
            상장가 ₩{formatKrw(listPrice)} 환산 참고
          </span>
        </p>
      </div>
    </li>
  );
}

export function PointsSeasonPreview() {
  return (
    <div className="rounded-xl carved p-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h2 className="text-[15px] font-semibold">다가오는 상장 이벤트</h2>
        {/* 라벨은 섹션 첫 줄에 둔다 — 스크롤 중에 숫자만 눈에 들어오는 일을 막는다 */}
        <span className="rounded border border-hairline px-1.5 py-0.5 text-[10.5px] tracking-[0.06em] text-ink-3">
          화면 시안 · 예시 값
        </span>
      </div>

      <p className="mt-2 max-w-[640px] text-[12.5px] leading-relaxed text-ink-3">
        시즌 0이 열리면 이 자리에 실제 상장 이벤트가 들어옵니다. 아래는 그때의
        화면 구성을 보여주기 위한 예시이며, 실제 적립 기록이 아닙니다.
      </p>

      <dl className="mt-4 flex flex-wrap gap-2.5">
        <div className="min-w-[132px] rounded-lg bg-black/20 px-4 py-3">
          <dt className="text-[11px] tracking-[0.1em] text-ink-3">내 점수</dt>
          <dd className="mt-1 font-mono text-[20px] font-semibold leading-none">
            {formatCount(PREVIEW_SNAPSHOT.total)}
            <span className="ml-1 font-sans text-[11px] font-normal text-ink-3">
              점
            </span>
          </dd>
        </div>
        <div className="min-w-[132px] rounded-lg bg-black/20 px-4 py-3">
          <dt className="text-[11px] tracking-[0.1em] text-ink-3">참여 지갑 중</dt>
          <dd className="mt-1 font-mono text-[20px] font-semibold leading-none">
            상위 {PREVIEW_SNAPSHOT.percentile}
            <span className="ml-0.5 font-sans text-[11px] font-normal text-ink-3">
              %
            </span>
          </dd>
        </div>
        <div className="min-w-[132px] rounded-lg bg-black/20 px-4 py-3">
          <dt className="text-[11px] tracking-[0.1em] text-ink-3">곧 소멸</dt>
          <dd className="mt-1 font-mono text-[20px] font-semibold leading-none">
            {formatCount(PREVIEW_SNAPSHOT.expiring)}
            <span className="ml-1 font-sans text-[11px] font-normal text-ink-3">
              점
            </span>
          </dd>
          <p className="mt-1.5 text-[10.5px] text-ink-3">
            {PREVIEW_SNAPSHOT.expiringInDays}일 뒤 · 15일 롤링
          </p>
        </div>
      </dl>

      <ul className="mt-4 flex flex-col gap-2.5">
        {PREVIEW_EVENTS.map((e) => (
          <EventCard key={e.symbol} event={e} />
        ))}
      </ul>

      {/* 몫 계산의 전제 — 계산기를 줬으면 산식과 한계도 같이 준다 */}
      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
        · 한 지갑 몫 = 배분 물량 ÷ 참여 확정 지갑 수. 몫은 마감 시점의 지갑
        수로 확정되며, 위 숫자는 그때까지 변합니다.
        <br />· 원화는 상장 시작 가격 기준 환산 참고값입니다. 상장 후 가격은
        변동하며, 배분 참여는 투자 권유가 아닙니다.
      </p>
    </div>
  );
}
