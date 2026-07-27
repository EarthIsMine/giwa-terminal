/** 아바타 색은 자산 정체성을 따른다(순위 아님) — 전통 공예 모티프 팔레트 */
const AVATAR_GRADIENTS: readonly [string, string][] = [
  ["#627eea", "#3c4e9c"], // 이더리움 블루
  ["#2e9e8f", "#1b5f56"], // 청자 비취
  ["#9aa4b8", "#5d6880"], // 백자
  ["#d9b98a", "#a67f4e"], // 한지
  ["#8e6be8", "#5a3ea8"], // 나전
  ["#5c6b84", "#2e3a4e"], // 수묵
  ["#d96a4a", "#8e3b28"], // 단청
  ["#7b8f7a", "#49594a"], // 분청 회청
  ["#8a4a32", "#54291c"], // 옻칠 적갈
  ["#b98a5a", "#7a5432"], // 원목 탄
  ["#4a4a52", "#26262c"], // 갓 흑립
  ["#c96a8a", "#8a3f5c"], // 노리개 연지
];

/** 시드 자산의 색 정체성 고정 매핑 — 목록에 없는 심볼은 이름 해시로 팔레트를 고른다 */
const SYMBOL_ORDER = [
  "WETH",
  "CHUNGJA",
  "BAEKJA",
  "HANJI",
  "NAJEON",
  "SUMUK",
  "DANCHNG",
  "BUNCHEONG",
  "OTCHIL",
  "SOBAN",
  "GAT",
  "NORIGAE",
] as const;

function paletteIndex(symbol: string): number {
  const fixed = SYMBOL_ORDER.indexOf(symbol as (typeof SYMBOL_ORDER)[number]);
  if (fixed >= 0) return fixed;
  let hash = 0;
  for (const ch of symbol) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return hash % AVATAR_GRADIENTS.length;
}

export function AssetAvatar({
  symbol,
  isQuoteAnchor = false,
  size = 40,
}: {
  symbol: string;
  isQuoteAnchor?: boolean;
  size?: number;
}) {
  const [from, to] = AVATAR_GRADIENTS[
    paletteIndex(symbol) % AVATAR_GRADIENTS.length
  ] ?? ["#5c6b84", "#2e3a4e"];
  return (
    <div
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-semibold text-white/90 ring-1 ring-white/10"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.35),
        background: `linear-gradient(135deg, ${from}, ${to})`,
      }}
    >
      {isQuoteAnchor ? "Ξ" : symbol.charAt(0)}
    </div>
  );
}
