"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSearch } from "@/contexts/search-context";

/**
 * 헤더 전역 검색.
 * - 홈: 입력 즉시 자산 보드를 라이브 필터 (기존 동작)
 * - 그 외 페이지: 입력 즉시 결과 드롭다운 → 클릭/Enter 로 해당 자산 상세 이동.
 *   Enter-후-이동 방식은 한글 IME 조합 중 Enter 가 삼켜져 "안 눌리는" 문제가 있어
 *   타이핑만으로 반응하는 드롭다운으로 바꿨다.
 */

interface AssetHit {
  address: `0x${string}`;
  symbol: string;
  nameKo: string;
  issuerName: string;
}

export function HeaderSearch() {
  const { query, setQuery } = useSearch();
  const router = useRouter();
  const pathname = usePathname();
  const onHome = pathname === "/";

  const [assets, setAssets] = useState<AssetHit[] | null>(null);
  const [open, setOpen] = useState(false);

  /** 자산 목록 지연 로드 — 첫 포커스에 1회, 실패 시 드롭다운만 비활성 */
  const ensureAssets = async () => {
    if (assets !== null) return;
    try {
      const res = await fetch("/api/assets");
      if (res.ok) {
        const d = (await res.json()) as { assets: AssetHit[] };
        setAssets(d.assets);
      }
    } catch {
      /* 홈 라이브 필터는 영향 없음 */
    }
  };

  const q = query.trim().toLowerCase();
  const hits =
    !onHome && q !== "" && assets
      ? assets
          .filter(
            (a) =>
              a.symbol.toLowerCase().includes(q) ||
              a.nameKo.includes(query.trim()) ||
              a.address.toLowerCase().includes(q),
          )
          .slice(0, 8)
      : [];

  const go = (address: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/asset/${address}`);
  };

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (onHome) return;
        const first = hits[0];
        if (first) go(first.address);
        else if (q !== "") router.push("/"); // 매칭 없으면 홈 보드 필터로
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
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          void ensureAssets();
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="자산 · 심볼 · 주소 검색"
        aria-label="자산 검색"
        aria-expanded={open && hits.length > 0}
        className="h-9 w-full rounded-lg border border-hairline bg-panel pl-9 pr-3 text-[13px] text-ink placeholder:text-ink-3"
      />
      {open && hits.length > 0 ? (
        <ul
          role="listbox"
          aria-label="자산 검색 결과"
          /* mousedown 기본동작 차단 — input blur 보다 클릭이 먼저 살게 한다 */
          onMouseDown={(e) => e.preventDefault()}
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-lg border border-hairline bg-[#1d140c] shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
        >
          {hits.map((h, i) => (
            <li key={h.address}>
              <button
                type="button"
                role="option"
                aria-selected={i === 0}
                onClick={() => go(h.address)}
                className={`flex w-full items-baseline gap-2 px-3.5 py-2.5 text-left text-[13px] transition-colors hover:bg-accent/10 ${i === 0 ? "bg-white/[0.03]" : ""}`}
              >
                <span className="font-semibold">{h.symbol}</span>
                <span className="min-w-0 truncate text-[12px] text-ink-3">
                  {h.nameKo} · {h.issuerName}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
