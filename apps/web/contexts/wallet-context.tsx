"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { giwaChain } from "@giwa/config";

/**
 * 지갑 세션 컨텍스트 — 로그인 버튼과 내 자산 페이지가 공유하는 연결 상태.
 *
 * 세션은 React state에만 둔다 (컨벤션: 브라우저 스토리지 금지). 그래도 새로고침에
 * 연결이 풀리지는 않는다: 승인 기록은 우리가 아니라 지갑 확장이 쥐고 있어서,
 * 마운트 때 `eth_accounts` 로 조용히 되물으면 이미 승인된 계정이 그대로 돌아온다
 * (창을 띄우는 `eth_requestAccounts` 와 다르다). 스토리지를 쓰지 않으면서도
 * 세션이 이어지는 이유다.
 *
 * 다만 서명 로그인(signedAccount)은 복구하지 않는다 — 그건 서버 세션 토큰이
 * 있어야 이어지고, 지금 없는 걸 있는 척하면 소유 확인의 의미가 사라진다.
 * 새로고침 후에는 "조회 전용" 상태로 떨어지고 서명은 다시 받는다.
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

/** EIP-1193 계정 배열에서 첫 주소만 — 형태가 어긋난 응답은 걸러낸다 */
function firstString(v: unknown): string | null {
  const arr = Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string")
    : [];
  return arr[0] ?? null;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [connectedWallet, setConnectedWallet] =
    useState<Eip6963ProviderDetail | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainHex, setChainHex] = useState<string | null>(null);
  const [signedAccount, setSignedAccount] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  /*
   * 복구는 마운트 직후 딱 한 번만 열려 있다. 세션이 한 번 정해지면(복구됐든 사용자가
   * 직접 연결했든) 즉시 닫는다 — 열어두면 늦게 announce 하는 지갑이나 로그인 모달이
   * 다시 쏘는 requestProvider 가 훨씬 나중에 계정을 갈아끼울 수 있고, 특히 사용자가
   * 연결 해제를 누른 뒤에 되살아나면 스스로 끊은 세션이 조용히 돌아온다.
   */
  const restoreArmedRef = useRef(true);

  /*
   * 마운트 시 세션 복구 — EIP-6963 으로 지갑을 훑고 이미 승인된 계정만 되받는다.
   * `eth_accounts` 는 권한이 없으면 빈 배열을 줄 뿐 창을 띄우지 않으므로,
   * 지갑을 깔았지만 연결한 적 없는 방문자를 귀찮게 하지 않는다.
   */
  useEffect(() => {
    let cancelled = false;
    const probed = new Set<string>();

    const probe = async (detail: Eip6963ProviderDetail) => {
      // await 앞에서 먼저 걸러야 이미 세션이 정해진 뒤의 지갑을 헛되이 깨우지 않는다
      if (cancelled || !restoreArmedRef.current || probed.has(detail.info.rdns)) {
        return;
      }
      probed.add(detail.info.rdns);
      try {
        const accounts = await detail.provider.request({ method: "eth_accounts" });
        const first = firstString(accounts);
        if (cancelled || first === null || !restoreArmedRef.current) return;
        restoreArmedRef.current = false; // 먼저 응답한 지갑 하나로 확정
        setAccount(first);
        setConnectedWallet(detail);
        try {
          const chain = await detail.provider.request({ method: "eth_chainId" });
          if (!cancelled && typeof chain === "string") setChainHex(chain);
        } catch {
          /* 체인 조회 실패는 연결 자체를 무르지 않는다 — 네트워크 행이 알아서 표기한다 */
        }
      } catch {
        /* 잠긴 지갑·거부는 조용히 넘긴다 (복구는 best-effort) */
      }
    };

    const onAnnounce = (e: Event) => {
      const detail = (e as CustomEvent<Eip6963ProviderDetail>).detail;
      if (detail?.info?.rdns) void probe(detail);
    };

    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () => {
      cancelled = true;
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
    };
  }, []);

  /**
   * 계정 변경의 단일 관문. 누가 부르든(복구·수동 연결·지갑의 accountsChanged·해제)
   * 자동 복구를 닫아, 이후로는 사용자가 고른 세션만 남는다.
   */
  const claimAccount = useCallback((next: string | null) => {
    restoreArmedRef.current = false;
    setAccount(next);
  }, []);

  const value = useMemo(
    () => ({
      connectedWallet,
      setConnectedWallet,
      account,
      setAccount: claimAccount,
      chainHex,
      setChainHex,
      signedAccount,
      setSignedAccount,
      loginOpen,
      setLoginOpen,
    }),
    [connectedWallet, account, claimAccount, chainHex, signedAccount, loginOpen],
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
