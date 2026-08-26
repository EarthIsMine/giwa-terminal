/**
 * env 로딩 - 반드시 @giwa/config 보다 먼저 import 되는 사이드이펙트 모듈.
 * 체인 파라미터 단일 소스는 루트 .env (절대 규칙 4), 운영자 키는
 * packages/contracts/.env 에 있다 (봇 지갑 키는 scripts/seed/.env - 전부 gitignored).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const here = dirname(fileURLToPath(import.meta.url));
export const repoRoot = join(here, "../../..");
export const seedEnvPath = join(repoRoot, "scripts/seed/.env");

for (const p of [
  join(repoRoot, ".env"),
  join(repoRoot, "packages/contracts/.env"),
  seedEnvPath,
]) {
  if (!existsSync(p)) continue;
  for (const [k, v] of Object.entries(parseEnv(readFileSync(p, "utf8")))) {
    if (process.env[k] === undefined && typeof v === "string") process.env[k] = v;
  }
}
