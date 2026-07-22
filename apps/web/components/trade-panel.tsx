"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { encodeFunctionData, parseAbi } from "viem";
import { explorerAddressUrl, giwaChain } from "@giwa/config";
import { ethToWei, formatEth, formatKrw, shortHex, wei, weiToDisplayKrw } from "@giwa/shared";
import type { LiveAssetWire } from "@/lib/onchain";
import { requestGiwaNetwork, useWallet } from "./wallet-context";

/**
 * 매수/매도 패널 — 나루 라우터로 직접 스왑한다 (터미널의 핵심 동작).
 * 견적은 페어 준비금으로 V2 공식(0.3% 수수료)을 클라이언트에서 계산하고,
 * 트랜잭션은 연결된 지갑(EIP-1193)으로 보낸다. 슬리피지 허용치 1% 고정.
 */

const routerAbi = parseAbi([
  "function swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline) payable returns (uint256[])",
  "function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[])",
]);
const erc20Abi = parseAbi([
  "function approve(address spender, uint256 value) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);

/** V2 스왑 견적 — 컨트랙트 getAmountOut과 동일식 (수수료 0.3%) */
function getAmountOut(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) return 0n;
  const withFee = amountIn * 997n;
  return (withFee * reserveOut) / (reserveIn * 1000n + withFee);
}

/** 소수 입력 → wei. 잘못된 입력은 null (shared ethToWei는 throw 하므로 감싼다) */
function parseAmount(v: string): bigint | null {
  try {
    return v.trim() === "" ? null : (ethToWei(v) as bigint);
  } catch {
    return null;
  }
}

type Phase = "idle" | "approving" | "swapping" | "mining";

export function TradePanel({
  asset,
  ethKrw: ethKrwRaw,
}: {
  asset: LiveAssetWire;
  ethKrw: string | null;
}) {
  const router = useRouter();
  const { account, chainHex, connectedWallet, setChainHex, setLoginOpen } = useWallet();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [doneTx, setDoneTx] = useState<string | null>(null);

  const ethKrw = ethKrwRaw ? BigInt(ethKrwRaw) : null;
  const routerAddress = giwaChain.routerAddress;
  const onGiwa = chainHex !== null && Number.parseInt(chainHex, 16) === giwaChain.chainId;

  const tokenReserve = BigInt(asset.tokenReserveWei);
  const wethReserve = BigInt(asset.wethReserveWei);

  const amountIn = parseAmount(amount);
  const quote = useMemo(() => {
    if (amountIn === null || amountIn <= 0n) return null;
    return side === "buy"
      ? getAmountOut(amountIn, wethReserve, tokenReserve)
      : getAmountOut(amountIn, tokenReserve, wethReserve);
  }, [amountIn, side, tokenReserve, wethReserve]);
  /* 슬리피지 허용 1% — 최소 수령량 미만이면 컨트랙트가 되돌린다 */
  const minOut = quote !== null ? (quote * 99n) / 100n : null;

  const provider = connectedWallet?.provider ?? null;
  const busy = phase !== "idle";

  async function waitReceipt(hash: string): Promise<void> {
    if (!provider) return;
    for (let i = 0; i < 60; i++) {
      const receipt = await provider.request({
        method: "eth_getTransactionReceipt",
        params: [hash],
      });
      if (receipt !== null && receipt !== undefined) return;
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error("확인 시간 초과");
  }

  async function submit() {
    if (!provider || !account || !routerAddress || amountIn === null || minOut === null) return;
    setError(null);
    setDoneTx(null);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
    try {
      if (side === "sell") {
        /* 판매는 라우터 허용량이 먼저 필요하다 */
        const allowanceHex = await provider.request({
          method: "eth_call",
          params: [
            {
              to: asset.address,
              data: encodeFunctionData({
                abi: erc20Abi,
                functionName: "allowance",
                args: [account as `0x${string}`, routerAddress],
              }),
            },
            "latest",
          ],
        });
        const allowance = typeof allowanceHex === "string" ? BigInt(allowanceHex) : 0n;
        if (allowance < amountIn) {
          setPhase("approving");
          const approveHash = await provider.request({
            method: "eth_sendTransaction",
            params: [
              {
                from: account,
                to: asset.address,
                data: encodeFunctionData({
                  abi: erc20Abi,
                  functionName: "approve",
                  args: [routerAddress, 2n ** 256n - 1n],
                }),
              },
            ],
          });
          if (typeof approveHash === "string") await waitReceipt(approveHash);
        }
      }

      setPhase("swapping");
      const tx =
        side === "buy"
          ? {
              from: account,
              to: routerAddress,
              value: `0x${amountIn.toString(16)}`,
              data: encodeFunctionData({
                abi: routerAbi,
                functionName: "swapExactETHForTokens",
                args: [
                  minOut,
                  [giwaChain.wethAddress, asset.address],
                  account as `0x${string}`,
                  deadline,
                ],
              }),
            }
          : {
              from: account,
              to: routerAddress,
              data: encodeFunctionData({
                abi: routerAbi,
                functionName: "swapExactTokensForETH",
                args: [
                  amountIn,
                  minOut,
                  [asset.address, giwaChain.wethAddress],
                  account as `0x${string}`,
                  deadline,
                ],
              }),
            };
      const hash = await provider.request({ method: "eth_sendTransaction", params: [tx] });
      if (typeof hash !== "string") throw new Error("전송 실패");
      setPhase("mining");
      await waitReceipt(hash);
      setDoneTx(hash);
      setAmount("");
      router.refresh(); // 서버 데이터(가격·준비금) 재조회
    } catch (e) {
      const code =
        typeof e === "object" && e !== null && "code" in e ? (e as { code: unknown }).code : null;
      setError(code === 4001 ? "요청이 거절되었습니다" : "거래에 실패했습니다 — 다시 시도해 주세요");
    } finally {
      setPhase("idle");
    }
  }

  return (
    <div className="rounded-xl carved p-6">
      {/* 매수/매도 토글 — 상승 초록/하락 빨강 관례와 동일 축 */}
      <div role="group" aria-label="주문 방향" className="grid grid-cols-2 gap-1 rounded-lg border border-hairline bg-panel p-1">
        {(["buy", "sell"] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={side === s}
            onClick={() => {
              setSide(s);
              setError(null);
              setDoneTx(null);
            }}
            className={`rounded-md py-2 text-[13px] font-semibold transition-colors ${
              side === s
                ? s === "buy"
                  ? "bg-up/15 text-up"
                  : "bg-down/15 text-down"
                : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {s === "buy" ? "매수" : "매도"}
          </button>
        ))}
      </div>

      <label htmlFor="trade-amount" className="mt-4 block text-[12.5px] font-medium text-ink-2">
        {side === "buy" ? "지불 ETH" : `판매 ${asset.symbol}`}
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          id="trade-amount"
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={side === "buy" ? "0.0001" : "10"}
          className="h-10 w-full rounded-lg border border-hairline bg-panel px-3.5 font-mono text-[13.5px] text-ink placeholder:text-ink-3"
        />
        <span className="shrink-0 text-[12px] text-ink-3">
          {side === "buy" ? "ETH" : asset.symbol}
        </span>
      </div>

      {/* 견적 */}
      <dl className="mt-3 rounded-lg border border-hairline/60 bg-black/20 px-3.5 py-1">
        <div className="flex items-baseline justify-between py-2">
          <dt className="text-[12px] text-ink-3">예상 수령</dt>
          <dd className="font-mono text-[13px] tabular-nums">
            {quote !== null && quote > 0n ? (
              side === "buy" ? (
                <>
                  {formatEth(wei(quote), 2)}{" "}
                  <span className="text-[11px] text-ink-3">{asset.symbol}</span>
                </>
              ) : (
                <>
                  {formatEth(wei(quote), 8)}{" "}
                  <span className="text-[11px] text-ink-3">ETH</span>
                  {ethKrw ? (
                    <span className="ml-1.5 text-[11px] text-ink-3">
                      ≈ ₩{formatKrw(weiToDisplayKrw(wei(quote), ethKrw))}
                    </span>
                  ) : null}
                </>
              )
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-hairline/40 py-2">
          <dt className="text-[12px] text-ink-3">최소 수령 (슬리피지 1%)</dt>
          <dd className="font-mono text-[12px] tabular-nums text-ink-3">
            {minOut !== null && minOut > 0n
              ? `${formatEth(wei(minOut), side === "buy" ? 2 : 8)} ${side === "buy" ? asset.symbol : "ETH"}`
              : "—"}
          </dd>
        </div>
      </dl>

      {/* 실행 버튼 — 연결 → 네트워크 → 주문 순으로 안내 */}
      {!account ? (
        <button
          type="button"
          onClick={() => setLoginOpen(true)}
          className="mt-4 w-full rounded-lg bg-accent py-3 text-[13.5px] font-semibold text-accent-ink transition-[filter] hover:brightness-110"
        >
          지갑 연결하고 거래하기
        </button>
      ) : !onGiwa ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (!provider) return;
            void requestGiwaNetwork(provider)
              .then((hex) => hex && setChainHex(hex))
              .catch(() => setError("네트워크 전환에 실패했습니다"));
          }}
          className="mt-4 w-full rounded-lg border border-accent/30 bg-accent/10 py-3 text-[13.5px] font-semibold text-accent transition-colors hover:bg-accent/20"
        >
          {giwaChain.name} 네트워크로 전환
        </button>
      ) : (
        <button
          type="button"
          disabled={busy || quote === null || quote <= 0n}
          onClick={() => void submit()}
          className={`mt-4 w-full rounded-lg py-3 text-[13.5px] font-semibold transition-[filter] disabled:cursor-not-allowed disabled:opacity-50 ${
            side === "buy" ? "bg-up/85 text-white hover:brightness-110" : "bg-down/85 text-white hover:brightness-110"
          }`}
        >
          {phase === "approving"
            ? "판매 승인 대기 중…"
            : phase === "swapping"
              ? "지갑에서 확인해 주세요…"
              : phase === "mining"
                ? "체결 확인 중…"
                : side === "buy"
                  ? `${asset.symbol} 매수`
                  : `${asset.symbol} 매도`}
        </button>
      )}

      {error ? <p className="mt-2.5 text-[12px] text-down">{error}</p> : null}
      {doneTx ? (
        <p className="mt-2.5 text-[12px] text-good">
          체결 완료 —{" "}
          <a
            href={`${giwaChain.explorerUrl}/tx/${doneTx}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono underline"
          >
            {shortHex(doneTx, 8, 6)}
          </a>
        </p>
      ) : null}

      <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
        나루 라우터(
        <a
          href={routerAddress ? explorerAddressUrl(routerAddress) : "#"}
          target="_blank"
          rel="noreferrer"
          className="font-mono hover:text-ink-2"
        >
          {routerAddress ? shortHex(routerAddress) : "—"}
        </a>
        ) 직접 체결 · 수수료 0.3% 전량 유동성 공급자 귀속 · 테스트넷
      </p>
    </div>
  );
}
