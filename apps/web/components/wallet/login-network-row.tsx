"use client";

import { giwaChain } from "@giwa/config";

/* 네트워크 상태 행 — 로그인 모달의 연결 전/후 패널이 공유 */
export function NetworkRow({
  onGiwa,
  pending,
  onSwitch,
}: {
  onGiwa: boolean;
  pending: boolean;
  onSwitch: () => void;
}) {
  return (
    <div className="mt-3.5 flex min-h-[42px] items-center justify-between rounded-lg border border-hairline bg-black/20 px-3 py-2">
      <span className="text-[12px] text-ink-3">네트워크</span>
      {onGiwa ? (
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-good">
          <span aria-hidden className="size-1.5 rounded-full bg-good" />
          {giwaChain.name} 연결됨
        </span>
      ) : pending ? (
        <span className="text-[12px] text-ink-3">지갑에서 확인해 주세요…</span>
      ) : (
        <button
          type="button"
          onClick={onSwitch}
          className="rounded-md border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11.5px] font-medium text-accent transition-colors hover:bg-accent/20"
        >
          {giwaChain.name} 추가·전환
        </button>
      )}
    </div>
  );
}
