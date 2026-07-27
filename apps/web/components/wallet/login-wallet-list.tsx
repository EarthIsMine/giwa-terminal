"use client";

import type { Eip6963ProviderDetail } from "@/contexts/wallet-context";

/* 설치된 지갑 목록 (EIP-6963) — 하나도 없으면 설치 안내로 폴백 */
export function LoginWalletList({
  wallets,
  connectingRdns,
  onConnect,
}: {
  wallets: readonly Eip6963ProviderDetail[];
  connectingRdns: string | null;
  onConnect: (w: Eip6963ProviderDetail) => void;
}) {
  if (wallets.length === 0) {
    /* 설치된 지갑 없음 */
    return (
      <div className="mt-4 rounded-xl border border-hairline bg-panel px-4 py-4 text-center">
        <p className="text-[13px] text-ink-2">설치된 지갑이 없습니다</p>
        <a
          href="https://metamask.io/download"
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 inline-block text-[12.5px] text-accent transition-[filter] hover:brightness-110"
        >
          메타마스크 설치 ↗
        </a>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {wallets.map((w) => (
        <button
          key={w.info.rdns}
          type="button"
          disabled={connectingRdns !== null}
          onClick={() => onConnect(w)}
          className="w-full rounded-xl border border-hairline bg-panel px-4 py-3 text-left transition-colors hover:bg-panel-2 disabled:opacity-60"
        >
          <span className="flex items-center gap-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={w.info.icon}
              alt=""
              width={24}
              height={24}
              className="rounded-md"
            />
            <span className="flex-1 text-[14px] font-semibold">
              {w.info.name}
            </span>
            <span className="text-[12px] text-ink-3">
              {connectingRdns === w.info.rdns ? "지갑에서 확인 중…" : "연결"}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
