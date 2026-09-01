import { feeFromVolume } from "@giwa/shared";
import {
  formatAmount,
  formatDateKo,
  formatSigned,
  toChartNumber,
  tooltipEdge,
} from "@/components/analysis/flow-format";
import {
  CumulativeFees,
  HourlyVolume,
  NetflowRanking,
  ShareBars,
  type FeePoint,
  type RankRow,
  type ShareRow,
} from "@/components/analysis/naru-flow-charts";
import type { CandleWire, FlowCandlesWire } from "@/lib/indexer";
import type { LiveAssetWire } from "@/lib/onchain";

/**
 * 나루 거래 흐름 - 분석 [토큰] 탭의 본문 (지표 정의 §나루 전체 집계).
 *
 * 나루에 상장된 검증 자산 전체의 체결 흐름이다. 목록을 다시 세우지 않는다 -
 * 토큰 화면과 같은 표를 열만 바꿔 보여주면 분석이 아니라 목록 2가 된다.
 * 시계열·랭킹·구성비 그래프가 주인공이다.
 *
 * 산식은 전부 인덱서 캔들 합산 - 요청 시점에 체결 원장을 스캔하지 않는다.
 * 흐름 차트(거래대금·순유입·랭킹·시간대)는 진행 중인 오늘(UTC)을 제외한
 * 최근 30일 윈도우, 누적 총수수료만 lifetime(§총수수료와 같은 규칙)이다.
 * 예치 규모 구성은 온체인 스냅샷이라 인덱서 없이도 그려진다.
 * 차트 렌더는 chain-activity-chart 와 같은 문법: 서버 렌더 + CSS group-hover.
 */

const W = 600;
const H = 160;
const DAY = 86_400;
/** 구성비 막대 상한 - 절제 (절대 규칙 3). 나머지는 한 줄로 합산한다 */
const SHARE_ROWS = 8;
/** 순유입 랭킹의 상·하위 표시 수 */
const RANK_EDGE = 4;

interface DayPoint {
  /** UTC 버킷 시작 unix 초 */
  bucket: number;
  date: string;
  volume: bigint;
  /** 순유입(매수-매도). 방향별 볼륨이 없는 구버전 응답이면 null */
  net: bigint | null;
}

/**
 * 최근 30일(완결일) 일별 합산. 첫 체결이 있는 날부터 그린다 - 백필 중인
 * 인덱서의 과거 구간을 "체결 0"으로 채우면 무거래와 랙이 구분되지 않는다.
 */
function buildDaily(daily: Record<string, CandleWire[]>): DayPoint[] {
  const todayStart = Math.floor(Date.now() / 1000 / DAY) * DAY;
  const windowStart = todayStart - 30 * DAY;

  const byBucket = new Map<
    number,
    { volume: bigint; buy: bigint; sell: bigint; hasDirection: boolean }
  >();
  for (const candles of Object.values(daily)) {
    for (const c of candles) {
      if (c.bucket < windowStart || c.bucket >= todayStart) continue;
      const cur = byBucket.get(c.bucket) ?? {
        volume: 0n,
        buy: 0n,
        sell: 0n,
        hasDirection: true,
      };
      cur.volume += BigInt(c.volumeWeth);
      if (c.buyVolumeWeth !== undefined && c.sellVolumeWeth !== undefined) {
        cur.buy += BigInt(c.buyVolumeWeth);
        cur.sell += BigInt(c.sellVolumeWeth);
      } else {
        cur.hasDirection = false;
      }
      byBucket.set(c.bucket, cur);
    }
  }
  if (byBucket.size === 0) return [];

  const firstActive = Math.min(...byBucket.keys());
  // 한 캔들이라도 방향이 빠지면 순유입 전체를 감춘다 - 부분 합을 전체처럼 안 보여준다
  const directionOk = [...byBucket.values()].every((b) => b.hasDirection);

  const days: DayPoint[] = [];
  for (let b = firstActive; b < todayStart; b += DAY) {
    const agg = byBucket.get(b);
    days.push({
      bucket: b,
      date: new Date(b * 1000).toISOString().slice(0, 10),
      volume: agg?.volume ?? 0n,
      net: directionOk ? (agg ? agg.buy - agg.sell : 0n) : null,
    });
  }
  return days;
}

