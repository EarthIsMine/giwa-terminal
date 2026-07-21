"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { giwaChain } from "@giwa/config";

/**
 * 로그인 진입점 — 버튼 하나, 방식 선택은 모달에서.
 * 절대 규칙 3: 이메일이 첫 번째 동선(준비 중), 지갑 연결은 보조 동선(실동작).
 *
 * 지갑 동선은 3단계다. 연결(EIP-6963 탐지) → 네트워크(현재 체인을 eth_chainId로
 * 확인해 이미 GIWA면 "연결됨"을 표시, 아니면 전환/추가) → 서명 로그인(personal_sign
 * 으로 소유 확인). 서명까지 마쳐야 로그인으로 취급한다. 체인 파라미터는 전부
 * config 주입(절대 규칙 4). 세션은 React state에만 둔다(스토리지 금지 컨벤션).
 */

/* ---------- EIP-1193 / EIP-6963 최소 타입 ---------- */

interface Eip1193Provider {
  request(args: { method: string; params?: unknown }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

interface Eip6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

interface Eip6963ProviderDetail {
  info: Eip6963ProviderInfo;
  provider: Eip1193Provider;
}

function errorCode(e: unknown): number | null {
  if (typeof e === "object" && e !== null && "code" in e) {
    const c = (e as { code: unknown }).code;
    if (typeof c === "number") return c;
  }
  return null;
}

function shortAddress(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function firstString(v: unknown): string | null {
  const arr = Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string")
    : [];
  return arr[0] ?? null;
}

/** personal_sign은 메시지를 UTF-8 hex로 넘기는 게 가장 호환이 좋다 */
function utf8ToHex(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let hex = "0x";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

type ReqStatus = "idle" | "pending" | "error";

/* 네트워크 상태 행 — 연결 전/후 패널이 공유 */
function NetworkRow({
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

export function LoginButton() {
  const [open, setOpen] = useState(false);
  const [wallets, setWallets] = useState<readonly Eip6963ProviderDetail[]>([]);
  const [connectedWallet, setConnectedWallet] =
    useState<Eip6963ProviderDetail | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainHex, setChainHex] = useState<string | null>(null);
  const [signedAccount, setSignedAccount] = useState<string | null>(null);
  const [connectingRdns, setConnectingRdns] = useState<string | null>(null);
  const [netStatus, setNetStatus] = useState<ReqStatus>("idle");
  const [signStatus, setSignStatus] = useState<ReqStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  /* 서명까지 마친 주소가 현재 계정과 일치해야 로그인 상태다 */
  const loggedIn = account !== null && signedAccount === account;
  const onGiwa =
    chainHex !== null && Number.parseInt(chainHex, 16) === giwaChain.chainId;

  /* 모달이 열릴 때 EIP-6963 프로바이더 수집 */
  useEffect(() => {
    if (!open) return;
    const found = new Map<string, Eip6963ProviderDetail>();
    const onAnnounce = (e: Event) => {
      const detail = (e as CustomEvent<Eip6963ProviderDetail>).detail;
      if (detail?.info?.rdns) {
        found.set(detail.info.rdns, detail);
        setWallets([...found.values()]);
      }
    };
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () =>
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /* 연결된 지갑의 체인/계정 변경을 구독 — 네트워크 표기를 실시간으로 맞춘다 */
  useEffect(() => {
    const p = connectedWallet?.provider;
    if (!p?.on) return;
    const onChainChanged = (...args: unknown[]) => {
      const hex = args[0];
      if (typeof hex === "string") setChainHex(hex);
    };
    const onAccountsChanged = (...args: unknown[]) => {
      const next = firstString(args[0]);
      /* 계정이 사라지면 연결 해제, 바뀌면 교체(서명 로그인은 주소 불일치로 자동 해제) */
      if (next === null) {
        setConnectedWallet(null);
        setAccount(null);
        setChainHex(null);
        setSignedAccount(null);
      } else {
        setAccount(next);
      }
    };
    p.on("chainChanged", onChainChanged);
    p.on("accountsChanged", onAccountsChanged);
    return () => {
      p.removeListener?.("chainChanged", onChainChanged);
      p.removeListener?.("accountsChanged", onAccountsChanged);
    };
  }, [connectedWallet]);

  const connect = useCallback(async (w: Eip6963ProviderDetail) => {
    setConnectingRdns(w.info.rdns);
    setErrorMsg(null);
    try {
      const res = await w.provider.request({ method: "eth_requestAccounts" });
      const first = firstString(res);
      if (first) {
        setAccount(first);
        setConnectedWallet(w);
        setNetStatus("idle");
        setSignStatus("idle");
        /* 이미 GIWA에 연결돼 있으면 바로 "연결됨"으로 표기하기 위한 확인 */
        try {
          const chain = await w.provider.request({ method: "eth_chainId" });
          setChainHex(typeof chain === "string" ? chain : null);
        } catch {
          setChainHex(null);
        }
      } else {
        setErrorMsg("지갑에서 계정을 받지 못했습니다");
      }
    } catch (e) {
      setErrorMsg(
        errorCode(e) === 4001 ? "연결이 거절되었습니다" : "지갑 연결에 실패했습니다",
      );
    } finally {
      setConnectingRdns(null);
    }
  }, []);

  const disconnect = useCallback(() => {
    /* 지갑 쪽 사이트 권한도 회수해야 진짜 해제다 — 안 하면 재연결 때 계정 선택 창
       없이 같은 계정이 즉시 돌아온다. 미지원 지갑도 있으니 실패는 무시(best-effort) */
    connectedWallet?.provider
      .request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      })
      .catch(() => undefined);
    setAccount(null);
    setConnectedWallet(null);
    setChainHex(null);
    setSignedAccount(null);
    setNetStatus("idle");
    setSignStatus("idle");
    setErrorMsg(null);
  }, [connectedWallet]);

  /* GIWA Sepolia 전환 — 지갑이 모르는 체인이면(4902) 추가로 폴백 */
  const addOrSwitchNetwork = useCallback(async () => {
    if (!connectedWallet) return;
    const hexChainId = `0x${giwaChain.chainId.toString(16)}`;
    setNetStatus("pending");
    setErrorMsg(null);
    try {
      try {
        await connectedWallet.provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: hexChainId }],
        });
      } catch (e) {
        if (errorCode(e) === 4902) {
          await connectedWallet.provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: hexChainId,
                chainName: giwaChain.name,
                nativeCurrency: giwaChain.nativeCurrency,
                rpcUrls: [giwaChain.rpcUrl],
                blockExplorerUrls: [giwaChain.explorerUrl],
              },
            ],
          });
        } else {
          throw e;
        }
      }
      /* 이벤트를 안 쏘는 지갑도 있으니 전환 후 체인을 직접 재확인 */
      const chain = await connectedWallet.provider.request({
        method: "eth_chainId",
      });
      if (typeof chain === "string") setChainHex(chain);
      setNetStatus("idle");
    } catch (e) {
      setNetStatus("error");
      setErrorMsg(
        errorCode(e) === 4001
          ? "요청이 거절되었습니다"
          : "네트워크 추가에 실패했습니다",
      );
    }
  }, [connectedWallet]);

  /* 서명 로그인 — 소유 확인용 personal_sign. 온체인 전송이 아니다.
     서명 메시지가 GIWA를 대상으로 단언하므로, 실제로 GIWA에 연결됐을 때만 진행한다 */
  const signIn = useCallback(async () => {
    if (!connectedWallet || !account) return;
    if (!onGiwa) {
      setErrorMsg(`먼저 ${giwaChain.name} 네트워크로 전환해 주세요`);
      return;
    }
    setSignStatus("pending");
    setErrorMsg(null);
    try {
      const message = [
        "나루(NARU)에 로그인합니다.",
        "",
        `지갑 주소: ${account}`,
        `대상 네트워크: ${giwaChain.name} (Chain ID ${giwaChain.chainId})`,
        `시각: ${new Date().toISOString()}`,
        "",
        "이 서명은 지갑 소유 확인용입니다.",
        "온체인 트랜잭션이 아니며 수수료가 발생하지 않습니다.",
      ].join("\n");
      const sig = await connectedWallet.provider.request({
        method: "personal_sign",
        params: [utf8ToHex(message), account],
      });
      if (typeof sig !== "string" || !sig.startsWith("0x")) {
        throw new Error("unexpected signature");
      }
      setSignedAccount(account);
      setSignStatus("idle");
      setOpen(false);
    } catch (e) {
      setSignStatus("error");
      setErrorMsg(
        errorCode(e) === 4001
          ? "서명이 거절되었습니다"
          : "로그인 서명에 실패했습니다",
      );
    }
  }, [connectedWallet, account, onGiwa]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          loggedIn
            ? "flex items-center gap-2 rounded-lg border border-hairline bg-panel px-3.5 py-2 font-mono text-[12.5px] text-ink transition-colors hover:bg-panel-2"
            : "rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-accent-ink transition-[filter] hover:brightness-110"
        }
      >
        {loggedIn && account ? (
          <>
            <span aria-hidden className="size-1.5 rounded-full bg-good" />
            {shortAddress(account)}
          </>
        ) : (
          "로그인"
        )}
      </button>

      {/* 헤더의 backdrop-filter가 fixed 기준을 가로채므로 body 포털로 띄운다 */}
      {open
        ? createPortal(
            <div className="fixed inset-0 z-50">
              <button
                type="button"
                aria-label="로그인 창 닫기"
                onClick={() => setOpen(false)}
                className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-[2px]"
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label="로그인"
                className="absolute left-1/2 top-1/2 w-[400px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-hairline bg-[#1d140c] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-[17px] font-bold">
                      {loggedIn ? "내 지갑" : "로그인"}
                    </h2>
                    <p className="mt-1 text-[12.5px] text-ink-3">
                      {loggedIn
                        ? "서명 로그인이 완료된 상태입니다"
                        : "익숙한 방법으로 시작하세요"}
                    </p>
                  </div>
                  <button
                    ref={closeRef}
                    type="button"
                    aria-label="닫기"
                    onClick={() => setOpen(false)}
                    className="grid size-8 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-panel-2 hover:text-ink"
                  >
                    <svg
                      viewBox="0 0 14 14"
                      width={13}
                      height={13}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      aria-hidden
                    >
                      <path d="M2.5 2.5l9 9M11.5 2.5l-9 9" />
                    </svg>
                  </button>
                </div>

                {loggedIn && connectedWallet && account ? (
                  /* 로그인 완료 — 상태 확인 + 로그아웃 */
                  <div className="mt-5 rounded-xl border border-hairline bg-panel px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={connectedWallet.info.icon}
                        alt=""
                        width={22}
                        height={22}
                        className="rounded-md"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold">
                          {connectedWallet.info.name}
                        </p>
                        <p className="font-mono text-[11.5px] text-ink-3">
                          {shortAddress(account)}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-[11px] font-medium text-good">
                        <span
                          aria-hidden
                          className="size-1.5 rounded-full bg-good"
                        />
                        로그인됨
                      </span>
                    </div>

                    <NetworkRow
                      onGiwa={onGiwa}
                      pending={netStatus === "pending"}
                      onSwitch={() => void addOrSwitchNetwork()}
                    />

                    <button
                      type="button"
                      onClick={disconnect}
                      className="mt-2.5 w-full rounded-lg border border-hairline py-2 text-[12px] text-ink-3 transition-colors hover:bg-panel-2 hover:text-ink-2"
                    >
                      로그아웃
                    </button>
                  </div>
                ) : (
                  <>
                    {/* 이메일 — 주 동선 (준비 중) */}
                    <button
                      type="button"
                      className="mt-5 w-full rounded-xl border border-accent/30 bg-accent/10 px-4 py-3.5 text-left transition-colors hover:bg-accent/15"
                    >
                      <span className="flex items-center gap-3.5">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent">
                          <svg
                            viewBox="0 0 16 16"
                            width={16}
                            height={16}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <rect
                              x="1.8"
                              y="3"
                              width="12.4"
                              height="10"
                              rx="1.8"
                            />
                            <path d="M2.2 4.2L8 8.8l5.8-4.6" />
                          </svg>
                        </span>
                        <span>
                          <span className="block text-[14px] font-semibold">
                            이메일로 시작
                          </span>
                          <span className="mt-0.5 block text-[11.5px] text-ink-3">
                            지갑 없이 이메일만으로 시작합니다 · 준비 중
                          </span>
                        </span>
                      </span>
                    </button>

                    <div className="mt-4 flex items-center gap-3">
                      <span className="h-px flex-1 bg-hairline" aria-hidden />
                      <span className="text-[11px] text-ink-3">
                        또는 지갑으로
                      </span>
                      <span className="h-px flex-1 bg-hairline" aria-hidden />
                    </div>

                    {account && connectedWallet ? (
                      /* 연결됨 — 네트워크 확인 후 서명 로그인 */
                      <div className="mt-4 rounded-xl border border-hairline bg-panel px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={connectedWallet.info.icon}
                            alt=""
                            width={22}
                            height={22}
                            className="rounded-md"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold">
                              {connectedWallet.info.name}
                            </p>
                            <p className="font-mono text-[11.5px] text-ink-3">
                              {shortAddress(account)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={disconnect}
                            className="text-[11px] text-ink-3 transition-colors hover:text-ink-2"
                          >
                            연결 해제
                          </button>
                        </div>

                        <NetworkRow
                          onGiwa={onGiwa}
                          pending={netStatus === "pending"}
                          onSwitch={() => void addOrSwitchNetwork()}
                        />

                        <button
                          type="button"
                          disabled={signStatus === "pending" || !onGiwa}
                          onClick={() => void signIn()}
                          className="mt-2.5 w-full rounded-lg bg-accent py-2.5 text-[13px] font-semibold text-accent-ink transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {signStatus === "pending"
                            ? "지갑에서 서명해 주세요…"
                            : !onGiwa
                              ? "네트워크 전환 후 로그인"
                              : "서명하고 로그인"}
                        </button>
                        <p className="mt-2 text-[10.5px] leading-relaxed text-ink-3">
                          서명은 지갑 소유 확인용입니다 · 온체인 전송이 아니며
                          수수료가 들지 않습니다
                        </p>
                      </div>
                    ) : wallets.length > 0 ? (
                      /* 설치된 지갑 목록 (EIP-6963) */
                      <div className="mt-4 space-y-2">
                        {wallets.map((w) => (
                          <button
                            key={w.info.rdns}
                            type="button"
                            disabled={connectingRdns !== null}
                            onClick={() => void connect(w)}
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
                                {connectingRdns === w.info.rdns
                                  ? "지갑에서 확인 중…"
                                  : "연결"}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      /* 설치된 지갑 없음 */
                      <div className="mt-4 rounded-xl border border-hairline bg-panel px-4 py-4 text-center">
                        <p className="text-[13px] text-ink-2">
                          설치된 지갑이 없습니다
                        </p>
                        <a
                          href="https://metamask.io/download"
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1.5 inline-block text-[12.5px] text-accent transition-[filter] hover:brightness-110"
                        >
                          메타마스크 설치 ↗
                        </a>
                      </div>
                    )}
                  </>
                )}

                {errorMsg ? (
                  <p className="mt-3 text-[12px] text-down">{errorMsg}</p>
                ) : null}

                <p className="mt-4 text-[10.5px] text-ink-3">
                  이메일 로그인은 준비 중입니다 · 지갑 연결, 네트워크 추가,
                  서명 로그인은 실제로 동작합니다
                </p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
