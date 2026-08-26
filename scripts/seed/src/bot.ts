/**
 * 스왑 봇 - 시드 자산 위에서 소액 매수/매도를 랜덤 간격으로 반복한다.
 * 목적: 스크리너에 흐를 실데이터(체결·캔들·거래량·참여 인원) 생성.
 * 테스트넷 전용이며 숨기지 않는다 (절대 규칙 5 - UI·문서에 시드 봇 명시).
 *
 * minOut=0인 이유: 우리 봇끼리만 도는 테스트넷 풀이라 샌드위치 상대가 없고,
 * 가격 영향 자체가 만들려는 데이터다. 메인넷에서는 이 봇을 절대 돌리지 않는다.
 */
import { formatEther, maxUint256, parseEther, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { erc20Abi, routerAbi } from "./abi.js";
import { addresses, publicClient, walletFor } from "./chain.js";
import { SEED_SPECS } from "./assets.js";
import { botKeys } from "./fund-bots.js";
import { issuedSymbols } from "./registry.js";

const MIN_INTERVAL_MS = 8_000;
const MAX_INTERVAL_MS = 25_000;
// 풀 규모(0.0008~0.0015 ETH) 대비 1~5% 가격 영향 수준으로 잡는다
const BUY_MIN = parseEther("0.00001");
const BUY_MAX = parseEther("0.00004");
/** 봇 지갑 가스·매수 여력 하한 - 이보다 적으면 매도만 시도 */
const LOW_ETH = parseEther("0.0003");

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(arr: readonly T[]): T => {
  const v = arr[Math.floor(Math.random() * arr.length)];
  if (v === undefined) throw new Error("빈 배열에서 pick");
  return v;
};
const randBigint = (min: bigint, max: bigint) =>
  min + (BigInt(Math.floor(Math.random() * 1_000_000)) * (max - min)) / 1_000_000n;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const deadline = () => BigInt(Math.floor(Date.now() / 1000) + 300);

const keys = botKeys();
if (keys.length === 0) throw new Error("봇 지갑 없음 - pnpm --filter @giwa/seed fund 먼저");

const onchain = await issuedSymbols();
const tokens: Address[] = SEED_SPECS.flatMap((s) => {
  const addr = onchain.get(s.symbol);
  return addr ? [addr] : [];
});
if (tokens.length === 0) throw new Error("시드 자산 없음 - pnpm --filter @giwa/seed issue 먼저");

console.log(`스왑 봇 기동 - 지갑 ${keys.length}개 · 자산 ${tokens.length}종 · ${MIN_INTERVAL_MS / 1000}~${MAX_INTERVAL_MS / 1000}s 간격`);

let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
  console.log("종료 신호 - 현재 스왑 마무리 후 정지");
});

let swaps = 0;
let failures = 0;

while (!stopping) {
  const key = pick(keys);
  const wallet = walletFor(key);
  const bot = privateKeyToAccount(key).address;
  const token = pick(tokens);

  try {
    const [ethBalance, tokenBalance] = await Promise.all([
      publicClient.getBalance({ address: bot }),
      publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [bot],
      }),
    ]);

    // ETH가 여유 있으면 60% 확률 매수, 아니면 보유분 매도
    const canBuy = ethBalance > LOW_ETH + BUY_MAX;
    const canSell = tokenBalance > 0n;
    if (!canBuy && !canSell) {
      console.log(`봇 ${bot.slice(0, 8)} 잔고 소진 - 건너뜀`);
      await sleep(rand(MIN_INTERVAL_MS, MAX_INTERVAL_MS));
      continue;
    }
    const buying = canBuy && (!canSell || Math.random() < 0.6);

    if (buying) {
      const value = randBigint(BUY_MIN, BUY_MAX);
      const hash = await wallet.writeContract({
        address: addresses.router,
        abi: routerAbi,
        functionName: "swapExactETHForTokens",
        args: [0n, [addresses.weth, token], bot, deadline()],
        value,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      swaps++;
      console.log(`매수 ${formatEther(value)} ETH → ${token.slice(0, 8)} (${bot.slice(0, 8)}) #${swaps}`);
    } else {
      // 보유분의 20~60% 매도
      const amountIn = (tokenBalance * randBigint(20n, 60n)) / 100n;
      const allowance = await publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: "allowance",
        args: [bot, addresses.router],
      });
      if (allowance < amountIn) {
        const approveHash = await wallet.writeContract({
          address: token,
          abi: erc20Abi,
          functionName: "approve",
          args: [addresses.router, maxUint256],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }
      const hash = await wallet.writeContract({
        address: addresses.router,
        abi: routerAbi,
        functionName: "swapExactTokensForETH",
        args: [amountIn, 0n, [token, addresses.weth], bot, deadline()],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      swaps++;
      console.log(`매도 ${token.slice(0, 8)} (${bot.slice(0, 8)}) #${swaps}`);
    }
    failures = 0;
  } catch (e) {
    failures++;
    console.error(`스왑 실패 (연속 ${failures}회): ${e instanceof Error ? e.message.split("\n")[0] : e}`);
    if (failures >= 5) {
      // 공개 RPC 레이트리밋 등 연속 실패 시 길게 백오프
      console.log("연속 실패 - 60초 백오프");
      await sleep(60_000);
      failures = 0;
    }
  }

  await sleep(rand(MIN_INTERVAL_MS, MAX_INTERVAL_MS));
}

console.log(`정지 - 총 ${swaps}회 스왑`);
