"use client";

import { usePoll } from "@/hooks/use-poll";

/**
 * 내부 JSON API 폴링 - fetch → ok 가드 → 파싱 → 언마운트 가드까지의 공통
 * 스캐폴드를 감싼다 (피드 60초·티커 1초 폴이 같은 모양을 반복해 추출, 중복 2곳 규칙).
 * 실패(네트워크 예외·비 2xx)면 null 을 넘긴다 - 실패를 무시할지 실패 틱으로
 * 셀지는 호출부 정책이다. 언마운트 뒤에는 onResult 를 부르지 않는다.
 * 겹침 방지·ms:null 스위치는 usePoll 이 담당한다.
 */
export function usePollJson<T>(
  url: string,
  ms: number | null,
  onResult: (data: T | null) => void,
) {
  usePoll(async (isCancelled) => {
    let data: T | null = null;
    try {
      const res = await fetch(url);
      if (res.ok) data = (await res.json()) as T;
    } catch {
      /* 네트워크 실패 - null 로 전달 */
    }
    if (isCancelled()) return;
    onResult(data);
  }, ms);
}
