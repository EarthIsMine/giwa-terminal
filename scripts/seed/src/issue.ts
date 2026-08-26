/**
 * 데모 자산 온체인 발행 - TokenFactory.issueAndList (런치패드 제품과 같은 경로).
 * 멱등: 이미 발행된 심볼은 건너뛰므로 몇 번을 다시 돌려도 안전하다.
 */
import { formatEther } from "viem";
import { tokenFactoryAbi } from "./abi.js";
import { addresses, operatorWallet, publicClient } from "./chain.js";
import { SEED_SPECS, metadataFor } from "./assets.js";
import { issuedSymbols } from "./registry.js";

const DECIMALS = 10n ** 18n;

const operator = operatorWallet();

const existing = await issuedSymbols();
const pending = SEED_SPECS.filter((s) => !existing.has(s.symbol));
const budget = pending.reduce((acc, s) => acc + s.lpEth, 0n);
const balance = await publicClient.getBalance({ address: operator.account.address });

console.log(`발행 대상 ${pending.length}종 (기존 ${existing.size}건 스킵)`);
console.log(`필요 유동성 ${formatEther(budget)} ETH / 잔고 ${formatEther(balance)} ETH`);
if (balance < budget) {
  throw new Error("운영 지갑 잔고 부족 - 브리지로 충전 후 재실행 (멱등이라 이어서 발행됩니다)");
}

for (const spec of pending) {
  const hash = await operator.writeContract({
    address: addresses.tokenFactory,
    abi: tokenFactoryAbi,
    functionName: "issueAndList",
    args: [
      spec.nameKo,
      spec.symbol,
      spec.supply * DECIMALS,
      spec.liquidityTokens * DECIMALS,
      metadataFor(spec),
    ],
    value: spec.lpEth,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`${spec.symbol} 발행 실패: ${hash}`);
  }
  console.log(
    `발행 ${spec.symbol.padEnd(10)} (${spec.nameKo}) LP ${formatEther(spec.lpEth)} ETH - ${hash}`,
  );
}

const finalCount = await publicClient.readContract({
  address: addresses.tokenFactory,
  abi: tokenFactoryAbi,
  functionName: "allTokensLength",
});
console.log(`완료 - 온체인 발행 토큰 총 ${finalCount}건`);
