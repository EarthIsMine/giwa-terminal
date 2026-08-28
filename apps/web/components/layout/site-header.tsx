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

          {/* 공식 브릿지 - 아이콘 + "브릿지" 글자 라벨(2026-08-29).
              처음엔 헤더 밀도 때문에 아이콘 단독이었지만, 다리 실루엣이든
              화살표든 첫 방문자는 아이콘만으로 브릿지를 못 알아본다 -
              타겟 유저(업저씨)에겐 그림 수수께끼가 밀도보다 비싸다.
              그림은 크립토 관용 기호(양방향 화살표) + 나루 물결만 남긴다.
              모바일에선 시트의 글자 링크로 대체 (헤더 밀도 절제) */}
          <a
            href={giwaChain.bridgeUrl}
            target="_blank"
            rel="noreferrer"
            title="기와 공식 브릿지로 건너오기"
            aria-label="기와 공식 브릿지 열기"
            className="hidden h-9 items-center gap-1.5 rounded-lg border border-hairline px-3 text-[12.5px] text-ink-3 transition-colors hover:border-ink-3/40 hover:text-ink-2 md:flex"
          >
            <svg
              viewBox="0 0 18 18"
              width={15}
              height={15}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M4.4 5.8h9.2M11.4 3.4l2.6 2.4-2.6 2.4" />
              <path d="M13.6 10.6H4.4M7 8.2 4.4 10.6 7 13" />
              <path d="M1.6 15.8q2.1-1.3 4.2 0t4.2 0t4.2 0" />
            </svg>
            브릿지
          </a>

          <LoginButton />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
