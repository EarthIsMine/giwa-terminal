"use client";

import { useSyncExternalStore } from "react";

/**
 * 뷰포트 미디어쿼리 구독 훅.
 * 서버 스냅샷은 false(데스크톱 가정) — 렌더 분기가 아니라 "동작" 분기에만 쓴다.
 * 렌더 자체를 모바일/데스크톱으로 가르는 건 CSS(hidden md:block)가 담당한다
 * — SSR 첫 페인트에서 뷰포트를 알 수 없어 훅으로 가르면 하이드레이션 깜빡임이 생긴다.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Tailwind md(768px) 미만 = 모바일. 모바일 메뉴 자동 닫힘 같은 동작 분기용 */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
