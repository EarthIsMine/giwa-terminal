"use client";

import { useEffect, useRef } from "react";

/**
 * active 로 바뀔 때 대상 요소에 포커스를 준다 - 모달 열림 시 닫기 버튼
 * 포커스 이동(접근성 관례)용. 반환된 ref 를 대상 요소에 단다.
 */
export function useAutoFocus<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (active) ref.current?.focus();
  }, [active]);
  return ref;
}
