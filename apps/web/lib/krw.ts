/**
 * 업비트 KRW-ETH 시세 주입 (지표 정의 §USD/KRW 환산).
 * 업비트 시세를 쓰는 것은 타겟 유저에게 익숙한 숫자를 보여주기 위한 의도적 선택 —
 * 다른 소스로 바꾸지 않는다. 캐시 60초. 실패 시 null → 화면은 원화를 감추고
 * ETH로 폴백한다 (추정치를 확정값처럼 보여주지 않는다).
 */
export async function getEthKrw(): Promise<bigint | null> {
  try {
    const res = await fetch("https://api.upbit.com/v1/ticker?markets=KRW-ETH", {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    if (!Array.isArray(body) || body.length === 0) return null;
    const first: unknown = body[0];
    if (typeof first !== "object" || first === null || !("trade_price" in first)) {
      return null;
    }
    const price = Number((first as { trade_price: unknown }).trade_price);
    if (!Number.isFinite(price) || price <= 0) return null;
    return BigInt(Math.floor(price));
  } catch {
    return null;
  }
}
