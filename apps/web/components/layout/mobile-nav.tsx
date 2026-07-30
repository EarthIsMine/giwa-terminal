"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { giwaChain } from "@giwa/config";
import { SITE_LINKS } from "@/lib/site";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { useIsMobile } from "@/hooks/use-media-query";
import { HeaderSearch } from "@/components/layout/header-search";
import { NAV_ITEMS } from "@/components/layout/main-nav";
import { TelegramIcon, XIcon } from "@/components/ui/social-icons";

/**
 * 모바일 헤더 메뉴 — 햄버거 버튼 + 위에서 내려오는 시트.
 * 데스크톱 MainNav·HeaderSearch 와 항목·검색을 공유하되 터치 타깃 크기로 다시 그린다.
 * 시트는 body 포털로 띄운다 — 헤더의 backdrop-filter 가 fixed 기준을 가로챈다
 * (로그인 모달과 같은 이유). 열림 상태는 React state 로만 유지한다 (스토리지 금지 규칙).
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "/";
  const isMobile = useIsMobile();

  useEscapeKey(open, () => setOpen(false));

  /* 라우트가 바뀌면 닫는다 — 링크 이동 후 시트가 화면을 덮은 채 남는 것 방지 */
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  /* 뷰포트가 데스크톱으로 넓어지면 닫는다 — md 이상에선 트리거 자체가 사라진다 */
  useEffect(() => {
    if (!isMobile) setOpen(false);
  }, [isMobile]);

  /* 시트가 열린 동안 배경 스크롤 잠금 (로그인 모달과 같은 관례) */
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        onClick={() => setOpen((v) => !v)}
        className="grid size-9 place-items-center rounded-lg border border-hairline text-ink-2 transition-colors hover:text-ink"
      >
        <svg
          viewBox="0 0 16 16"
          width={15}
          height={15}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden
        >
          {open ? (
            <path d="M3 3l10 10M13 3L3 13" />
          ) : (
            <path d="M2 4.5h12M2 8h12M2 11.5h12" />
          )}
        </svg>
      </button>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-50 md:hidden">
              <button
                type="button"
                aria-label="메뉴 닫기"
                onClick={() => setOpen(false)}
                className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px]"
              />
              <nav
                aria-label="주 메뉴"
                className="relative max-h-full overflow-y-auto border-b border-black/50 bg-[#1d140c] px-4 pb-6 pt-3 shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
              >
                <div className="flex items-center justify-between">
                  <p className="px-1 text-[13px] font-semibold text-ink-2">
                    메뉴
                  </p>
                  <button
                    type="button"
                    aria-label="메뉴 닫기"
                    onClick={() => setOpen(false)}
                    className="grid size-9 place-items-center rounded-lg border border-hairline text-ink-3 transition-colors hover:text-ink-2"
                  >
                    <svg
                      viewBox="0 0 12 12"
                      width={11}
                      height={11}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      aria-hidden
                    >
                      <path d="M2 2l8 8M10 2l-8 8" />
                    </svg>
                  </button>
                </div>

                <div className="mt-3">
                  <HeaderSearch />
                </div>

                <ul className="mt-4 space-y-1">
                  {NAV_ITEMS.map((it) => {
                    const active = it.match(pathname);
                    return (
                      <li key={it.href}>
                        <Link
                          href={it.href}
                          aria-current={active ? "page" : undefined}
                          className={`block rounded-lg px-4 py-3 text-[15px] font-medium ${
                            active
                              ? "border border-accent/25 bg-accent/15 text-ink"
                              : "text-ink-2 transition-colors hover:bg-white/[0.04] hover:text-ink"
                          }`}
                        >
                          {it.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-5 flex items-center gap-4 border-t border-black/40 px-4 pt-4 text-ink-3">
                  <a
                    href={SITE_LINKS.x}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="나루 X 계정"
                    className="transition-colors hover:text-ink-2"
                  >
                    <XIcon size={15} />
                  </a>
                  <a
                    href={SITE_LINKS.telegram}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="나루 텔레그램 채널"
                    className="transition-colors hover:text-ink-2"
                  >
                    <TelegramIcon size={16} />
                  </a>
                  {/* 데스크톱 헤더의 아이콘 두 개(브릿지·익스플로러)를 여기서 글자로 받는다 */}
                  <a
                    href={giwaChain.bridgeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto text-[12.5px] transition-colors hover:text-ink-2"
                  >
                    브릿지 ↗
                  </a>
                  <a
                    href={giwaChain.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12.5px] transition-colors hover:text-ink-2"
                  >
                    익스플로러 ↗
                  </a>
                </div>
              </nav>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
