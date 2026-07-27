"use client";

import { useEffect, useRef } from "react";

/**
 * 마운트 시 즉시 1회 + ms 간격으로 load 를 반복 실행한다.
 * load 는 isCancelled() 로 언마운트 후 setState 를 막고,
 * ref 로 최신 클로저를 유지하므로 인라인 함수를 넘겨도 인터벌이 재생성되지 않는다.
 */
export function usePoll(
  load: (isCancelled: () => boolean) => Promise<void> | void,
  ms: number,
) {
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let cancelled = false;
    const run = () => void loadRef.current(() => cancelled);
    run();
    const timer = setInterval(run, ms);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [ms]);
}
