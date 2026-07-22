import { explorerTxUrl } from "@giwa/config";
import { formatEth, formatKrwCompact, wei, weiToDisplayKrw } from "@giwa/shared";
import type { WeiAmount } from "@giwa/shared";
import type { TradeWire } from "@/lib/indexer";

/**
 * 체결 내역 — 인덱서 trades 원장 (매 스왑 = 한 건).
 * 원화는 환산 표시(절대 규칙 1), 실패 시 ETH 폴백.
 * 헤더행은 인두 띠·행 구분은 검은 홈줄 — 보드 테이블과 같은 문법.
 */

/** 체결 시각 — 업저씨 기준 KST 고정 표기 (서버 렌더라 뷰어 tz 를 모른다) */
function formatKst(ts: number): string {
  const d = new Date((ts + 9 * 3_600) * 1_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCMonth() + 1)}.${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

export function TradeHistory({
  trades,
  symbol,
  ethKrw,
}: {
  trades: TradeWire[];
  symbol: string;
  ethKrw: bigint | null;
}) {
  const money = (v: string): string => {
    const amount = wei(BigInt(v)) as WeiAmount;
    return ethKrw
      ? `${formatKrwCompact(weiToDisplayKrw(amount, ethKrw))}원`
      : `${formatEth(amount, 6)} ETH`;
  };

  return (
    <section className="overflow-hidden rounded-xl carved">
      <div className="flex items-baseline justify-between px-6 pb-3 pt-5">
        <h2 className="text-[15px] font-semibold">체결 내역</h2>
        <span className="text-[11px] text-ink-3">
          최근 {trades.length}건 · KST · 테스트넷 시드 데이터
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <caption className="sr-only">
            {symbol} 최근 체결 내역 — 시간, 구분, 체결가, 수량, 체결액
          </caption>
          <thead>
            <tr className="border-y border-black/45 bg-[#120c06]/[0.97] text-[10.5px] font-medium tracking-[0.1em] text-ink-3">
              <th scope="col" className="py-2 pl-6 pr-3">
                시간
              </th>
              <th scope="col" className="px-3 py-2">
                구분
              </th>
              <th scope="col" className="px-3 py-2 text-right">
                체결가
              </th>
              <th scope="col" className="px-3 py-2 text-right">
                수량({symbol})
              </th>
              <th scope="col" className="px-3 py-2 text-right">
                체결액
              </th>
              <th scope="col" className="py-2 pl-3 pr-6 text-right">
                내역
              </th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => (
              <tr
                key={t.id}
                className="border-b border-black/30 text-[12.5px] last:border-0"
              >
                <td className="py-2 pl-6 pr-3 font-mono text-[11.5px] tabular-nums text-ink-3">
                  {formatKst(t.timestamp)}
                </td>
                <td
                  className={`px-3 py-2 font-medium ${t.side === "buy" ? "text-up" : "text-down"}`}
                >
                  {t.side === "buy" ? "매수" : "매도"}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {money(t.priceWei)}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {formatEth(wei(BigInt(t.tokenAmount)) as WeiAmount, 2)}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {money(t.wethAmount)}
                </td>
                <td className="py-2 pl-3 pr-6 text-right">
                  <a
                    href={explorerTxUrl(t.txHash)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="익스플로러에서 트랜잭션 보기"
                    className="text-[11px] text-ink-3 transition-colors hover:text-accent"
                  >
                    ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
