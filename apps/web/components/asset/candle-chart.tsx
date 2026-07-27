"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  createChart,
} from "lightweight-charts";
import type { Time, UTCTimestamp } from "lightweight-charts";

/** 캔들 — 인덱서 candles_1m 롤업(1h/1d)이 이 형태로 들어온다.
 *  time: 일봉은 "yyyy-mm-dd", 시간봉은 UTC unix 초 */
export interface ChartCandle {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number; // quote 환산 거래대금 — currency 단위와 짝
}

/** 시간봉 unix 초는 뷰어 로컬 시간대로 보정한다
 *  (lightweight-charts 는 timestamp 를 UTC 로 그린다 — KST 업저씨 기준 축 표기) */
function toTime(t: string | number): Time {
  return typeof t === "number"
    ? ((t - new Date(t * 1000).getTimezoneOffset() * 60) as UTCTimestamp)
    : (t as Time);
}

/** 원화 표시는 항상 내림 — 과대 표시 금지 (지표 정의). 차트는 float라 여기서 절사한다 */
function floorTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.floor(v * f) / f;
}

/**
 * 캔들 + 거래대금 히스토그램.
 * y축은 원화 환산 값 — 차트 카드 헤더에 "원화 환산" 라벨을 항상 함께 띄운다 (절대 규칙 1).
 * 환율 조회 실패 시 currency="eth" 로 ETH 단위 폴백 (추정치를 확정값처럼 안 보여준다).
 * 색 관례(팀 결정): 상승 초록 / 하락 빨강.
 */
export function CandleChart({
  candles,
  decimals,
  currency = "krw",
}: {
  candles: readonly ChartCandle[];
  decimals: number;
  currency?: "krw" | "eth";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#83765f",
        fontSize: 11,
        fontFamily:
          "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
        // 로고는 거래량 바와 겹쳐서 끈다 — 어트리뷰션은 차트 하단 고지 텍스트로 대체
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(50, 36, 21, 0.55)" },
        horzLines: { color: "rgba(50, 36, 21, 0.55)" },
      },
      rightPriceScale: { borderColor: "#322415" },
      timeScale: { borderColor: "#322415", rightOffset: 2 },
      crosshair: {
        horzLine: { labelBackgroundColor: "#8f6d31" },
        vertLine: { labelBackgroundColor: "#8f6d31" },
      },
      localization: {
        locale: "ko-KR",
        priceFormatter:
          currency === "krw"
            ? (p: number) =>
                `₩${floorTo(p, decimals).toLocaleString("ko-KR", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: decimals,
                })}`
            : (p: number) => floorTo(p, decimals).toFixed(decimals),
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#1fa971",
      downColor: "#f6465d",
      wickUpColor: "#1fa971",
      wickDownColor: "#f6465d",
      borderVisible: false,
      priceFormat: {
        type: "price",
        precision: decimals,
        minMove: 10 ** -decimals,
      },
    });
    candleSeries.setData(
      candles.map((c) => ({
        time: toTime(c.time),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: "",
      priceFormat: { type: "volume" },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.84, bottom: 0 },
    });
    volumeSeries.setData(
      candles.map((c) => ({
        time: toTime(c.time),
        value: c.volume,
        color:
          c.close >= c.open
            ? "rgba(31, 169, 113, 0.4)"
            : "rgba(246, 70, 93, 0.4)",
      })),
    );

    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [candles, decimals, currency]);

  return <div ref={ref} className="h-[440px] w-full" />;
}
