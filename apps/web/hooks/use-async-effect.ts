"use client";

import { useEffect } from "react";

/**
 * cancelled 플래그가 내장된 비동기 effect — 언마운트·의존성 변경 이후의
 * setState 를 막는 공통 패턴. effect 본문은 await 뒤마다 isCancelled() 로
 * 취소 여부를 확인하고 상태 갱신을 건너뛴다.
 */
export function useAsyncEffect(
  effect: (isCancelled: () => boolean) => Promise<void>,
  deps: readonly unknown[],
) {
  useEffect(() => {
    let cancelled = false;
    void effect(() => cancelled);
    return () => {
      cancelled = true;
    };
    // effect 함수 자체는 의존성이 아니다 — 호출부는 deps 로만 재실행을 제어한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
