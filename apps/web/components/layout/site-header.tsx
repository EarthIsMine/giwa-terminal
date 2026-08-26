import Link from "next/link";
import { giwaChain } from "@giwa/config";
import { BrandLogo } from "@/components/ui/brand-logo";
import { HeaderSearch } from "@/components/layout/header-search";
import { MainNav } from "@/components/layout/main-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { LoginButton } from "@/components/wallet/login-button";

/* hidden md:grid 와 조합해 쓰므로 display 값(grid)은 호출부가 정한다 */
const ICON_BUTTON_CLASS =
  "size-9 place-items-center rounded-lg border border-hairline text-ink-3 transition-colors hover:border-ink-3/40 hover:text-ink-2";

/**
 * 절대 규칙 3: 지갑 연결을 강요하지 않는다.
 * 주 동선은 이메일 로그인, 지갑 연결은 조용한 보조 동선.
 * 테스트넷 표시는 우측 칩으로 상시 노출한다 (절대 규칙 5).
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-base/60 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-page items-center gap-3 px-page md:h-16 md:gap-7">
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

        <div className="ml-auto hidden min-w-0 flex-1 justify-end md:flex">
          <HeaderSearch />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2.5 md:ml-0">
          {/* 소셜(X·텔레그램)은 푸터에만 둔다 - 헤더는 터미널 동선만 남긴다.
              익스플로러 아이콘은 모바일에선 시트 링크로 대체 (헤더 밀도 절제) */}
          <a
            href={giwaChain.explorerUrl}
            target="_blank"
            rel="noreferrer"
            title="기와체인 원본 기록"
            aria-label="기와체인 원본 기록 열기"
            className={`group hidden md:grid ${ICON_BUTTON_CLASS}`}
          >
            {/* 기와 공식 마크(누끼 PNG) - 검정 원화라 다크 배경에선 invert로 밝힌다 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/giwa-mark.png"
              alt=""
              width={17}
              height={17}
              className="opacity-65 invert transition-opacity group-hover:opacity-95"
            />
          </a>

          {/* 공식 브릿지 - 그림(홍예교 + 물결)으로 "건너온다"를 말한다.
              글자 라벨을 붙이면 헤더 밀도가 올라가므로 아이콘 + title 만 둔다.
              익스플로러와 같이 모바일에선 시트 링크로 대체한다 (헤더 밀도 절제) */}
          <a
            href={giwaChain.bridgeUrl}
            target="_blank"
            rel="noreferrer"
            title="기와 공식 브릿지로 건너오기"
            aria-label="기와 공식 브릿지 열기"
            className={`hidden md:grid ${ICON_BUTTON_CLASS}`}
          >
            <svg
              viewBox="0 0 18 18"
              width={17}
              height={17}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {/* 상판(홍예) · 교각 · 아래로 흐르는 물 */}
              <path d="M1.6 10.4C4 6.2 14 6.2 16.4 10.4" />
              <path d="M5.6 8.3v4.3M12.4 8.3v4.3" />
              <path d="M1.6 15q2.1-1.3 4.2 0t4.2 0t4.2 0" />
            </svg>
          </a>

          <LoginButton />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
