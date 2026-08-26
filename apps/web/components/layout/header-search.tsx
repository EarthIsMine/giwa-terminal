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

/**
 * @param onSearched 검색이 "동작을 마쳤다"고 알리는 신호 - 자산으로 이동했거나,
 *   홈에서 보드 필터가 걸렸을 때 호출한다. 모바일 시트처럼 검색창을 덮고 있는
 *   호스트가 스스로 비켜서라고 쓰는 용도다(홈에서는 라우트가 안 바뀌어
 *   pathname 변화로는 알 수 없다). 데스크톱 헤더는 넘기지 않는다.
 */
export function HeaderSearch({ onSearched }: { onSearched?: () => void }) {
  const { query, setQuery } = useSearch();
  const router = useRouter();
  const pathname = usePathname();
  const onHome = pathname === "/";

  const [assets, setAssets] = useState<AssetHit[] | null>(null);
  const [open, setOpen] = useState(false);

  /** 자산 목록 지연 로드 - 첫 포커스에 1회, 실패 시 드롭다운만 비활성 */
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
    onSearched?.();
    router.push(`/asset/${address}`);
  };

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        // 홈은 라우트 이동이 없다 - 입력 즉시 보드가 걸러지므로 Enter 는
        // "결과를 보여달라"는 뜻이 된다. 검색창을 덮고 있는 호스트를 비켜세운다
        if (onHome) {
          onSearched?.();
          return;
        }
        const first = hits[0];
        if (first) go(first.address);
        else if (q !== "") {
          onSearched?.();
          router.push("/"); // 매칭 없으면 홈 보드 필터로
        }
      }}
      /* 표시/숨김·폭 제한은 배치하는 쪽 책임 - 헤더(데스크톱)와 모바일 시트가 다르게 감싼다 */
      className="relative w-full md:max-w-[320px]"
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
          /* mousedown 기본동작 차단 - input blur 보다 클릭이 먼저 살게 한다 */
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
