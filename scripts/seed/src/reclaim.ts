/**
 * 운영 도구: 시드 풀 LP 회수 — 잘못 튜닝된 시드 세대의 유동성 ETH를 되찾는다.
 * 운영자가 시드 풀 LP를 전량 보유하므로 removeLiquidityETH로 안전하게 회수된다.
 * (MINIMUM_LIQUIDITY 1000 wei 몫만 풀에 영구히 남는다 — V2 설계)
 *
 * 안전장치 (한 번의 오실행이 라이브 데모를 비운다 — "빈 테이블로 제출하면 끝"):
 * - 기본 대상은 구세대(metadataURI v ≠ 현행 SEED_METADATA_VERSION)만.
 *   현행 세대까지 걷으려면 --all 또는 --version N 을 명시해야 한다.
 * - 기본은 dry-run: 대상 목록만 출력한다. 실제 회수는 --execute 필수.
 *
 * 사용:
 *   pnpm --filter @giwa/seed exec tsx src/reclaim.ts             # 구세대 dry-run
 *   pnpm --filter @giwa/seed exec tsx src/reclaim.ts --execute   # 구세대 회수
 *   pnpm --filter @giwa/seed exec tsx src/reclaim.ts --version 1 --execute
 *   pnpm --filter @giwa/seed exec tsx src/reclaim.ts --all --execute  # 현행 포함 전량
 */
import { formatEther, maxUint256, parseAbi } from "viem";
import { erc20Abi } from "./abi.js";
import { SEED_METADATA_VERSION } from "./assets.js";
import { addresses, operatorWallet, publicClient } from "./chain.js";

const factoryAbi = parseAbi([
  "function allTokensLength() view returns (uint256)",
  "function allTokens(uint256) view returns (address)",
  "function issuedTokens(address) view returns (address issuer, bytes32 identityRef, address pair, uint64 issuedAt, string metadataURI)",
]);
const routerAbi = parseAbi([
  "function removeLiquidityETH(address token, uint256 liquidity, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) returns (uint256, uint256)",
]);

const argv = process.argv.slice(2);
const execute = argv.includes("--execute");
const all = argv.includes("--all");
const versionArg = argv.includes("--version")
  ? Number(argv[argv.indexOf("--version") + 1])
  : null;
if (versionArg !== null && !Number.isInteger(versionArg)) {
  throw new Error("--version 값이 정수가 아닙니다");
}

function metadataVersion(metadataURI: string): number | null {
  try {
    const meta: unknown = JSON.parse(metadataURI);
    if (typeof meta === "object" && meta !== null && "v" in meta && typeof meta.v === "number") {
      return meta.v;
    }
    return null;
  } catch {
    return null;
  }
}

/** 대상 세대 판정 — 기본은 "현행이 아닌 것"만 (라이브 세대 보호) */
function isTarget(version: number | null): boolean {
  if (all) return true;
  if (versionArg !== null) return version === versionArg;
  return version !== SEED_METADATA_VERSION;
}

const operator = operatorWallet();
const me = operator.account.address;
const deadline = () => BigInt(Math.floor(Date.now() / 1000) + 300);

const length = await publicClient.readContract({
  address: addresses.tokenFactory,
  abi: factoryAbi,
  functionName: "allTokensLength",
});

interface Target {
  token: `0x${string}`;
  pair: `0x${string}`;
  symbol: string;
  version: number | null;
  lp: bigint;
}
const targets: Target[] = [];

for (let i = 0n; i < length; i++) {
  const token = await publicClient.readContract({
    address: addresses.tokenFactory,
    abi: factoryAbi,
    functionName: "allTokens",
    args: [i],
  });
  const [, , pair, , metadataURI] = await publicClient.readContract({
    address: addresses.tokenFactory,
    abi: factoryAbi,
    functionName: "issuedTokens",
    args: [token],
  });
  if (pair === "0x0000000000000000000000000000000000000000") continue;

  const version = metadataVersion(metadataURI);
  if (!isTarget(version)) continue;

  const lp = await publicClient.readContract({
    address: pair,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [me],
  });
  if (lp === 0n) continue;

  const symbol = await publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "symbol",
  });
  targets.push({ token, pair, symbol, version, lp });
}

const mode = all
  ? "전 세대(--all)"
  : versionArg !== null
    ? `v${versionArg} 세대`
    : `구세대(현행 v${SEED_METADATA_VERSION} 제외)`;
console.log(`회수 대상: ${mode} — ${targets.length}개 풀`);
for (const t of targets) {
  console.log(`  ${t.symbol.padEnd(10)} v${t.version ?? "?"} LP ${t.lp} (${t.token.slice(0, 10)}…)`);
}

if (targets.length === 0) {
  console.log("대상 없음 — 종료");
  process.exit(0);
}
if (!execute) {
  console.log("\ndry-run입니다. 실제 회수는 --execute 를 붙이세요.");
  process.exit(0);
}

const before = await publicClient.getBalance({ address: me });

for (const t of targets) {
  const allowance = await publicClient.readContract({
    address: t.pair,
    abi: erc20Abi,
    functionName: "allowance",
    args: [me, addresses.router],
  });
  if (allowance < t.lp) {
    const approveHash = await operator.writeContract({
      address: t.pair,
      abi: erc20Abi,
      functionName: "approve",
      args: [addresses.router, maxUint256],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
  }

  const hash = await operator.writeContract({
    address: addresses.router,
    abi: routerAbi,
    functionName: "removeLiquidityETH",
    args: [t.token, t.lp, 0n, 0n, me, deadline()],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(
    `LP 회수 ${t.symbol} — ${receipt.status === "success" ? "ok" : "FAIL"} ${hash}`,
  );
}

const after = await publicClient.getBalance({ address: me });
console.log(`회수 완료 — 잔고 ${formatEther(before)} → ${formatEther(after)} ETH`);
