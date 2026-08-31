"use client";

import { useEffect, useRef } from "react";

/**
 * 마운트 시 즉시 1회 + ms 간격으로 load 를 반복 실행한다.
 * load 는 isCancelled() 로 언마운트 후 setState 를 막고,
 * ref 로 최신 클로저를 유지하므로 인라인 함수를 넘겨도 인터벌이 재생성되지 않는다.
 *
 * ms 가 null 이면 타이머를 아예 걸지 않는다 - 훅 규칙상 조기 반환보다 위에
 * 놓일 수밖에 없는 호출부(로그인 전 화면 등)가 빈 틱을 돌리지 않게 하는 스위치.
 *
 * 이전 틱의 load 가 안 끝났으면 그 틱은 건너뛴다 - 짧은 주기(1초 시세 폴)에서
 * 응답이 주기를 넘길 때 요청이 무한 적체되고, 늦게 도착한 옛 응답이 새 값을
 * 덮어써 표시가 뒤로 튀는 것을 막는다. 동시 요청이 1개뿐이면 순서 역전이 없다.
 */
export function usePoll(
  load: (isCancelled: () => boolean) => Promise<void> | void,
  ms: number | null,
) {
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (ms === null) return;
    let cancelled = false;
    let inFlight = false;
    const run = () => {
      if (inFlight) return;
      inFlight = true;
      void Promise.resolve(loadRef.current(() => cancelled)).finally(() => {
        inFlight = false;
      });
    };
    run();
    const timer = setInterval(run, ms);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [ms]);
}
