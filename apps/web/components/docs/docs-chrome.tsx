import Link from "next/link";
import { giwaChain } from "@giwa/config";
import { BrandLogo } from "@/components/ui/brand-logo";

/**
 * 기술 문서 전용 크롬 — 헤더·인트로·푸터.
 * 터미널 네비·검색·로그인 없이 문서만의 헤더/푸터를 쓴다 (레퍼런스 방식).
 */

export function DocsHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-base/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1180px] items-center gap-2.5 px-8">
        <Link
          href="/"
          aria-label="나루 터미널로 이동"
          className="flex items-center gap-2.5"
        >
          <BrandLogo size={20} />
          <span className="text-[15px] font-bold tracking-tight">나루</span>
        </Link>
        <span aria-hidden className="text-ink-3">
          /
        </span>
        <span className="text-[13.5px] font-medium text-ink-2">기술 문서</span>
        <Link
          href="/"
          className="ml-auto rounded-lg border border-hairline px-3 py-1.5 text-[12.5px] text-ink-2 transition-colors hover:border-accent/40 hover:text-accent"
        >
          터미널 열기
        </Link>
      </div>
    </header>
  );
}

export function DocsIntro() {
  return (
    <>
      <h1 className="font-serif text-[27px] font-bold tracking-tight">
        기술 문서
      </h1>
      <p className="mt-2 max-w-[640px] text-[13px] leading-relaxed text-ink-3">
        나루가 어떻게 만들어져 있는지 공개합니다: 아키텍처, 지표 산식, 컨트랙트,
        신원 검증 구조. 화면의 모든 숫자는 이 문서의 정의를 따릅니다.
      </p>
    </>
  );
}

export function DocsFooter() {
  return (
    <footer className="border-t border-black/50 bg-[#150d07]/85">
      <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-8 py-5 text-[11.5px] text-ink-3">
        <span>© 2026 나루 NARU · GIWA 가속 데모</span>
        <a
          href={giwaChain.explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-ink-2"
        >
          블록 익스플로러 ↗
        </a>
      </div>
    </footer>
  );
}
