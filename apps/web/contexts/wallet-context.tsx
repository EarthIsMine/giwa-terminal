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
 * 지갑 세션 컨텍스트 - 로그인 버튼과 내 자산 페이지가 공유하는 연결 상태.
 *
 * 세션은 두 조각이 **둘 다** 있어야 산다.
 *  ① 우리가 남긴 표식(localStorage, 고른 지갑의 rdns) - "연결했고 아직 해제 안 했다"
 *  ② 지갑이 쥔 승인 - `eth_accounts` 가 주소를 돌려주는가
 * 어느 한쪽만으로는 부족하다. ②만 보면 해제를 눌러도 지갑이 승인을 놓지 않는 경우
 * (`wallet_revokePermissions` 미지원) 새로고침에 세션이 되살아나고, ①만 보면
 * 지갑에서 직접 끊었는데도 연결된 척하게 된다.
 *
 * 표식에 주소는 넣지 않는다 (기획서 §8-6 개인정보 비보유) - 주소는 매번 지갑에서
 * 새로 받는다. 저장하는 건 "어느 지갑이었나" 하나뿐이다.
 *
 * 다만 서명 로그인(signedAccount)은 복구하지 않는다 - 그건 서버 세션 토큰이
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
  /** 로그인 모달 개폐 - 헤더 버튼 외에 다른 화면(내 자산·거래 패널)에서도 연다 */
  loginOpen: boolean;
  setLoginOpen: (v: boolean) => void;
}

/**
 * GIWA Sepolia 전환 요청 - 지갑이 모르는 체인이면(4902) 추가로 폴백.
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

/** EIP-1193 계정 배열에서 첫 주소만 - 형태가 어긋난 응답은 걸러낸다 */
function firstString(v: unknown): string | null {
  const arr = Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string")
    : [];
  return arr[0] ?? null;
}

/* ---------- 세션 표식 (localStorage) ---------- */

const SESSION_KEY = "naru.wallet.rdns";

/**
 * 저장하는 것은 **어느 지갑을 골랐는지(rdns)** 뿐이다. 주소는 넣지 않는다 -
 * 기획서 §8-6("나루는 개인정보를 수집·보관하지 않는다")이 구조적 설계라
 * 지갑 주소를 브라우저에 남기면 그 주장이 약해진다. 주소는 복구할 때마다
 * 지갑에서 `eth_accounts` 로 새로 받으므로 저장할 이유도 없다.
 *
 * 이 표식의 유일한 일은 "사용자가 연결했고 아직 해제하지 않았다"를 새로고침
 * 너머로 기억하는 것이다. 지갑의 승인 상태만으로는 이걸 알 수 없어서
 * (`wallet_revokePermissions` 미지원 지갑에서 해제가 유지되지 않는다),
 * 해제를 눌렀는지 여부는 우리 쪽에 남겨야 한다.
 *
 * 스토리지를 못 쓰는 환경(사파리 프라이빗·차단)에서는 조용히 실패하고
 * 복구를 포기한다 - 세션이 안 이어질 뿐 화면은 정상 동작한다.
 */
function readSessionRdns(): string | null {
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeSessionRdns(rdns: string | null): void {
  try {
    if (rdns === null) window.localStorage.removeItem(SESSION_KEY);
    else window.localStorage.setItem(SESSION_KEY, rdns);
  } catch {
    /* 저장 실패는 무시 - 이번 세션은 메모리로만 산다 */
  }
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
   * 직접 연결했든) 즉시 닫는다 - 열어두면 늦게 announce 하는 지갑이나 로그인 모달이
   * 다시 쏘는 requestProvider 가 훨씬 나중에 계정을 갈아끼울 수 있고, 특히 사용자가
   * 연결 해제를 누른 뒤에 되살아나면 스스로 끊은 세션이 조용히 돌아온다.
   */
  const restoreArmedRef = useRef(true);
  /* 복구 효과는 claimWallet 정의보다 위에 있고 deps 가 [] 라 ref 로 건넨다 */
  const claimWalletRef = useRef<(w: Eip6963ProviderDetail | null) => void>(() => {});

  /*
   * 마운트 시 세션 복구.
   *
   * 이전에 연결한 적이 없거나 사용자가 해제를 눌렀으면 표식이 없고, 그러면
   * 지갑을 건드리지도 않는다 - 처음 온 방문자의 지갑을 깨우지 않는다.
   * 표식이 있으면 **그때 고른 그 지갑만** 되살린다. 아무나 먼저 응답한 지갑을
   * 잡으면 지갑 두 개를 승인해 둔 사용자에게 엉뚱한 계정이 뜬다.
   *
   * 주소는 `eth_accounts` 로 받는다. 권한이 없으면 빈 배열을 줄 뿐 창을
   * 띄우지 않으므로, 지갑 쪽에서 이미 연결이 끊겼으면 조용히 복구를 포기한다.
   * localStorage 표식과 지갑 승인이 **둘 다** 있어야 세션이 산다.
   */
  useEffect(() => {
    const wantRdns = readSessionRdns();
    if (wantRdns === null) {
      restoreArmedRef.current = false;
      return;
    }

    let cancelled = false;

    const probe = async (detail: Eip6963ProviderDetail) => {
      if (cancelled || !restoreArmedRef.current) return;
      if (detail.info.rdns !== wantRdns) return;
      try {
        const accounts = await detail.provider.request({ method: "eth_accounts" });
        const first = firstString(accounts);
        if (cancelled || !restoreArmedRef.current) return;
        if (first === null) {
          // 지갑 쪽에서 이미 끊겼다 - 표식만 남아 있으면 다음 방문에도 헛돈다
          restoreArmedRef.current = false;
          writeSessionRdns(null);
          return;
        }
        restoreArmedRef.current = false;
        setAccount(first);
        claimWalletRef.current(detail);
        try {
          const chain = await detail.provider.request({ method: "eth_chainId" });
          if (!cancelled && typeof chain === "string") setChainHex(chain);
        } catch {
          /* 체인 조회 실패는 연결 자체를 무르지 않는다 - 네트워크 행이 알아서 표기한다 */
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

  /**
   * 지갑 선택의 단일 관문. 세션 표식을 여기서만 쓰고 지운다 -
   * 연결하면 남기고, 해제하면 지운다. 해제가 새로고침을 넘어 유지되는 근거다.
   */
  const claimWallet = useCallback((next: Eip6963ProviderDetail | null) => {
    restoreArmedRef.current = false;
    writeSessionRdns(next?.info.rdns ?? null);
    setConnectedWallet(next);
  }, []);
  claimWalletRef.current = claimWallet;

  const value = useMemo(
    () => ({
      connectedWallet,
      setConnectedWallet: claimWallet,
      account,
      setAccount: claimAccount,
      chainHex,
      setChainHex,
      signedAccount,
      setSignedAccount,
      loginOpen,
      setLoginOpen,
    }),
    [connectedWallet, claimWallet, account, claimAccount, chainHex, signedAccount, loginOpen],
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