/** 항목 목록 → 구성비 행 (상위 N + "그 외" 합산). 값 0 이하는 뺀다 */
function buildShareRows(
  items: { key: string; label: string; sub: string | null; value: bigint }[],
): ShareRow[] {
  const positive = items
    .filter((it) => it.value > 0n)
    .sort((a, b) => (a.value < b.value ? 1 : a.value > b.value ? -1 : 0));
  const total = positive.reduce((acc, it) => acc + it.value, 0n);
  if (total === 0n) return [];
  const permille = (v: bigint) => Number((v * 1000n) / total);

  const head: ShareRow[] = positive.slice(0, SHARE_ROWS).map((it) => ({
    key: it.key,
    label: it.label,
    sub: it.sub,
    value: it.value,
    permille: permille(it.value),
  }));
  const rest = positive.slice(SHARE_ROWS);
  if (rest.length > 0) {
    const restSum = rest.reduce((acc, it) => acc + it.value, 0n);
    head.push({
      key: "rest",
      label: `그 외 ${rest.length}종`,
      sub: null,
      value: restSum,
      permille: permille(restSum),
    });
  }
  return head;
}

/** 자산별 윈도우 합 - 거래대금(volume)과 순유입(net)을 한 번에 낸다 */
function sumByAsset(
  assets: LiveAssetWire[],
  daily: Record<string, CandleWire[]>,
  days: DayPoint[],
): { asset: LiveAssetWire; volume: bigint; net: bigint | null }[] {
  const first = days[0]?.bucket;
  const last = days[days.length - 1]?.bucket;
  if (first === undefined || last === undefined) return [];

  return assets.map((a) => {
    const candles = daily[a.pair.toLowerCase()] ?? [];
    let volume = 0n;
    let net: bigint | null = 0n;
    for (const c of candles) {
      if (c.bucket < first || c.bucket > last) continue;
      volume += BigInt(c.volumeWeth);
      if (
        net !== null &&
        c.buyVolumeWeth !== undefined &&
        c.sellVolumeWeth !== undefined
      ) {
        net += BigInt(c.buyVolumeWeth) - BigInt(c.sellVolumeWeth);
      } else {
        net = null;
      }
    }
    return { asset: a, volume, net };
  });
}

/** 순유입 상·하위 랭킹 행 - 체결 있는 자산만, 상·하위 RANK_EDGE 씩 + 생략 표시 */
function buildRanking(
  sums: { asset: LiveAssetWire; volume: bigint; net: bigint | null }[],
): RankRow[] {
  const traded = sums.filter((s) => s.volume > 0n && s.net !== null);
  if (traded.length === 0) return [];
  const sorted = [...traded].sort((a, b) => {
    const an = a.net ?? 0n;
    const bn = b.net ?? 0n;
    return an < bn ? 1 : an > bn ? -1 : 0;
  });
  const toRow = (s: (typeof sorted)[number]): RankRow => ({
    kind: "asset",
    key: s.asset.address,
    label: s.asset.nameKo,
    sub: s.asset.symbol,
    net: s.net ?? 0n,
  });
  if (sorted.length <= RANK_EDGE * 2) return sorted.map(toRow);
  return [
    ...sorted.slice(0, RANK_EDGE).map(toRow),
    { kind: "gap", key: "gap", hidden: sorted.length - RANK_EDGE * 2 },
    ...sorted.slice(-RANK_EDGE).map(toRow),
  ];
}

/** 시간대별(KST) 거래대금 - 1h 캔들을 시각대로 접는다. 윈도우는 흐름 차트와 동일 */
function buildHourly(hourly: Record<string, CandleWire[]>): bigint[] {
  const todayStart = Math.floor(Date.now() / 1000 / DAY) * DAY;
  const windowStart = todayStart - 30 * DAY;
  const hours: bigint[] = Array.from({ length: 24 }, () => 0n);
  for (const candles of Object.values(hourly)) {
    for (const c of candles) {
      if (c.bucket < windowStart || c.bucket >= todayStart) continue;
      const kstHour = (Math.floor(c.bucket / 3600) + 9) % 24;
      hours[kstHour] = (hours[kstHour] ?? 0n) + BigInt(c.volumeWeth);
    }
  }
  return hours;
}

