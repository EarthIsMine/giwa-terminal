"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { giwaChain } from "@giwa/config";

/**
 * 상단 주 메뉴 — 항목은 실제 있는 화면만 (절대 규칙 3: 밀도를 낮춘다).
 * 토큰(목록·상세) / 발행(신원 게이트 전제) / 내 자산(보유 포트폴리오)
 */
const ITEMS = [
  {
    href: "/",
    label: "토큰",
    match: (p: string) => p === "/" || p.startsWith("/asset"),
  },
  {
    href: "/launch",
    label: "발행",
    match: (p: string) => p.startsWith("/launch"),
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
      {/* 공식 네이티브 브릿지 — 외부 이동. 동선 순서: 자산을 건너온(브릿지) 뒤 내 자산 확인 */}
      <a
        href={giwaChain.bridgeUrl}
        target="_blank"
        rel="noreferrer"
        className="rounded-md border border-transparent px-3 py-1.5 text-ink-3 transition-colors hover:text-ink-2"
      >
        브릿지
      </a>
      {item("/portfolio", "내 자산", pathname.startsWith("/portfolio"))}
    </nav>
  );
}
