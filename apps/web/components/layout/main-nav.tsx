"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 상단 주 메뉴 — 항목은 실제 있는 화면만 (절대 규칙 3: 밀도를 낮춘다).
 * 순서는 5면 구성을 따른다: 토큰 | 분석 | 발행 | 나루 포인트 | 내 자산
 * 항목 정의는 모바일 메뉴(mobile-nav)와 공유하는 단일 소스다.
 */
export const NAV_ITEMS = [
  {
    href: "/",
    label: "토큰",
    match: (p: string) => p === "/" || p.startsWith("/asset"),
  },
  {
    href: "/analysis",
    label: "분석",
    match: (p: string) => p.startsWith("/analysis"),
  },
  {
    href: "/launch",
    label: "발행",
    match: (p: string) => p.startsWith("/launch"),
  },
  {
    href: "/points",
    label: "나루 포인트",
    match: (p: string) => p.startsWith("/points"),
  },
  {
    href: "/portfolio",
    label: "내 자산",
    match: (p: string) => p.startsWith("/portfolio"),
  },
] as const;

/** 데스크톱 전용 — 모바일에서는 mobile-nav 드로어가 같은 항목을 보여준다 */
export function MainNav() {
  const pathname = usePathname() ?? "/";
  return (
    <nav
      aria-label="주 메뉴"
      className="hidden items-center gap-1 text-[13.5px] md:flex"
    >
      {NAV_ITEMS.map((it) => {
        const active = it.match(pathname);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-md border border-accent/25 bg-accent/15 px-3 py-1.5 font-medium text-ink"
                : "rounded-md border border-transparent px-3 py-1.5 text-ink-3 transition-colors hover:text-ink-2"
            }
          >
            {it.label}
          </Link>
        );
      })}
      {/* 브릿지(외부 링크)는 탭이 아니라 헤더 우측 아이콘(SiteHeader)·모바일 시트에 둔다 —
          5면 구성에 외부 링크를 섞지 않되, 필요 지점(거래 패널 잔고 부족·내 자산·가이드·푸터) 컨텍스트 링크는 그대로 유지 */}
      {/* 온보딩 가이드는 하단 도크 상주 링크로 (헤더 밀도 절제 — 절대 규칙 3) */}
    </nav>
  );
}
