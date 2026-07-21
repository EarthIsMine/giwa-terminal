"use client";

import { useState } from "react";

/** 주소 복사 버튼 — 행 클릭 내비게이션과 겹치지 않게 전파를 끊는다 */
export function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={copied ? "복사됨" : "주소 복사"}
      aria-label={`${address} 주소 복사`}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        void navigator.clipboard.writeText(address).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      className={`transition-colors ${copied ? "text-good" : "text-ink-3 hover:text-ink-2"}`}
    >
      {copied ? (
        <svg
          viewBox="0 0 14 14"
          width={13}
          height={13}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M2.5 7.5l3 3 6-6.5" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 14 14"
          width={13}
          height={13}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="4.5" y="4.5" width="7" height="7" rx="1.4" />
          <path d="M9.5 4.5v-1a1.2 1.2 0 0 0-1.2-1.2h-4A1.8 1.8 0 0 0 2.5 4.1v4.2a1.2 1.2 0 0 0 1.2 1.2h.8" />
        </svg>
      )}
    </button>
  );
}
