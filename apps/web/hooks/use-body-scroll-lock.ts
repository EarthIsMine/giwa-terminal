"use client";

import { useEffect } from "react";

/** active 동안 body 스크롤을 잠근다 — 전면 모달 관례 */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [active]);
}
