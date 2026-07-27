import Link from "next/link";
import { giwaChain } from "@giwa/config";
import { SITE_LINKS } from "@/lib/site";
import { BrandLogo } from "@/components/ui/brand-logo";
import { HeaderSearch } from "@/components/layout/header-search";
import { MainNav } from "@/components/layout/main-nav";
import { LoginButton } from "@/components/wallet/login-button";
import { TelegramIcon, XIcon } from "@/components/ui/social-icons";

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
            <span className="font-mono text-[11px] tracking-[0.14em] text-ink-3">
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
              title="GIWA 익스플로러"
              aria-label="GIWA 익스플로러 열기"
              className={`group ${ICON_BUTTON_CLASS}`}
            >
              {/* 기와 공식 마크(누끼 PNG) — 검정 원화라 다크 배경에선 invert로 밝힌다 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/giwa-mark.png"
                alt=""
                width={17}
                height={17}
                className="opacity-65 invert transition-opacity group-hover:opacity-95"
              />
            </a>
          </div>
          <LoginButton />
        </div>
      </div>
    </header>
  );
}
