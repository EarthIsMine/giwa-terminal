import { parseAbi, type Address } from "viem";
import { erc20Abi, tokenFactoryAbi } from "./abi.js";
import { addresses, publicClient } from "./chain.js";
import { SEED_METADATA_VERSION } from "./assets.js";

const registryAbi = parseAbi([
  "function issuedTokens(address) view returns (address issuer, bytes32 identityRef, address pair, uint64 issuedAt, string metadataURI)",
]);

/**
 * 온체인 레지스트리에서 현행 시드 세대(v2) 토큰의 심볼→주소 맵을 읽는다.
 * 멱등성의 근거 - 같은 심볼이라도 구세대(v1) 토큰은 무시하므로 재발행이 막히지 않고,
 * 봇도 현행 세대만 거래한다.
 */
export async function issuedSymbols(): Promise<Map<string, Address>> {
  const length = await publicClient.readContract({
    address: addresses.tokenFactory,
    abi: tokenFactoryAbi,
    functionName: "allTokensLength",
  });
  const map = new Map<string, Address>();
  for (let i = 0n; i < length; i++) {
    const token = await publicClient.readContract({
      address: addresses.tokenFactory,
      abi: tokenFactoryAbi,
      functionName: "allTokens",
      args: [i],
    });
    const [, , , , metadataURI] = await publicClient.readContract({
      address: addresses.tokenFactory,
      abi: registryAbi,
      functionName: "issuedTokens",
      args: [token],
    });
    let version: unknown;
    try {
      const meta: unknown = JSON.parse(metadataURI);
      version = typeof meta === "object" && meta !== null && "v" in meta ? meta.v : undefined;
    } catch {
      version = undefined;
    }
    if (version !== SEED_METADATA_VERSION) continue;

    const symbol = await publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "symbol",
    });
    map.set(symbol, token);
  }
  return map;
}
