"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef, Row, SortingState } from "@tanstack/react-table";
import {
  STAT_WINDOWS,
  STAT_WINDOW_LABEL,
  formatChangeBps,
  formatCount,
  formatEth,
  formatKrw,
  formatKrwCompact,
  weiToDisplayKrw,
} from "@giwa/shared";
import type { StatWindow, VerifiedAsset, WeiAmount } from "@giwa/shared";
import { MOCK_ETH_KRW, SEED_ASSETS } from "@/lib/seed-data";
import { AssetAvatar } from "./asset-avatar";
import { AssetLinksIcons } from "./asset-links";
import { CopyAddress } from "./copy-address";
import { useSearch } from "./search-context";
import { Sparkline } from "./sparkline";
import { VerifiedBadge } from "./verified-badge";

/* ---------- 표시 유틸 ---------- */

function krw(v: WeiAmount): string {
  return formatKrw(weiToDisplayKrw(v, MOCK_ETH_KRW));
}

function cmpBigint(a: bigint, b: bigint): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function changeColor(bps: number): string {
  // 색 관례(팀 결정): 상승 초록 / 하락 빨강
  return bps > 0 ? "text-up" : bps < 0 ? "text-down" : "text-ink-3";
}

/** "1.27억" → 숫자와 단위를 분리해 단위를 한 단계 죽인다 */
function KrwCompact({ v }: { v: WeiAmount }) {
  const s = formatKrwCompact(weiToDisplayKrw(v, MOCK_ETH_KRW));
  const m = /^([\d,.]+)(억|만)?$/.exec(s);
  const num = m?.[1] ?? s;
  const unit = m?.[2];
  return (
    <span className="font-mono text-[13px] tabular-nums">
      {num}
      {unit ? (
        <span className="ml-0.5 font-sans text-[11px] text-ink-3">{unit}</span>
      ) : null}
    </span>
  );
}

/* ---------- 자산 셀 ---------- */

function AssetCell({ asset }: { asset: VerifiedAsset }) {
  return (
    <div className="flex items-center gap-2.5">
      <AssetAvatar asset={asset} size={30} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <Link
            href={`/asset/${asset.address}`}
            onClick={(e) => e.stopPropagation()}
            className="text-[13.5px] font-semibold tracking-wide"
          >
            {asset.symbol}
          </Link>
          <VerifiedBadge verification={asset.verification} />
          {asset.isQuoteAnchor ? (
            <span className="rounded border border-hairline px-1 py-px text-[9.5px] text-ink-3">
              기준 자산
            </span>
          ) : null}
          <CopyAddress address={asset.address} />
          <AssetLinksIcons links={asset.links} />
        </div>
        <p className="mt-0.5 text-[11.5px] text-ink-3">{asset.nameKo}</p>
      </div>
    </div>
  );
}

/* ---------- 보드 ---------- */

const RIGHT_ALIGNED = new Set(["price", "change", "volume", "traders", "liquidity"]);

/** 컬럼별 고정 폭 — 나머지는 자산 컬럼이 흡수한다 */
const COL_WIDTH: Record<string, string> = {
  trend: "w-[170px]",
  price: "w-[170px]",
  change: "w-[120px]",
  volume: "w-[140px]",
  traders: "w-[120px]",
  liquidity: "w-[140px]",
};

