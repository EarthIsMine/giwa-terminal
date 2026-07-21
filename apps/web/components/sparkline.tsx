"use client";

import { useId } from "react";

const W = 124;
const DEFAULT_H = 32;
const PAD = 2.5;

/**
 * 테이블 행 스파크라인 — 16포인트 가격 추이.
 * 색 관례(팀 결정): 상승 초록 / 하락 빨강 / 보합 회색.
 * 방향은 색 외에 변동 컬럼의 +/- 부호로도 전달된다(색맹 보조 인코딩).
 * 글로우 없이 얇고 또렷하게 — 영역 그라데이션만 깐다.
 */
export function Sparkline({
  points,
  changeBps,
  label,
  height = DEFAULT_H,
}: {
  points: readonly number[];
  changeBps: number;
  label: string;
  height?: number;
}) {
  const H = height;
  const gradientId = useId();

  if (points.length < 2) return null;

  let min = Infinity;
  let max = -Infinity;
  for (const p of points) {
    if (p < min) min = p;
    if (p > max) max = p;
  }

  // 보합권 자산의 미세한 움직임이 풀 높이로 과장되지 않도록
  // 최소 표시 범위(평균의 2%)를 강제한다 — 변동이 작으면 잔잔하게 보인다.
  const mean = (min + max) / 2;
  const minRange = Math.max(Math.abs(mean) * 0.02, 1e-9);
  let lo = min;
  let hi = max;
  if (hi - lo < minRange) {
    lo = mean - minRange / 2;
    hi = mean + minRange / 2;
  }
  const range = hi - lo;

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * (W - PAD * 2) + PAD;
    const t = (p - lo) / range;
    const y = (1 - t) * (H - PAD * 2) + PAD;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const line = `M${coords.join(" L")}`;
  const area = `${line} L${(W - PAD).toFixed(1)},${H} L${PAD},${H} Z`;

  const colorClass =
    changeBps > 0 ? "text-up" : changeBps < 0 ? "text-down" : "text-ink-3";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      role="img"
      aria-label={label}
      className={colorClass}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
