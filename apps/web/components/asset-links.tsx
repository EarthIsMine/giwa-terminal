import type { AssetLinks } from "@giwa/shared";
import { GlobeIcon, XIcon } from "./social-icons";

/** 자산 공식 채널 아이콘 — 행 클릭 내비게이션과 겹치지 않게 전파를 끊는다 */
export function AssetLinksIcons({
  links,
  size = 12,
}: {
  links: AssetLinks | undefined;
  size?: number;
}) {
  if (!links || (!links.website && !links.x)) return null;
  return (
    <span className="inline-flex items-center gap-1">
      {links.website ? (
        <a
          href={links.website}
          target="_blank"
          rel="noreferrer"
          title="웹사이트"
          aria-label="자산 웹사이트 열기"
          onClick={(e) => e.stopPropagation()}
          className="text-ink-3 transition-colors hover:text-ink-2"
        >
          <GlobeIcon size={size} />
        </a>
      ) : null}
      {links.x ? (
        <a
          href={links.x}
          target="_blank"
          rel="noreferrer"
          title="X (트위터)"
          aria-label="자산 X 계정 열기"
          onClick={(e) => e.stopPropagation()}
          className="text-ink-3 transition-colors hover:text-ink-2"
        >
          <XIcon size={size} />
        </a>
      ) : null}
    </span>
  );
}