export function AssetBoard() {
  const router = useRouter();
  const { query } = useSearch();
  const [win, setWin] = useState<StatWindow>("today");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "volume", desc: true },
  ]);

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") return [...SEED_ASSETS];
    return SEED_ASSETS.filter(
      (a) =>
        a.symbol.toLowerCase().includes(q) ||
        a.nameKo.includes(q) ||
        a.address.toLowerCase().includes(q),
    );
  }, [query]);

  const columns = useMemo<ColumnDef<VerifiedAsset>[]>(
    () => [
      {
        id: "asset",
        header: "자산",
        enableSorting: false,
        cell: ({ row }) => <AssetCell asset={row.original} />,
      },
      {
        id: "trend",
        header: "추세",
        enableSorting: false,
        cell: ({ row }) => (
          <Sparkline
            points={row.original.stats[win].trend}
            changeBps={row.original.stats[win].changeBps}
            height={26}
            label={`${row.original.nameKo} ${STAT_WINDOW_LABEL[win]} 가격 추이`}
          />
        ),
      },
      {
        id: "price",
        accessorFn: (a) => a.priceWei,
        header: "현재가",
        sortDescFirst: true,
        sortingFn: (a: Row<VerifiedAsset>, b: Row<VerifiedAsset>) =>
          cmpBigint(a.original.priceWei, b.original.priceWei),
        cell: ({ row }) => (
          <div>
            <p className="font-mono text-[13.5px] font-medium tabular-nums">
              <span className="mr-px text-ink-2">₩</span>
              {krw(row.original.priceWei)}
            </p>
            <p className="mt-0.5 font-mono text-[10.5px] tabular-nums text-ink-3">
              {formatEth(row.original.priceWei, 8)} ETH
            </p>
          </div>
        ),
      },
      {
        id: "change",
        accessorFn: (a) => a.stats[win].changeBps,
        header: `${STAT_WINDOW_LABEL[win]} 변동`,
        sortDescFirst: true,
        cell: ({ row }) => {
          const bps = row.original.stats[win].changeBps;
          return (
            <span
              className={`font-mono text-[13px] font-medium tabular-nums ${changeColor(bps)}`}
            >
              {formatChangeBps(bps)}
            </span>
          );
        },
      },
      {
        id: "volume",
        accessorFn: (a) => a.stats[win].volumeWei,
        header: "거래대금",
        sortDescFirst: true,
        sortingFn: (a: Row<VerifiedAsset>, b: Row<VerifiedAsset>) =>
          cmpBigint(a.original.stats[win].volumeWei, b.original.stats[win].volumeWei),
        cell: ({ row }) => <KrwCompact v={row.original.stats[win].volumeWei} />,
      },
      {
        id: "traders",
        accessorFn: (a) => a.stats[win].traders,
        header: "참여 인원",
        sortDescFirst: true,
        cell: ({ row }) => (
          <span className="font-mono text-[13px] tabular-nums">
            {formatCount(row.original.stats[win].traders)}
            <span className="ml-0.5 font-sans text-[11px] text-ink-3">명</span>
          </span>
        ),
      },
      {
        id: "liquidity",
        accessorFn: (a) => a.liquidityWei,
        header: "예치 규모",
        sortDescFirst: true,
        sortingFn: (a: Row<VerifiedAsset>, b: Row<VerifiedAsset>) =>
          cmpBigint(a.original.liquidityWei, b.original.liquidityWei),
        cell: ({ row }) => <KrwCompact v={row.original.liquidityWei} />,
      },
    ],
    [win],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;

  return (
    <div>
      {/* 툴바 — 레퍼런스처럼 우측 정렬 */}
      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <div
          role="group"
          aria-label="집계 기간"
          className="inline-flex rounded-lg border border-hairline bg-panel p-0.5"
        >
          {STAT_WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={win === w}
              onClick={() => setWin(w)}
              className={`rounded-md px-3 py-1 text-[12px] transition-colors ${
                win === w
                  ? "border border-accent/25 bg-accent/15 font-medium text-ink"
                  : "border border-transparent text-ink-3 hover:text-ink-2"
              }`}
            >
              {STAT_WINDOW_LABEL[w]}
            </button>
          ))}
        </div>

        <button
          type="button"
          title="새로고침"
          aria-label="새로고침"
          onClick={() => window.location.reload()}
          className="grid size-8 place-items-center rounded-lg border border-hairline bg-panel text-ink-3 transition-colors hover:text-ink-2"
        >
          <svg
            viewBox="0 0 16 16"
            width={13}
            height={13}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
            <path d="M13.5 1.8v2.7h-2.7" />
          </svg>
        </button>

        {/* 테스트넷 표시 칩 — 시드 데이터 상세 고지는 푸터에 유지 (절대 규칙 5) */}
        <span className="flex h-8 items-center gap-2 rounded-lg border border-hairline bg-panel px-2.5 text-[12px] text-ink-2">
          <span
            aria-hidden
            className="size-1.5 rounded-full bg-warn animate-pulse-dot"
          />
          테스트넷
        </span>
      </div>

      {/* 테이블 */}
      <div className="mt-4 overflow-hidden rounded-xl carved">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1240px] border-collapse text-left">
            <caption className="sr-only">
              기와체인 검증 자산 목록 — 가격, 변동, 거래대금, 참여 인원, 예치
              규모
            </caption>
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr
                  key={hg.id}
                  className="border-b border-black/45 bg-[#120c06]/[0.97]"
                >
                  <th
                    scope="col"
                    className="w-12 py-2.5 pl-5 pr-2 text-[10.5px] font-medium tracking-[0.1em] text-ink-3"
                  >
                    #
                  </th>
                  {hg.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    const right = RIGHT_ALIGNED.has(header.column.id);
                    return (
                      <th
                        key={header.id}
                        scope="col"
                        aria-sort={
                          sorted === "asc"
                            ? "ascending"
                            : sorted === "desc"
                              ? "descending"
                              : undefined
                        }
                        className={`px-4 py-2.5 text-[10.5px] font-medium tracking-[0.1em] text-ink-3 ${right ? "text-right" : ""} ${COL_WIDTH[header.column.id] ?? ""}`}
                      >
                        {header.column.getCanSort() ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="inline-flex items-center gap-1 transition-colors hover:text-ink-2"
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            <span aria-hidden className="text-[9px]">
                              {sorted === "asc"
                                ? "▲"
                                : sorted === "desc"
                                  ? "▼"
                                  : ""}
                            </span>
                          </button>
                        ) : (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr className="bg-[#1e150d]/[0.96]">
                  <td
                    colSpan={8}
                    className="py-14 text-center text-[13.5px] text-ink-3"
                  >
                    {`"${query}" 검색 결과가 없습니다`}
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr
                    key={row.id}
                    onClick={() =>
                      router.push(`/asset/${row.original.address}`)
                    }
                    className={`cursor-pointer border-b border-black/25 transition-colors last:border-0 hover:bg-[#2c1d10]/[0.96] ${
                      i % 2 === 0
                        ? "bg-[#1e150d]/[0.96]"
                        : "bg-[#191008]/[0.96]"
                    }`}
                  >
                    <td className="py-1.5 pl-5 pr-2 font-mono text-[11px] text-ink-3">
                      #{i + 1}
                    </td>
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={`px-4 py-1.5 ${RIGHT_ALIGNED.has(cell.column.id) ? "text-right" : ""}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 환산 고지 (절대 규칙 1: 환산 표시임을 항상 밝힌다) */}
      <div className="mt-3 space-y-1 text-[11.5px] leading-relaxed text-ink-3">
        <p>
          · 원화 금액은 업비트 KRW-ETH 시세(₩
          {formatCount(Number(MOCK_ETH_KRW))} · 데모 고정값)로 환산한
          참고값입니다. 원화 자산이 온체인에 존재하는 것은 아닙니다.
        </p>
        <p>
          · 변동은 각 기간 시가 대비, 참여 인원은 기간 내 고유 지갑 수, 예치
          규모는 풀 보유 기준 자산 잔고 × 2 기준입니다.
        </p>
      </div>
    </div>
  );
}
