"use client";

import { useEffect, useRef } from "react";

/**
 * active 동안 ESC 키로 onEscape 를 호출한다 - 모달·드로어 공통 관례.
 * 핸들러는 ref 로 최신을 유지해 인라인 함수를 넘겨도 재구독이 일어나지 않는다.
 */
export function useEscapeKey(active: boolean, onEscape: () => void) {
  const handlerRef = useRef(onEscape);
  handlerRef.current = onEscape;

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handlerRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);
}
