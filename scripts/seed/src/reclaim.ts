/**
 * 운영 도구: 시드 풀 LP 회수 — 잘못 튜닝된 시드 세대의 유동성 ETH를 되찾는다.
 * 운영자가 시드 풀 LP를 전량 보유하므로 removeLiquidityETH로 안전하게 회수된다.
 * (MINIMUM_LIQUIDITY 1000 wei 몫만 풀에 영구히 남는다 — V2 설계)
 *
 * 사용: pnpm --filter @giwa/seed exec tsx src/reclaim.ts
 */
import { formatEther, maxUint256, parseAbi } from "viem";
import { erc20Abi } from "./abi.js";
import { addresses, operatorWallet, publicClient } from "./chain.js";

const factoryAbi = parseAbi([
  "function allTokensLength() view returns (uint256)",
  "function allTokens(uint256) view returns (address)",
  "function issuedTokens(address) view returns (address issuer, bytes32 identityRef, address pair, uint64 issuedAt, string metadataURI)",
]);
const routerAbi = parseAbi([
  "function removeLiquidityETH(address token, uint256 liquidity, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) returns (uint256, uint256)",
]);

const operator = operatorWallet();
const me = operator.account.address;
const deadline = () => BigInt(Math.floor(Date.now() / 1000) + 300);

const before = await publicClient.getBalance({ address: me });
const length = await publicClient.readContract({
  address: addresses.tokenFactory,
  abi: factoryAbi,
  functionName: "allTokensLength",
});

for (let i = 0n; i < length; i++) {
  const token = await publicClient.readContract({
    address: addresses.tokenFactory,
    abi: factoryAbi,
    functionName: "allTokens",
    args: [i],
  });
  const [, , pair] = await publicClient.readContract({
    address: addresses.tokenFactory,
    abi: factoryAbi,
    functionName: "issuedTokens",
    args: [token],
  });
  if (pair === "0x0000000000000000000000000000000000000000") continue;

  const lp = await publicClient.readContract({
    address: pair,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [me],
  });
  if (lp === 0n) {
    console.log(`${token.slice(0, 10)} LP 없음 — 스킵`);
    continue;
  }

  const allowance = await publicClient.readContract({
    address: pair,
    abi: erc20Abi,
    functionName: "allowance",
    args: [me, addresses.router],
  });
  if (allowance < lp) {
    const approveHash = await operator.writeContract({
      address: pair,
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
    args: [token, lp, 0n, 0n, me, deadline()],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(
    `LP 회수 ${token.slice(0, 10)} — ${receipt.status === "success" ? "ok" : "FAIL"} ${hash}`,
  );
}

const after = await publicClient.getBalance({ address: me });
console.log(`회수 완료 — 잔고 ${formatEther(before)} → ${formatEther(after)} ETH`);
