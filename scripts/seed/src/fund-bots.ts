/**
 * 봇 지갑 준비 - 없으면 생성해 scripts/seed/.env에 기록(gitignored), 부족하면 충전.
 * 배포/운영 지갑과 봇 지갑을 분리한다 (CLAUDE.md 보안 규칙). 봇 키는 테스트넷 전용.
 * 거래자 수 지표가 distinct tx.origin이라 지갑 여러 개가 "참여 인원"을 만든다.
 */
import { appendFileSync } from "node:fs";
import { formatEther, parseEther } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { operatorWallet, publicClient, walletFor } from "./chain.js";
import { seedEnvPath } from "./env.js";

export const BOT_COUNT = 3;
const TARGET_BALANCE = parseEther("0.003");
const MIN_BALANCE = parseEther("0.0005");

export function botKeys(): `0x${string}`[] {
  const raw = process.env.SEED_BOT_PRIVATE_KEYS;
  if (!raw) return [];
  return raw.split(",").filter((k): k is `0x${string}` => /^0x[0-9a-fA-F]{64}$/.test(k.trim()));
}

const isMain = process.argv[1]?.endsWith("fund-bots.ts");
if (isMain) {
  let keys = botKeys();
  if (keys.length < BOT_COUNT) {
    const created: `0x${string}`[] = [];
    while (keys.length + created.length < BOT_COUNT) created.push(generatePrivateKey());
    appendFileSync(
      seedEnvPath,
      `\n# 테스트넷 전용 스왑 봇 지갑 (자동 생성 ${new Date().toISOString()})\nSEED_BOT_PRIVATE_KEYS=${[...keys, ...created].join(",")}\n`,
    );
    keys = [...keys, ...created];
    console.log(`봇 지갑 ${created.length}개 생성 → scripts/seed/.env`);
  }

  const operator = operatorWallet();
  for (const key of keys) {
    const bot = privateKeyToAccount(key).address;
    const balance = await publicClient.getBalance({ address: bot });
    if (balance >= MIN_BALANCE) {
      console.log(`봇 ${bot} 잔고 ${formatEther(balance)} ETH - 충전 생략`);
      continue;
    }
    const amount = TARGET_BALANCE - balance;
    const hash = await operator.sendTransaction({ to: bot, value: amount });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`봇 ${bot} 충전 +${formatEther(amount)} ETH - ${hash}`);
  }
  console.log("봇 지갑 준비 완료");
}

export { walletFor };
