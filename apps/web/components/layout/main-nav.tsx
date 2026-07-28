"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 상단 주 메뉴 — 항목은 실제 있는 화면만 (절대 규칙 3: 밀도를 낮춘다).
 * 순서는 5면 구성을 따른다: 토큰 | 분석 | 발행 | 나루 포인트 | 내 자산
 */
const ITEMS = [
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
] as const;

export function MainNav() {
  const pathname = usePathname() ?? "/";
  const item = (href: string, label: string, active: boolean) => (
    <Link
      key={href}
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "rounded-md border border-accent/25 bg-accent/15 px-3 py-1.5 font-medium text-ink"
          : "rounded-md border border-transparent px-3 py-1.5 text-ink-3 transition-colors hover:text-ink-2"
      }
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label="주 메뉴" className="flex items-center gap-1 text-[13.5px]">
      {ITEMS.map((it) => item(it.href, it.label, it.match(pathname)))}
      {/* 브릿지(외부 링크)는 네비에서 제외 — 필요 지점(거래 패널 잔고 부족·내 자산·가이드·푸터)에 컨텍스트로 둔다 */}
      {item("/portfolio", "내 자산", pathname.startsWith("/portfolio"))}
      {/* 온보딩 가이드는 하단 도크 상주 링크로 (헤더 밀도 절제 — 절대 규칙 3) */}
    </nav>
  );
}
