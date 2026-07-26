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
import { explorerAddressUrl } from "@giwa/config";
import {
  formatCount,
  formatEth,
  formatKrw,
  formatKrwCompact,
  shortHex,
  wei,
  weiToDisplayKrw,
} from "@giwa/shared";
import type { AssetVerification, WeiAmount } from "@giwa/shared";
import type { LiveAssetWire } from "@/lib/onchain";
import { AssetAvatar } from "./asset-avatar";
import { CopyAddress } from "./copy-address";
import { useSearch } from "./search-context";
import { VerifiedBadge } from "./verified-badge";

/**
 * 자산 보드 — GIWA Sepolia 온체인 실데이터 (목데이터 제거, 2026-07-22).
 * 현재가·예치 규모는 페어 준비금에서, 자산 메타는 발행 게이트 레지스트리에서 온다.
 * 변동·거래량·참여 인원 지표는 이벤트 집계가 필요해 인덱서 연결 후 복원한다.
 */

interface LiveAsset {
  address: `0x${string}`;
  pair: `0x${string}`;
  symbol: string;
  nameKo: string;
  issuerName: string;
  priceWei: WeiAmount;
  liquidityWei: WeiAmount;
  verification: AssetVerification;
}

function cmpBigint(a: bigint, b: bigint): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** "1.27억" → 숫자와 단위를 분리해 단위를 한 단계 죽인다 */
function KrwCompact({ v, ethKrw }: { v: WeiAmount; ethKrw: bigint }) {
  const s = formatKrwCompact(weiToDisplayKrw(v, ethKrw));
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

function AssetCell({ asset }: { asset: LiveAsset }) {
  return (
    <div className="flex items-center gap-2.5">
      <AssetAvatar symbol={asset.symbol} size={30} />
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
          <CopyAddress address={asset.address} />
        </div>
        <p className="mt-0.5 text-[11.5px] text-ink-3">{asset.nameKo}</p>
      </div>
    </div>
  );
}

const RIGHT_ALIGNED = new Set(["price", "liquidity", "onchain"]);

/** 컬럼별 고정 폭 — 나머지는 자산 컬럼이 흡수한다 */
const COL_WIDTH: Record<string, string> = {
  issuer: "w-[200px]",
  price: "w-[220px]",
  liquidity: "w-[180px]",
  onchain: "w-[170px]",
};

export function AssetBoard({
  assets,
  ethKrw: ethKrwRaw,
}: {
  assets: LiveAssetWire[];
  ethKrw: string | null;
}) {
  const router = useRouter();
  const { query } = useSearch();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "liquidity", desc: true },
  ]);

  const ethKrw = useMemo(() => (ethKrwRaw ? BigInt(ethKrwRaw) : null), [ethKrwRaw]);

  const data = useMemo<LiveAsset[]>(() => {
    const parsed = assets.map((a) => ({
      address: a.address,
      pair: a.pair,
      symbol: a.symbol,
      nameKo: a.nameKo,
      issuerName: a.issuerName,
      priceWei: wei(BigInt(a.priceWei)),
      liquidityWei: wei(BigInt(a.liquidityWei)),
      verification: a.verification,
    }));
    const q = query.trim().toLowerCase();
    if (q === "") return parsed;
    return parsed.filter(
      (a) =>
        a.symbol.toLowerCase().includes(q) ||
        a.nameKo.includes(q) ||
        a.address.toLowerCase().includes(q),
    );
  }, [assets, query]);

  const columns = useMemo<ColumnDef<LiveAsset>[]>(
    () => [
      {
        id: "asset",
        header: "자산",
        enableSorting: false,
        cell: ({ row }) => <AssetCell asset={row.original} />,
      },
      {
        id: "issuer",
        header: "발행자",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-[12.5px] text-ink-2">
            {row.original.issuerName}
          </span>
        ),
      },
      {
        id: "price",
        accessorFn: (a) => a.priceWei,
        header: "현재가",
        sortDescFirst: true,
        sortingFn: (a: Row<LiveAsset>, b: Row<LiveAsset>) =>
          cmpBigint(a.original.priceWei, b.original.priceWei),
        cell: ({ row }) =>
          ethKrw ? (
            <div>
              <p className="font-mono text-[13.5px] font-medium tabular-nums">
                <span className="mr-px text-ink-2">₩</span>
                {formatKrw(weiToDisplayKrw(row.original.priceWei, ethKrw))}
              </p>
              <p className="mt-0.5 font-mono text-[11.5px] tabular-nums text-ink-3">
                {formatEth(row.original.priceWei, 8)} ETH
              </p>
            </div>
          ) : (
            <p className="font-mono text-[13.5px] font-medium tabular-nums">
              {formatEth(row.original.priceWei, 8)}{" "}
              <span className="text-[11px] text-ink-3">ETH</span>
            </p>
          ),
      },
      {
        id: "liquidity",
        accessorFn: (a) => a.liquidityWei,
        header: "예치 규모",
        sortDescFirst: true,
        sortingFn: (a: Row<LiveAsset>, b: Row<LiveAsset>) =>
          cmpBigint(a.original.liquidityWei, b.original.liquidityWei),
        cell: ({ row }) =>
          ethKrw ? (
            <KrwCompact v={row.original.liquidityWei} ethKrw={ethKrw} />
          ) : (
            <span className="font-mono text-[13px] tabular-nums">
              {formatEth(row.original.liquidityWei, 4)}{" "}
              <span className="text-[11px] text-ink-3">ETH</span>
            </span>
          ),
      },
      {
        id: "onchain",
        header: "온체인",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-2.5 font-mono text-[11.5px]">
            <a
              href={explorerAddressUrl(row.original.address)}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-ink-3 transition-colors hover:text-accent"
              title="토큰 컨트랙트"
            >
              {shortHex(row.original.address, 6, 4)} ↗
            </a>
          </span>
        ),
      },
    ],
    [ethKrw],
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
      {/* 툴바 — 온체인 실시간 상태 + 새로고침 (기간 토글은 인덱서 연결 시 복원) */}
      <div className="flex flex-wrap items-center justify-end gap-2.5 px-8">
        <span className="flex h-8 items-center gap-2 rounded-lg border border-hairline bg-panel px-2.5 text-[12px] text-ink-2">
          <span aria-hidden className="size-1.5 rounded-full bg-good animate-pulse-dot" />
          온체인 실시간
        </span>

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

      {/* 테이블 — 감싸는 패널 없이 전폭으로 펼친다. 행은 투명하게 두고
          영역 전체에 옅은 그늘 하나만 얹어 나무 결이 그대로 비치게 한다 */}
      <div className="mt-4 border-y border-black/45 bg-black/[0.12]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-left">
            <caption className="sr-only">
              기와체인 검증 자산 목록. 온체인 실데이터: 현재가, 예치 규모,
              발행자
            </caption>
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr
                  key={hg.id}
                  className="border-b border-black/45 bg-[#120c06]/[0.97]"
                >
                  <th
                    scope="col"
                    className="w-14 py-2.5 pl-8 pr-2 text-[11.5px] font-medium tracking-[0.1em] text-ink-3"
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
                        className={`px-4 py-2.5 text-[11.5px] font-medium tracking-[0.1em] text-ink-3 last:pr-8 ${right ? "text-right" : ""} ${COL_WIDTH[header.column.id] ?? ""}`}
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
                <tr>
                  <td
                    colSpan={6}
                    className="py-14 text-center text-[13.5px] text-ink-3"
                  >
                    {query.trim() === ""
                      ? "온체인 자산을 불러오는 중이거나 아직 발행된 자산이 없습니다"
                      : `"${query}" 검색 결과가 없습니다`}
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr
                    key={row.id}
                    onClick={() =>
                      router.push(`/asset/${row.original.address}`)
                    }
                    className="cursor-pointer border-b border-black/30 transition-colors last:border-0 hover:bg-black/30"
                  >
                    <td className="py-2.5 pl-8 pr-2 font-mono text-[11px] text-ink-3">
                      #{i + 1}
                    </td>
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={`px-4 py-2.5 last:pr-8 ${RIGHT_ALIGNED.has(cell.column.id) ? "text-right" : ""}`}
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

      {/* 환산·집계 고지 (절대 규칙 1·5) */}
      <div className="mt-3 space-y-1 px-8 text-[11.5px] leading-relaxed text-ink-3">
        <p>
          {ethKrw
            ? `· 원화 금액은 업비트 KRW-ETH 시세(₩${formatCount(Number(ethKrw))} · 60초 갱신)로 환산한 참고값입니다. 원화 자산이 온체인에 존재하는 것은 아닙니다.`
            : "· 업비트 시세 조회가 일시적으로 불가해 ETH 단위로 표시 중입니다."}
        </p>
        <p>
          · 목록·가격·예치 규모는 GIWA Sepolia 온체인 실데이터입니다. 변동률 ·
          거래대금 · 참여 인원은 인덱서 연결 후 제공되며, 거래 데이터는 데모
          시드 봇이 생성합니다.
        </p>
        <p>
          · <b className="font-medium text-ink-2">검증은 사기 필터이지 투자
          보증이 아닙니다.</b>{" "}
          발행 시점의 신원과 온체인 안전장치를 확인한 것입니다.
        </p>
      </div>
    </div>
  );
}
