import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 워크스페이스 패키지는 TS 소스를 그대로 export 하므로 여기서 트랜스파일한다
  transpilePackages: ["@giwa/shared", "@giwa/config"],
};

export default nextConfig;
