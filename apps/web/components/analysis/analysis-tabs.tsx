"use client";

import { useState, type ReactNode } from "react";

/**
 * 분석 하위 탭 — 토큰 | 온체인 주식 (5면 구성 §분석 [토큰 · 온체인 주식]).
 * 패널 내용은 서버가 렌더해 슬롯으로 받는다 — 여기는 전환 상태만 쥔다.
 * 두 패널을 모두 DOM 에 두고 hidden 으로 전환한다 (탭 시맨틱 유지).
 */
const TABS = [
  { key: "token", label: "토큰" },
  { key: "stocks", label: "온체인 주식" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function AnalysisTabs({
  token,
  stocks,
}: {
  token: ReactNode;
  stocks: ReactNode;
}) {
  const [active, setActive] = useState<TabKey>("token");
  const panels: Record<TabKey, ReactNode> = { token, stocks };
  return (
    <div className="mt-7">
      <div
        role="tablist"
        aria-label="분석 구분"
        className="flex gap-6 border-b border-black/40"
      >
        {TABS.map((t) => {
          const selected = active === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              type="button"
              id={`analysis-tab-${t.key}`}
              aria-selected={selected}
              aria-controls={`analysis-panel-${t.key}`}
              onClick={() => setActive(t.key)}
              className={
                selected
                  ? "-mb-px border-b-2 border-accent pb-2.5 text-[13.5px] font-medium text-ink"
                  : "-mb-px border-b-2 border-transparent pb-2.5 text-[13.5px] text-ink-3 transition-colors hover:text-ink-2"
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {TABS.map((t) => (
        <div
          key={t.key}
          role="tabpanel"
          id={`analysis-panel-${t.key}`}
          aria-labelledby={`analysis-tab-${t.key}`}
          hidden={active !== t.key}
        >
          {panels[t.key]}
        </div>
      ))}
    </div>
  );
}
