"use client";

import { giwaChain } from "@giwa/config";
import type { FeedItemWire } from "@/lib/indexer";
import { ItemBody, relativeTime, TAG } from "@/components/feed/naru-feed-item";

/**
 * 소식 드로어 - 우측에서 슬라이드해 들어온다. 닫힘 상태에서도 마운트를 유지해
 * transform 트랜지션이 살아 있게 하고, 대신 포인터 이벤트를 끈다.
 * 열림 상태는 부모(NaruFeedDock)가 React state 로만 유지한다 (브라우저 스토리지 금지 규칙).
 */
export function NaruFeedDrawer({
  open,
  onClose,
  items,
  ethKrw,
}: {
  open: boolean;
  onClose: () => void;
  items: FeedItemWire[];
  ethKrw: bigint | null;
}) {
  return (
    <div
      className={`fixed inset-0 z-40 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="나루터 소식 닫기"
        onClick={onClose}
        className={`absolute inset-0 cursor-default bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <aside
        aria-label="나루터 소식 목록"
        /* 모바일은 전폭, sm 이상부터 우측 패널 폭으로 */
        className={`absolute right-0 top-0 flex h-full w-full flex-col border-l border-hairline bg-[#160e07]/97 shadow-[-24px_0_80px_rgba(0,0,0,0.5)] backdrop-blur-md transition-transform duration-300 ease-out sm:w-[420px] xl:w-[30%] xl:min-w-[420px] xl:max-w-[560px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between border-b border-black/40 px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <h2 className="flex items-center gap-2 text-[16px] font-semibold">
              <span
                aria-hidden
                className="size-1.5 rounded-full bg-good animate-pulse-dot"
              />
              나루터 소식
            </h2>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">
              중대형 체결 · 예치 변동 · 신규 상장
            </p>
          </div>
          <button
            type="button"
            tabIndex={open ? 0 : -1}
            aria-label="닫기"
            onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded-lg border border-hairline text-ink-3 transition-colors hover:border-ink-3/40 hover:text-ink-2"
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

        <ul className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6">
          {items.map((item) => (
            <li
              key={item.id}
              className="border-b border-black/30 py-3 text-[12.5px] leading-relaxed last:border-0"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`shrink-0 rounded px-1.5 py-[2px] text-[11px] font-semibold ${TAG[item.type].className(item.side)}`}
                >
                  {TAG[item.type].label(item.side)}
                </span>
                <span className="ml-auto flex shrink-0 items-center gap-2 font-mono text-[11.5px] text-ink-3">
                  {item.txHash ? (
                    <a
                      href={`${giwaChain.explorerUrl}/tx/${item.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="transition-colors hover:text-accent"
                      title="이 거래의 원본 기록 보기"
                    >
                      tx ↗
                    </a>
                  ) : null}
                  {relativeTime(item.timestamp)}
                </span>
              </div>
              <p className="mt-1.5 text-ink-2">
                <ItemBody item={item} ethKrw={ethKrw} />
              </p>
            </li>
          ))}
        </ul>

        <p className="border-t border-black/40 px-4 py-4 sm:px-6 text-[11px] leading-relaxed text-ink-3">
          테스트넷 시드 데이터입니다. 사실 서술만 제공하며 투자 권유가
          아닙니다.
        </p>
      </aside>
    </div>
  );
}
