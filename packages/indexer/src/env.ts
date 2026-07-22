/**
 * env 로딩 — 반드시 @giwa/config 보다 먼저 import 되는 사이드이펙트 모듈.
 * 체인 파라미터 단일 소스는 루트 .env (절대 규칙 4).
 * 로컬 전용 오버라이드(전용 RPC, DATABASE_URL)는 packages/indexer/.env.local.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");

for (const p of [
  join(repoRoot, "packages/indexer/.env.local"),
  join(repoRoot, ".env"),
]) {
  if (!existsSync(p)) continue;
  for (const [k, v] of Object.entries(parseEnv(readFileSync(p, "utf8")))) {
    if (process.env[k] === undefined && typeof v === "string") process.env[k] = v;
  }
}
