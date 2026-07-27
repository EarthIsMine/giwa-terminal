"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { giwaChain } from "@giwa/config";

/**
 * 지갑 세션 컨텍스트 — 로그인 버튼과 내 자산 페이지가 공유하는 연결 상태.
 * 세션은 React state에만 둔다 (컨벤션: 브라우저 스토리지 금지) — 새로고침 시 재연결.
 */

/* ---------- EIP-1193 / EIP-6963 최소 타입 (단일 소스) ---------- */

export interface Eip1193Provider {
  request(args: { method: string; params?: unknown }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

export interface Eip6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface Eip6963ProviderDetail {
  info: Eip6963ProviderInfo;
  provider: Eip1193Provider;
}

interface WalletSession {
  connectedWallet: Eip6963ProviderDetail | null;
  setConnectedWallet: (w: Eip6963ProviderDetail | null) => void;
  account: string | null;
  setAccount: (a: string | null) => void;
  chainHex: string | null;
  setChainHex: (c: string | null) => void;
  signedAccount: string | null;
  setSignedAccount: (a: string | null) => void;
  /** 로그인 모달 개폐 — 헤더 버튼 외에 다른 화면(내 자산·거래 패널)에서도 연다 */
  loginOpen: boolean;
  setLoginOpen: (v: boolean) => void;
}

/**
 * GIWA Sepolia 전환 요청 — 지갑이 모르는 체인이면(4902) 추가로 폴백.
 * 전환 후 실제 체인을 재확인해 hex chainId를 돌려준다 (이벤트 안 쏘는 지갑 대응).
 * 로그인 모달과 거래 패널이 공유하는 단일 소스.
 */
export async function requestGiwaNetwork(
  provider: Eip1193Provider,
): Promise<string | null> {
  const hexChainId = `0x${giwaChain.chainId.toString(16)}`;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexChainId }],
    });
  } catch (e) {
    const code =
      typeof e === "object" && e !== null && "code" in e ? (e as { code: unknown }).code : null;
    if (code === 4902) {
      await provider.request({
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
  const chain = await provider.request({ method: "eth_chainId" });
  return typeof chain === "string" ? chain : null;
}

const WalletContext = createContext<WalletSession | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [connectedWallet, setConnectedWallet] =
    useState<Eip6963ProviderDetail | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainHex, setChainHex] = useState<string | null>(null);
  const [signedAccount, setSignedAccount] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  const value = useMemo(
    () => ({
      connectedWallet,
      setConnectedWallet,
      account,
      setAccount,
      chainHex,
      setChainHex,
      signedAccount,
      setSignedAccount,
      loginOpen,
      setLoginOpen,
    }),
    [connectedWallet, account, chainHex, signedAccount, loginOpen],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet(): WalletSession {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet은 WalletProvider 안에서만 쓸 수 있다");
  return ctx;
}
