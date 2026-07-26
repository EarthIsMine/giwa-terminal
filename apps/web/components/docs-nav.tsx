"use client";

import { useEffect, useState } from "react";

/**
 * 기술 문서 사이드바 — 스틱키 + IntersectionObserver 스크롤스파이.
 * 레이아웃 레퍼런스: EarthIsMine/Vigil api-docs (사이드바·활성 표시 구조),
 * 색·질감은 나루 세계관 유지.
 */

export interface DocSection {
  id: string;
  title: string;
}

export function DocsNav({ sections }: { sections: DocSection[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const top = visible[0];
        if (top) setActive(top.target.id);
      },
      // 상단 헤더 아래 ~30% 구간에 들어온 섹션을 활성으로 본다
      { rootMargin: "-90px 0px -65% 0px" },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav
      aria-label="문서 목차"
      className="sticky top-24 hidden max-h-[calc(100vh-7rem)] self-start overflow-y-auto lg:block"
    >
      <p className="px-3 text-[11.5px] font-medium tracking-[0.1em] text-ink-3">
        기술 문서
      </p>
      <ul className="mt-2 space-y-0.5">
        {sections.map((s) => {
          const isActive = active === s.id;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById(s.id)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                aria-current={isActive ? "true" : undefined}
                className={`w-full rounded-md border-l-2 px-3 py-1.5 text-left text-[12.5px] transition-colors ${
                  isActive
                    ? "border-accent bg-accent/10 font-medium text-ink"
                    : "border-transparent text-ink-3 hover:text-ink-2"
                }`}
              >
                {s.title}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
