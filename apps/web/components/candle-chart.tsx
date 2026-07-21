"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  createChart,
} from "lightweight-charts";
import type { DailyCandle } from "@/lib/seed-detail";

/** 원화 표시는 항상 내림 — 과대 표시 금지 (지표 정의). 차트는 float라 여기서 절사한다 */
function floorTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.floor(v * f) / f;
}

/**
 * 일봉 캔들 + 거래대금 히스토그램.
 * y축은 원화 환산 값 — 차트 카드 헤더에 "원화 환산" 라벨을 항상 함께 띄운다 (절대 규칙 1).
 * 색 관례(팀 결정): 상승 초록 / 하락 빨강.
 */
export function CandleChart({
  candles,
  decimals,
}: {
  candles: readonly DailyCandle[];
  decimals: number;
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
        priceFormatter: (p: number) =>
          `₩${floorTo(p, decimals).toLocaleString("ko-KR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: decimals,
          })}`,
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
        minMove: decimals === 0 ? 1 : decimals === 1 ? 0.1 : 0.01,
      },
    });
    candleSeries.setData(
      candles.map((c) => ({
        time: c.time,
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
        time: c.time,
        value: c.volume,
        color:
          c.close >= c.open
            ? "rgba(31, 169, 113, 0.4)"
            : "rgba(246, 70, 93, 0.4)",
      })),
    );

    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [candles, decimals]);

  return <div ref={ref} className="h-[440px] w-full" />;
}
