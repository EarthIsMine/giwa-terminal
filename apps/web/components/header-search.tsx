"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSearch } from "./search-context";

/** 헤더 전역 검색 — 홈에서는 즉시 필터, 다른 페이지에서는 Enter 시 홈으로 이동 */
export function HeaderSearch() {
  const { query, setQuery } = useSearch();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (pathname !== "/") router.push("/");
      }}
      className="relative hidden w-full max-w-[320px] md:block"
    >
      <svg
        viewBox="0 0 16 16"
        width={14}
        height={14}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        aria-hidden
        className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
      >
        <circle cx="7" cy="7" r="4.5" />
        <path d="M13.5 13.5l-3.2-3.2" />
      </svg>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="자산 · 심볼 · 주소 검색"
        aria-label="자산 검색"
        className="h-9 w-full rounded-lg border border-hairline bg-panel pl-9 pr-3 text-[13px] text-ink placeholder:text-ink-3"
      />
    </form>
  );
}
