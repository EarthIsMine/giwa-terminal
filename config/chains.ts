/**
 * 체인 파라미터 단일 소스 (절대 규칙 4)
 *
 * 모든 체인 의존 값은 이 파일을 통해서만 흐른다.
 * 프라이빗 메인넷 초대 시 .env 값 교체만으로 전체 앱이 재싱크된다.
 * 아래 기본값은 GIWA Sepolia 퍼블릭 테스트넷 값이며, env가 있으면 env가 이긴다.
 *
 * 주의: process.env 접근은 반드시 리터럴 멤버 접근으로 쓴다.
 * (Next.js가 빌드 타임에 NEXT_PUBLIC_* 를 정적 치환하기 때문)
 */

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  /** V2 팩토리 주소 — 컨트랙트 배포 후 env로 주입 */
  factoryAddress: `0x${string}` | null;
  /** 인덱서 시작 블록 — 컨트랙트 배포 후 env로 주입 */
  startBlock: bigint | null;
  testnet: boolean;
}

function asAddress(v: string | undefined): `0x${string}` | null {
  return v && v.startsWith("0x") ? (v as `0x${string}`) : null;
}

export const giwaChain: ChainConfig = {
  chainId: Number(process.env.NEXT_PUBLIC_GIWA_CHAIN_ID ?? "91342"),
  name: process.env.NEXT_PUBLIC_GIWA_CHAIN_NAME ?? "GIWA Sepolia",
  rpcUrl: process.env.NEXT_PUBLIC_GIWA_RPC_URL ?? "https://sepolia-rpc.giwa.io",
  explorerUrl:
    process.env.NEXT_PUBLIC_GIWA_EXPLORER_URL ?? "https://sepolia-explorer.giwa.io",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  factoryAddress: asAddress(process.env.NEXT_PUBLIC_GIWA_FACTORY_ADDRESS),
  startBlock: process.env.NEXT_PUBLIC_GIWA_START_BLOCK
    ? BigInt(process.env.NEXT_PUBLIC_GIWA_START_BLOCK)
    : null,
  testnet: (process.env.NEXT_PUBLIC_GIWA_TESTNET ?? "true") !== "false",
};

/** 익스플로러 주소 상세 페이지 링크 */
export function explorerAddressUrl(address: string): string {
  return `${giwaChain.explorerUrl}/address/${address}`;
}
