"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 상단 주 메뉴 — 항목은 실제 있는 화면만 (절대 규칙 3: 밀도를 낮춘다).
 * 자산(목록·상세) / 발행(신원 게이트 전제) / 내 자산(준비 중)
 */
const ITEMS = [
  {
    href: "/",
    label: "자산",
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
  return (
    <nav aria-label="주 메뉴" className="flex items-center gap-1 text-[13.5px]">
      {ITEMS.map((it) => {
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
      <span className="flex cursor-default items-center gap-1.5 rounded-md px-3 py-1.5 text-ink-3">
        내 자산
        <span className="rounded border border-hairline px-1 py-px text-[9.5px] text-ink-3">
          준비 중
        </span>
      </span>
    </nav>
  );
}
