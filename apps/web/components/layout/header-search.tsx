"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSearch } from "@/contexts/search-context";
import { useAutoFocus } from "@/hooks/use-auto-focus";
import { useEscapeKey } from "@/hooks/use-escape-key";

/**
 * 헤더 전역 검색 - 트리거 버튼 + 모달(2026-08-29 개편).
 * 이전에는 헤더 인라인 입력 + 드롭다운이었는데, 클릭하면 모달을 띄우는
 * 커맨드 팔레트 방식으로 바꿨다. 좁은 헤더 폭에 드롭다운을 구겨 넣는 대신
 * 화면 중앙에서 넉넉히 보여준다.
 * - 결과 클릭/Enter → 자산 상세 이동
 * - 매칭 없이 Enter → 전역 query 로 홈 보드 필터 (기존 폴백 유지)
 * - 한글 IME 조합 중 Enter/화살표는 무시한다 (isComposing)
 */

interface AssetHit {
  address: `0x${string}`;
  symbol: string;
  nameKo: string;
  issuerName: string;
}

const SearchIcon = ({ size = 14 }: { size?: number }) => (
  <svg
    viewBox="0 0 16 16"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    aria-hidden
  >
    <circle cx="7" cy="7" r="4.5" />
    <path d="M13.5 13.5l-3.2-3.2" />
  </svg>
);

/**
 * @param onSearched 검색이 "동작을 마쳤다"고 알리는 신호 - 자산으로 이동했거나
 *   보드 필터가 걸렸을 때 호출한다. 모바일 시트처럼 트리거를 품은 호스트가
 *   스스로 비켜서라고 쓰는 용도. 데스크톱 헤더는 넘기지 않는다.
 */
export function HeaderSearch({ onSearched }: { onSearched?: () => void }) {
  const { query: boardQuery, setQuery: setBoardQuery } = useSearch();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  /** 모달 안 입력은 로컬 상태 - 타이핑 중 보드가 뒤에서 같이 필터되지 않게 분리 */
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(0);
  const [assets, setAssets] = useState<AssetHit[] | null>(null);

  const inputRef = useAutoFocus<HTMLInputElement>(open);
  useEscapeKey(open, () => setOpen(false));

  /** 자산 목록 지연 로드 - 첫 열림에 1회, 실패 시 결과만 비활성 */
  const ensureAssets = async () => {
    if (assets !== null) return;
    try {
      const res = await fetch("/api/assets");
      if (res.ok) {
        const d = (await res.json()) as { assets: AssetHit[] };
        setAssets(d.assets);
      }
    } catch {
      /* 폴백(보드 필터)은 영향 없음 */
    }
  };

  const openModal = () => {
    setQ(boardQuery); // 보드 필터가 걸려 있으면 이어서 수정
    setSelected(0);
    setOpen(true);
    void ensureAssets();
  };

  const trimmed = q.trim().toLowerCase();
  const hits =
    trimmed !== "" && assets
      ? assets
          .filter(
            (a) =>
              a.symbol.toLowerCase().includes(trimmed) ||
              a.nameKo.includes(q.trim()) ||
              a.address.toLowerCase().includes(trimmed),
          )
          .slice(0, 8)
      : [];

  const close = () => setOpen(false);

  const goAsset = (address: string) => {
    close();
    setBoardQuery("");
    onSearched?.();
    router.push(`/asset/${address}`);
  };

  /** 매칭 없거나 빈 입력으로 Enter - 홈 보드 필터로 폴백 (빈 입력은 필터 해제) */
  const goBoardFilter = () => {
    close();
    setBoardQuery(q.trim());
    onSearched?.();
    router.push("/");
  };

  return (
    <>
      {/* 트리거 - 입력창처럼 생긴 버튼. 표시/폭 제한은 배치하는 쪽 책임 */}
      <button
        type="button"
        onClick={openModal}
        aria-label="자산 검색 열기"
        aria-haspopup="dialog"
        className="flex h-9 w-full items-center gap-2.5 rounded-lg border border-hairline bg-panel px-3 text-[13px] text-ink-3 transition-colors hover:border-ink-3/40 hover:text-ink-2 md:max-w-[320px]"
      >
        <SearchIcon />
        <span className="truncate">
          {boardQuery.trim() !== "" ? boardQuery : "자산 · 심볼 · 주소 검색"}
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="검색 닫기"
            onClick={close}
            className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-[2px]"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="자산 검색"
            className="relative mx-auto mt-[14vh] w-[calc(100%-32px)] max-w-[520px] overflow-hidden rounded-xl border border-hairline bg-[#1d140c] shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-center gap-2.5 border-b border-hairline/60 px-4">
              <span className="text-ink-3">
                <SearchIcon size={15} />
              </span>
              <input
                ref={inputRef}
                type="search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSelected(0);
                }}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return; // 한글 IME 조합 중 무시
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSelected((s) => Math.min(s + 1, hits.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelected((s) => Math.max(s - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    const hit = hits[selected] ?? hits[0];
                    if (hit) goAsset(hit.address);
                    else goBoardFilter();
                  }
                }}
                placeholder="자산 · 심볼 · 주소 검색"
                aria-label="자산 검색"
                className="h-12 w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
              />
              <kbd className="rounded border border-hairline px-1.5 py-0.5 font-mono text-[10px] text-ink-3">
                ESC
              </kbd>
            </div>

            {hits.length > 0 ? (
              <ul role="listbox" aria-label="자산 검색 결과" className="py-1.5">
                {hits.map((h, i) => (
                  <li key={h.address}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === selected}
                      onClick={() => goAsset(h.address)}
                      onMouseEnter={() => setSelected(i)}
                      className={`flex w-full items-baseline gap-2 px-4 py-2.5 text-left text-[13.5px] transition-colors ${i === selected ? "bg-accent/10" : ""}`}
                    >
                      <span className="font-semibold">{h.symbol}</span>
                      <span className="min-w-0 truncate text-[12px] text-ink-3">
                        {h.nameKo} · {h.issuerName}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : trimmed !== "" ? (
              <p className="px-4 py-5 text-[13px] text-ink-3">
                일치하는 자산이 없습니다. Enter 를 누르면 홈 목록에서
                검색어로 걸러봅니다.
              </p>
            ) : (
              <p className="px-4 py-5 text-[13px] text-ink-3">
                심볼(예: NARU), 한글 이름, 컨트랙트 주소로 검색합니다.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
