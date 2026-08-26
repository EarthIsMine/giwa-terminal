"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 상단 주 메뉴 - 항목은 실제 있는 화면만 (절대 규칙 3: 밀도를 낮춘다).
 * 순서는 기획서 5면 구성을 따르고, NFT 를 토큰 옆에 끼운다:
 * 토큰 | NFT | 분석 | 발행 | 나루 포인트 | 내 자산.
 * 같은 "자산 목록"이라 토큰과 붙여 둔다 - 분석·발행 사이에 넣으면 흐름이 끊긴다.
 * NFT 는 아직 준비 중 화면이다(팀 결정 2026-08-18: 자리를 먼저 알린다).
 * 항목 정의는 모바일 메뉴(mobile-nav)와 공유하는 단일 소스다.
 */
export const NAV_ITEMS = [
  {
    href: "/",
    label: "토큰",
    match: (p: string) => p === "/" || p.startsWith("/asset"),
  },
  {
    href: "/nft",
    label: "NFT",
    match: (p: string) => p.startsWith("/nft"),
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

/** 데스크톱 전용 - 모바일에서는 mobile-nav 드로어가 같은 항목을 보여준다 */
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
            /* 활성 탭은 박스가 아니라 진한 글자로 표시한다 (밀도 절제 - 절대 규칙 3).
               커서를 올리면 예전처럼 액센트 박스가 뜬다.
               키보드 포커스 박스는 focus-visible 이라 마우스 클릭엔 뜨지 않는다 */
            className={`rounded-md px-3 py-1.5 outline-none transition-colors hover:bg-accent/15 focus-visible:ring-1 focus-visible:ring-accent/60 ${
              active
                ? "font-semibold text-ink"
                : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
      {/* 브릿지(외부 링크)는 탭이 아니라 헤더 우측 아이콘(SiteHeader)·모바일 시트에 둔다 -
          5면 구성에 외부 링크를 섞지 않되, 필요 지점(거래 패널 잔고 부족·내 자산·가이드·푸터) 컨텍스트 링크는 그대로 유지 */}
      {/* 온보딩 가이드는 하단 도크 상주 링크로 (헤더 밀도 절제 - 절대 규칙 3) */}
    </nav>
  );
}
