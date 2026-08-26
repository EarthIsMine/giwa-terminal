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
  /** 공식 네이티브 브릿지 (docs.giwa.io/tools/bridges 안내, Superbridge 기반) */
  bridgeUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  /** V2 팩토리(NaruswapV2Factory) 주소 - 컨트랙트 배포 후 env로 주입 */
  factoryAddress: `0x${string}` | null;
  /** 라우터(NaruswapV2Router) 주소 - 컨트랙트 배포 후 env로 주입 */
  routerAddress: `0x${string}` | null;
  /** 발행 게이트(TokenFactory) 주소 - 컨트랙트 배포 후 env로 주입 */
  tokenFactoryAddress: `0x${string}` | null;
  /** 신원 검증 원장(IdentityRegistry) 주소 - 컨트랙트 배포 후 env로 주입 */
  identityRegistryAddress: `0x${string}` | null;
  /** WETH 주소 - OP Stack 프리디플로이가 기본값 (체인 상수) */
  wethAddress: `0x${string}`;
  /** 도장(Dojang) Verified Address 조회 컨트랙트 - 기본값은 GIWA Sepolia 공개 주소
   *  (docs.giwa.io, 2026-07-26 온체인 실검증). 메인넷 주소는 미공개라 env 로 주입한다 */
  dojangScrollAddress: `0x${string}` | null;
  /** 업비트 KYC attesterId = keccak256("dojang.dojangattesterids.upbitkorea") */
  upbitKycAttesterId: `0x${string}`;
  /** 인덱서 시작 블록 - 컨트랙트 배포 후 env로 주입 */
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
  bridgeUrl:
    process.env.NEXT_PUBLIC_GIWA_BRIDGE_URL ?? "https://sepolia-bridge.giwa.io",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  factoryAddress: asAddress(process.env.NEXT_PUBLIC_GIWA_FACTORY_ADDRESS),
  routerAddress: asAddress(process.env.NEXT_PUBLIC_GIWA_ROUTER_ADDRESS),
  tokenFactoryAddress: asAddress(process.env.NEXT_PUBLIC_GIWA_TOKEN_FACTORY_ADDRESS),
  identityRegistryAddress: asAddress(
    process.env.NEXT_PUBLIC_GIWA_IDENTITY_REGISTRY_ADDRESS,
  ),
  wethAddress:
    asAddress(process.env.NEXT_PUBLIC_GIWA_WETH_ADDRESS) ??
    "0x4200000000000000000000000000000000000006",
  dojangScrollAddress:
    asAddress(process.env.NEXT_PUBLIC_GIWA_DOJANG_SCROLL_ADDRESS) ??
    "0xd5077b67dcb56caC8b270C7788FC3E6ee03F17B9",
  upbitKycAttesterId:
    (process.env.NEXT_PUBLIC_GIWA_UPBIT_ATTESTER_ID as `0x${string}` | undefined) ??
    "0xd99b42e778498aa3c9c1f6a012359130252780511687a35982e8e52735453034",
  startBlock: process.env.NEXT_PUBLIC_GIWA_START_BLOCK
    ? BigInt(process.env.NEXT_PUBLIC_GIWA_START_BLOCK)
    : null,
  testnet: (process.env.NEXT_PUBLIC_GIWA_TESTNET ?? "true") !== "false",
};

/**
 * 서버 전용 RPC - Nodit 등 키 포함 엔드포인트를 여기로 주입한다.
 * NEXT_PUBLIC 접두사를 절대 붙이지 않는다: 붙이는 순간 클라이언트 번들과
 * 유저 지갑(wallet_addEthereumChain)에 키가 박제된다 (보안 규칙).
 * 클라이언트에서 평가되면 env 부재로 공개 RPC 폴백 - 안전하다.
 */
export const serverRpcUrl: string =
  process.env.GIWA_SERVER_RPC_URL ?? giwaChain.rpcUrl;

/** 익스플로러 주소 상세 페이지 링크 */
export function explorerAddressUrl(address: string): string {
  return `${giwaChain.explorerUrl}/address/${address}`;
}

/** 익스플로러 트랜잭션 상세 페이지 링크 */
export function explorerTxUrl(hash: string): string {
  return `${giwaChain.explorerUrl}/tx/${hash}`;
}

/** 익스플로러 토큰 상세 페이지 링크 - Blockscout 는 /address 와 별개로 토큰 전용 화면을 둔다 */
export function explorerTokenUrl(address: string): string {
  return `${giwaChain.explorerUrl}/token/${address}`;
}
