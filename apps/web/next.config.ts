import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";
import type { NextConfig } from "next";

// 체인 파라미터 단일 소스는 루트 .env 하나다 (절대 규칙 4).
// Next는 앱 디렉토리의 .env만 읽으므로, 루트 .env를 여기서 주입한다.
// 이미 설정된 프로세스 env가 항상 우선한다 (배포 환경 오버라이드 보존).
const rootEnvPath = join(process.cwd(), "../../.env");
if (existsSync(rootEnvPath)) {
  const parsed = parseEnv(readFileSync(rootEnvPath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined && typeof value === "string") {
      process.env[key] = value;
    }
  }
}

const nextConfig: NextConfig = {
  // 워크스페이스 패키지는 TS 소스를 그대로 export 하므로 여기서 트랜스파일한다
  transpilePackages: ["@giwa/shared", "@giwa/config"],
};

export default nextConfig;
