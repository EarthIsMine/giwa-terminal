"use client";

import { createPortal } from "react-dom";
import { useAutoFocus } from "@/hooks/use-auto-focus";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { GuideContent } from "@/components/guide/guide-content";

/**
 * 온보딩 가이드 오버레이 — 어느 화면에서든 이탈 없이 열어보는 X 닫기 방식.
 * 로그인 모달과 같은 관례: body 포털 + ESC + 백드롭 클릭 닫기.
 */
export function GuideOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const closeRef = useAutoFocus<HTMLButtonElement>(open);
  useEscapeKey(open, onClose);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="가이드 닫기"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="처음 건너오는 길 · 온보딩 가이드"
        className="absolute left-1/2 top-1/2 flex max-h-[85vh] w-[680px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-hairline bg-[#1d140c] shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
      >
        <div className="flex items-start justify-between border-b border-black/40 px-6 py-5">
          <div>
            <h2 className="font-serif text-[19px] font-bold tracking-tight">
              처음 건너오는 길
            </h2>
            <p className="mt-1 text-[12px] text-ink-3">
              업비트 출금부터 첫 거래까지 네 단계 · 비용과 대기 시간 안내
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded-lg border border-hairline text-ink-3 transition-colors hover:border-ink-3/40 hover:text-ink-2"
          >
            <svg
              viewBox="0 0 12 12"
              width={11}
              height={11}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">
          <GuideContent />
        </div>
      </div>
    </div>,
    document.body,
  );
}