/**
 * 누적 총수수료 - lifetime 이라 윈도우를 안 탄다 (§총수수료).
 * 일별 누적 거래대금에 feeFromVolume 을 적용해 총수수료 컬럼과 같은 산식을 쓴다.
 * 체결 없는 날은 수평 구간 - 누적 곡선의 정직한 표현이다.
 */
function buildFeeSeries(daily: Record<string, CandleWire[]>): FeePoint[] {
  const todayStart = Math.floor(Date.now() / 1000 / DAY) * DAY;
  const byBucket = new Map<number, bigint>();
  for (const candles of Object.values(daily)) {
    for (const c of candles) {
      if (c.bucket >= todayStart) continue;
      byBucket.set(c.bucket, (byBucket.get(c.bucket) ?? 0n) + BigInt(c.volumeWeth));
    }
  }
  if (byBucket.size === 0) return [];
  const firstActive = Math.min(...byBucket.keys());

  const points: FeePoint[] = [];
  let cum = 0n;
  for (let b = firstActive; b < todayStart; b += DAY) {
    cum += byBucket.get(b) ?? 0n;
    points.push({
      date: new Date(b * 1000).toISOString().slice(0, 10),
      fee: feeFromVolume(cum),
    });
  }
  return points;
}

function VolumeChart({
  days,
  ethKrw,
}: {
  days: DayPoint[];
  ethKrw: bigint | null;
}) {
  const max = days.reduce((m, d) => (d.volume > m ? d.volume : m), 0n);
  if (max === 0n) return null;
  const maxN = toChartNumber(max);

  const points = days.map((d, i) => ({
    x: ((i + 0.5) / days.length) * W,
    y: H - (toChartNumber(d.volume) / maxN) * H,
    pct: (toChartNumber(d.volume) / maxN) * 100,
  }));
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${points[points.length - 1]?.x.toFixed(1)},${H} L${points[0]?.x.toFixed(1)},${H} Z`;

  const first = days[0]?.date ?? "";
  const last = days[days.length - 1]?.date ?? "";

  return (
    <figure className="rounded-xl carved px-6 py-5">
      <figcaption className="text-[11.5px] font-medium tracking-[0.12em] text-ink-3">
        일별 거래대금
      </figcaption>

      <div className="relative mt-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 border-t border-white/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-white/[0.07]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 -translate-y-full pb-0.5 font-mono text-[10px] tabular-nums text-ink-3"
        >
          {formatAmount(max, ethKrw)}
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute right-0 top-1/2 -translate-y-full pb-0.5 font-mono text-[10px] tabular-nums text-ink-3/80"
        >
          {formatAmount(max / 2n, ethKrw)}
        </span>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          aria-hidden
          className="block h-40 w-full text-accent"
        >
          <defs>
            <linearGradient id="naru-volume-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0.32" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#naru-volume-fill)" />
          <path
            d={linePath}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className="opacity-90"
          />
        </svg>

        <div
          role="img"
          aria-label={`${first}부터 ${last}까지 나루 일별 거래대금 추이. 최다 ${formatAmount(max, ethKrw)}.`}
          className="absolute inset-0 flex border-b border-white/15"
        >
          {days.map((d, i) => {
            const p = points[i];
            if (!p) return null;
            return (
              <div key={d.date} className="group relative flex-1">
                <div
                  aria-hidden
                  className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-white/20 group-hover:block"
                />
                <div
                  aria-hidden
                  className="absolute left-1/2 hidden h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-accent bg-[#120c06] group-hover:block"
                  style={{ bottom: `${p.pct}%` }}
                />
                <div
                  className={`pointer-events-none absolute bottom-full z-10 mb-1.5 hidden whitespace-nowrap rounded-md border border-white/10 bg-[#120c06] px-2.5 py-1.5 text-[11px] leading-tight shadow-lg group-hover:block ${tooltipEdge(i, days.length)}`}
                >
                  <span className="text-ink-3">{formatDateKo(d.date)}</span>{" "}
                  <span className="font-mono font-semibold tabular-nums text-ink">
                    {formatAmount(d.volume, ethKrw)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex justify-between font-mono text-[10.5px] tabular-nums text-ink-3">
        <span>{first}</span>
        <span>{last}</span>
      </div>
    </figure>
  );
}

function NetflowChart({
  days,
  ethKrw,
}: {
  days: DayPoint[];
  ethKrw: bigint | null;
}) {
  const nets = days.map((d) => d.net ?? 0n);
  const maxAbs = nets.reduce((m, v) => {
    const abs = v < 0n ? -v : v;
    return abs > m ? abs : m;
  }, 0n);
  if (maxAbs === 0n) return null;
  const maxN = toChartNumber(maxAbs);

  const first = days[0]?.date ?? "";
  const last = days[days.length - 1]?.date ?? "";

  return (
    <figure className="rounded-xl carved px-6 py-5">
      <figcaption className="text-[11.5px] font-medium tracking-[0.12em] text-ink-3">
        일별 순유입
      </figcaption>

      <div className="relative mt-4">
        <span
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 -translate-y-full pb-0.5 font-mono text-[10px] tabular-nums text-up/80"
        >
          {formatSigned(maxAbs, ethKrw)}
        </span>
        {/* 음수 라벨은 차트 안쪽 - 바깥(translate-y-full)에 두면 날짜 행과 겹친다 */}
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0.5 right-0 z-10 font-mono text-[10px] tabular-nums text-down/80"
        >
          {formatSigned(-maxAbs, ethKrw)}
        </span>

        <div
          role="img"
          aria-label={`${first}부터 ${last}까지 나루 일별 순유입. 양수는 순매수, 음수는 순매도 우위.`}
          className="relative flex h-40 items-stretch gap-px"
        >
          {/* 0 기준선 - 위는 순매수(초록), 아래는 순매도(빨강). 상승/하락 색 관례 재사용 */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-white/15"
          />
          {days.map((d, i) => {
            const net = d.net ?? 0n;
            const h = (Math.abs(toChartNumber(net)) / maxN) * 50;
            return (
              <div key={d.date} className="group relative flex-1">
                <div
                  aria-hidden
                  className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-white/20 group-hover:block"
                />
                {net !== 0n ? (
                  <div
                    aria-hidden
                    className={`absolute inset-x-[15%] rounded-[1px] ${
                      net > 0n
                        ? "bottom-1/2 bg-up/70 group-hover:bg-up"
                        : "top-1/2 bg-down/70 group-hover:bg-down"
                    }`}
                    style={{ height: `${h}%` }}
                  />
                ) : null}
                <div
                  className={`pointer-events-none absolute bottom-full z-10 mb-1.5 hidden whitespace-nowrap rounded-md border border-white/10 bg-[#120c06] px-2.5 py-1.5 text-[11px] leading-tight shadow-lg group-hover:block ${tooltipEdge(i, days.length)}`}
                >
                  <span className="text-ink-3">{formatDateKo(d.date)}</span>{" "}
                  <span
                    className={`font-mono font-semibold tabular-nums ${
                      net > 0n ? "text-up" : net < 0n ? "text-down" : "text-ink"
                    }`}
                  >
                    {formatSigned(net, ethKrw)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex justify-between font-mono text-[10.5px] tabular-nums text-ink-3">
        <span>{first}</span>
        <span>{last}</span>
      </div>
    </figure>
  );
}

export function NaruFlow({
  assets,
  candles,
  ethKrw,
}: {
  assets: LiveAssetWire[];
  candles: FlowCandlesWire | null;
  ethKrw: bigint | null;
}) {
  const days = candles ? buildDaily(candles.daily) : [];
  const sums = candles ? sumByAsset(assets, candles.daily, days) : [];
  const volumeShares = buildShareRows(
    sums.map((s) => ({
      key: s.asset.address,
      label: s.asset.nameKo,
      sub: s.asset.symbol,
      value: s.volume,
    })),
  );
  const ranking = buildRanking(sums);
  const hourly = candles ? buildHourly(candles.hourly) : [];
  const feeSeries = candles ? buildFeeSeries(candles.daily) : [];
  // 예치 규모 구성은 온체인 스냅샷 - 인덱서가 없어도 그린다
  const liquidityShares = buildShareRows(
    assets.map((a) => ({
      key: a.address,
      label: a.nameKo,
      sub: a.symbol,
      value: BigInt(a.liquidityWei),
    })),
  );

  // 이틀치도 안 되면 "흐름"이라 할 게 없다
  const hasSeries = days.length >= 2;
  const hasNet = hasSeries && days.every((d) => d.net !== null);
  const hasHourly = hourly.some((v) => v > 0n);

  return (
    // 상단 여백 없음 - 토큰 탭 패널(analysis-tabs)이 간격을 쥔다
    <section>
      <h2 className="text-[15px] font-semibold">나루 거래 흐름</h2>
      {/* 폭 제한 없음 - 데스크톱에서 한 줄로 떨어지게 (두 줄 리드는 답답하다는 피드백) */}
      <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
        나루에 상장된 검증 자산 전체의 체결 흐름입니다. 진행 중인 오늘(UTC)을
        제외한 최근 30일 집계이며, 누적 총수수료만 전체 누적입니다.
      </p>

      {candles === null ? (
        <>
          <div className="mt-5 rounded-xl carved px-6 py-8 text-center text-[13px] text-ink-3">
            나루 인덱서 집계가 준비되면 제공됩니다. 거래대금·순유입·시간대
            분포·누적 총수수료는 인덱서가 체결 기록을 모두 읽은 뒤 채워집니다.
          </div>
          {liquidityShares.length > 0 ? (
            <div className="mt-2.5">
              <ShareBars
                title="예치 규모 구성"
                shares={liquidityShares}
                ethKrw={ethKrw}
              />
            </div>
          ) : null}
        </>
      ) : !hasSeries && volumeShares.length === 0 ? (
        <>
          <div className="mt-5 rounded-xl carved px-6 py-8 text-center text-[13px] text-ink-3">
            최근 30일 체결이 없습니다.
          </div>
          {liquidityShares.length > 0 ? (
            <div className="mt-2.5">
              <ShareBars
                title="예치 규모 구성"
                shares={liquidityShares}
                ethKrw={ethKrw}
              />
            </div>
          ) : null}
        </>
      ) : (
        <>
          {hasSeries ? (
            <div
              className={`mt-5 grid gap-2.5 ${hasNet ? "lg:grid-cols-2" : ""}`}
            >
              <VolumeChart days={days} ethKrw={ethKrw} />
              {hasNet ? <NetflowChart days={days} ethKrw={ethKrw} /> : null}
            </div>
          ) : null}

          {ranking.length > 0 || hasHourly ? (
            <div className="mt-2.5 grid gap-2.5 lg:grid-cols-2">
              {ranking.length > 0 ? (
                <NetflowRanking rows={ranking} ethKrw={ethKrw} />
              ) : null}
              {hasHourly ? (
                <HourlyVolume hours={hourly} ethKrw={ethKrw} />
              ) : null}
            </div>
          ) : null}

          <div className="mt-2.5 grid gap-2.5 lg:grid-cols-2">
            <ShareBars
              title="자산별 거래대금 비중"
              shares={volumeShares}
              ethKrw={ethKrw}
            />
            <ShareBars
              title="예치 규모 구성"
              shares={liquidityShares}
              ethKrw={ethKrw}
            />
          </div>

          {feeSeries.length >= 2 ? (
            <div className="mt-2.5">
              <CumulativeFees points={feeSeries} ethKrw={ethKrw} />
            </div>
          ) : null}

          <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
            거래대금은 매수·매도 체결액의 합, 순유입은 총매수에서 총매도를 뺀
            값입니다. 유동성 공급·회수는 포함하지 않습니다. 누적 총수수료는 전체
            거래대금의 0.3%이며 현행 테스트넷에서는 전액 유동성 공급자
            몫입니다.
            {ethKrw !== null
              ? " 원화는 업비트 KRW-ETH 시세로 환산한 참고값입니다."
              : " 환산 시세 조회에 실패해 ETH 단위로 표시합니다."}
          </p>
        </>
      )}
    </section>
  );
}
