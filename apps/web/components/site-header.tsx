import Link from "next/link";
import { giwaChain } from "@giwa/config";
import { SITE_LINKS } from "@/lib/site";
import { BrandLogo } from "./brand-logo";
import { HeaderSearch } from "./header-search";
import { MainNav } from "./main-nav";
import { TelegramIcon, XIcon } from "./social-icons";

const ICON_BUTTON_CLASS =
  "grid size-9 place-items-center rounded-lg border border-hairline text-ink-3 transition-colors hover:border-ink-3/40 hover:text-ink-2";

/**
 * 절대 규칙 3: 지갑 연결을 강요하지 않는다.
 * 주 동선은 이메일 로그인, 지갑 연결은 조용한 보조 동선.
 * 테스트넷 표시는 우측 칩으로 상시 노출한다 (절대 규칙 5).
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-base/60 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1840px] items-center gap-7 px-8">
        <Link
          href="/"
          aria-label="나루 홈으로"
          className="flex items-center gap-2.5"
        >
          <BrandLogo />
          <span className="flex items-baseline gap-1.5">
            <span className="text-[17px] font-bold tracking-tight">나루</span>
            <span className="font-mono text-[10px] tracking-[0.14em] text-ink-3">
              NARU
            </span>
          </span>
        </Link>

        <MainNav />

        <div className="ml-auto flex min-w-0 flex-1 justify-end">
          <HeaderSearch />
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          {/* 소셜 클러스터 — 데모 가정 링크 (lib/site.ts) */}
          <div className="flex items-center gap-1.5">
            <a
              href={SITE_LINKS.x}
              target="_blank"
              rel="noreferrer"
              title="X (트위터)"
              aria-label="나루 X 계정"
              className={ICON_BUTTON_CLASS}
            >
              <XIcon size={13} />
            </a>
            <a
              href={SITE_LINKS.telegram}
              target="_blank"
              rel="noreferrer"
              title="텔레그램"
              aria-label="나루 텔레그램 채널"
              className={ICON_BUTTON_CLASS}
            >
              <TelegramIcon size={14} />
            </a>
            <a
              href={giwaChain.explorerUrl}
              target="_blank"
              rel="noreferrer"
              title="블록 익스플로러"
              aria-label="블록 익스플로러 열기"
              className={ICON_BUTTON_CLASS}
            >
              <svg
                viewBox="0 0 16 16"
                width={14}
                height={14}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M6.5 3.5H3.8A1.3 1.3 0 0 0 2.5 4.8v7.4a1.3 1.3 0 0 0 1.3 1.3h7.4a1.3 1.3 0 0 0 1.3-1.3V9.5" />
                <path d="M9.5 2.5h4v4" />
                <path d="M13.2 2.8L7.5 8.5" />
              </svg>
            </a>
          </div>
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-[13px] text-ink-3 transition-colors hover:text-ink-2"
          >
            지갑 연결
          </button>
          <button
            type="button"
            className="rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-accent-ink transition-[filter] hover:brightness-110"
          >
            이메일로 시작
          </button>
        </div>
      </div>
    </header>
  );
}
