"use client";

/**
 * 전역 에러 폴백 — RPC·인덱서 히컵으로 렌더가 실패해도
 * 원시 500 대신 브랜드 화면 + 재시도를 보여준다 (시연 방어).
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid min-h-[70vh] place-items-center px-6">
      <div className="max-w-[380px] text-center">
        <p className="font-serif text-[22px] font-bold text-ink">
          잠시 물이 흔들렸습니다
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-3">
          온체인 데이터를 불러오는 중 문제가 생겼습니다. 테스트넷 RPC가
          일시적으로 응답하지 않을 수 있습니다 — 잠시 후 다시 시도해 주세요.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-lg bg-accent px-5 py-2 text-[13px] font-semibold text-accent-ink transition-opacity hover:opacity-90"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
