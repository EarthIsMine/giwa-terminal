"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef, Row, SortingState } from "@tanstack/react-table";
import {
  formatChangeBps,
  formatCount,
  formatEth,
  formatKrw,
  wei,
  weiToDisplayKrw,
} from "@giwa/shared";
import { BOARD_WINDOWS } from "@/lib/indexer";
import type { BoardStatsWire, BoardWindow } from "@/lib/indexer";
import type { LiveAssetWire } from "@/lib/onchain";
import { VERIFICATION_DETAIL, VERIFICATION_LEAD } from "@/lib/site";
import { AssetBoardCards } from "@/components/asset/asset-board-cards";
import { KrwCompact, WINDOW_LABEL } from "@/components/asset/asset-board-model";
import type { LiveAsset } from "@/components/asset/asset-board-model";
import { AssetBoardTable } from "@/components/asset/asset-board-table";
import { AssetAvatar } from "@/components/ui/asset-avatar";
import { CopyAddress } from "@/components/ui/copy-address";
import { Responsive } from "@/components/ui/responsive";
import { useSearch } from "@/contexts/search-context";
import { VerifiedBadge } from "@/components/ui/verified-badge";

/**
 * 자산 보드 컨테이너 — GIWA Sepolia 온체인 실데이터 (목데이터 제거, 2026-07-22).
 * 현재가·예치 규모는 페어 준비금에서, 자산 메타는 발행 게이트 레지스트리에서 온다.
 * 상태(정렬·기간·검색)와 컬럼 정의는 여기가 쥐고, 렌더는 뷰포트별 분리:
 * 데스크톱 = asset-board-table, 모바일 = asset-board-cards — 전환은
 * <Responsive> 조립으로 명시한다 (ui/responsive.tsx 에 방식·이유 주석).
 */

/**
 * 데이터 없는 값은 정렬에서 항상 맨 아래로 보낸다.
 * `?? 0`(또는 `-1`)로 채우면 "데이터 없음"이 보합·0건으로 취급돼 하락 자산보다
 * 위에 랭크된다 — 셀은 "—"로 그리는데 순서만 0%처럼 도는 모순이다(절대 규칙 1).
 * TanStack 은 `sortUndefined: "last"` 를 desc 반전보다 먼저 처리하므로
 * (table-core RowSorting: undefined 분기에서 즉시 return) 방향과 무관하게 아래로 간다.
 * 조건은 accessorFn 이 null 이 아니라 undefined 를 내보내는 것.
 */
const NO_DATA_SORT = { sortUndefined: "last" } as const;

function cmpBigint(a: bigint, b: bigint): number {
  return a < b ? -1 : a > b ? 1 : 0;
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
          {/* 컨트랙트 주소 복사 — 주소 문자열은 노출하지 않고 버튼만 둔다.
              0x… 를 19행에 깔면 정보 밀도가 튀지만(절대 규칙 3), 복사 자체는
              지갑·익스플로러로 옮겨 확인하는 실제 동선이라 목록에 남긴다 */}
          <CopyAddress address={asset.address} />
        </div>
        <p className="mt-0.5 text-[11.5px] text-ink-3">{asset.nameKo}</p>
      </div>
    </div>
  );
}

export function AssetBoard({
  assets,
  ethKrw: ethKrwRaw,
  boardStats,
}: {
  assets: LiveAssetWire[];
  ethKrw: string | null;
  boardStats: BoardStatsWire | null;
}) {
  const router = useRouter();
  const { query } = useSearch();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "liquidity", desc: true },
  ]);
  // 기본은 7일 — "오늘"은 UTC 자정(09:00 KST) 경계라 한국 오전에 열면 창이 몇 분짜리다
  const [window_, setWindow] = useState<BoardWindow>("7d");

  const ethKrw = useMemo(() => (ethKrwRaw ? BigInt(ethKrwRaw) : null), [ethKrwRaw]);

  const nowSec = useMemo(() => Math.floor(Date.now() / 1_000), []);

  const data = useMemo<LiveAsset[]>(() => {
    const parsed = assets.map((a) => {
      const entry = boardStats?.[a.pair.toLowerCase()];
      // windows 옵셔널 체이닝 — 인덱서 응답 캐시가 구버전일 수 있다
      const w = entry?.windows?.[window_];
      const priceWei = BigInt(a.priceWei);
      return {
        address: a.address,
        pair: a.pair,
        symbol: a.symbol,
        nameKo: a.nameKo,
        issuerName: a.issuerName,
        priceWei: wei(priceWei),
        liquidityWei: wei(BigInt(a.liquidityWei)),
        verification: a.verification,
        changeBps: w?.changeBps ?? null,
        marketCapWei: wei((BigInt(a.totalSupply) * priceWei) / 10n ** 18n),
        volumeWei: w ? wei(BigInt(w.volumeWeth)) : null,
        trades: w?.trades ?? null,
        traders: w?.traders ?? null,
        ageDays: Math.max(0, Math.floor((nowSec - a.issuedAt) / 86_400)),
      };
    });
    const q = query.trim().toLowerCase();
    if (q === "") return parsed;
    return parsed.filter(
      (a) =>
        a.symbol.toLowerCase().includes(q) ||
        a.nameKo.includes(q) ||
        a.address.toLowerCase().includes(q),
    );
  }, [assets, query, boardStats, window_, nowSec]);

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
            // 원화가 보이면 ETH 병기는 뺀다 — 업저씨에게 wei 단위 소수는 잡음이다
            // (절대 규칙 3). 환산 실패 시에만 ETH 단위로 폴백한다
            <p className="font-mono text-[13.5px] font-medium tabular-nums">
              <span className="mr-px text-ink-2">₩</span>
              {formatKrw(weiToDisplayKrw(row.original.priceWei, ethKrw))}
            </p>
          ) : (
            <p className="font-mono text-[13.5px] font-medium tabular-nums">
              {formatEth(row.original.priceWei, 8)}{" "}
              <span className="text-[11px] text-ink-3">ETH</span>
            </p>
          ),
      },
      {
        id: "change",
        accessorFn: (a) => a.changeBps ?? undefined,
        header: WINDOW_LABEL[window_],
        sortDescFirst: true,
        ...NO_DATA_SORT,
        sortingFn: (a: Row<LiveAsset>, b: Row<LiveAsset>) =>
          (a.original.changeBps ?? 0) - (b.original.changeBps ?? 0),
        cell: ({ row }) => {
          const bps = row.original.changeBps;
          // 데이터 없음과 0.00%는 다르다 — 없으면 자리표시로 둔다
          if (bps === null) {
            return <span className="font-mono text-[12px] text-ink-3">—</span>;
          }
          return (
            <span
              className={`font-mono text-[13px] font-medium tabular-nums ${bps >= 0 ? "text-up" : "text-down"}`}
            >
              {formatChangeBps(bps)}
            </span>
          );
        },
      },
      {
        id: "marketCap",
        accessorFn: (a) => a.marketCapWei,
        header: "시가총액",
        sortDescFirst: true,
        sortingFn: (a: Row<LiveAsset>, b: Row<LiveAsset>) =>
          cmpBigint(a.original.marketCapWei, b.original.marketCapWei),
        cell: ({ row }) =>
          ethKrw ? (
            <KrwCompact v={row.original.marketCapWei} ethKrw={ethKrw} />
          ) : (
            <span className="font-mono text-[13px] tabular-nums">
              {formatEth(row.original.marketCapWei, 4)}{" "}
              <span className="text-[11px] text-ink-3">ETH</span>
            </span>
          ),
      },
      {
        id: "volume",
        accessorFn: (a) => a.volumeWei ?? undefined,
        header: "거래대금",
        sortDescFirst: true,
        ...NO_DATA_SORT,
        sortingFn: (a: Row<LiveAsset>, b: Row<LiveAsset>) =>
          cmpBigint(
            a.original.volumeWei ?? wei(0n),
            b.original.volumeWei ?? wei(0n),
          ),
        cell: ({ row }) => {
          const v = row.original.volumeWei;
          if (v === null) {
            return <span className="font-mono text-[12px] text-ink-3">—</span>;
          }
          return ethKrw ? (
            <KrwCompact v={v} ethKrw={ethKrw} />
          ) : (
            <span className="font-mono text-[13px] tabular-nums">
              {formatEth(v, 4)}{" "}
              <span className="text-[11px] text-ink-3">ETH</span>
            </span>
          );
        },
      },
      {
        id: "trades",
        accessorFn: (a) => a.trades ?? undefined,
        // 매수·매도에 유동성 공급/회수까지 포함하므로 "체결"이 아니라 "거래"다
        header: "거래",
        sortDescFirst: true,
        ...NO_DATA_SORT,
        cell: ({ row }) => (
          <span className="font-mono text-[12.5px] tabular-nums text-ink-2">
            {row.original.trades === null ? (
              <span className="text-ink-3">—</span>
            ) : (
              formatCount(row.original.trades)
            )}
          </span>
        ),
      },
      {
        id: "traders",
        accessorFn: (a) => a.traders ?? undefined,
        header: "참여 인원",
        sortDescFirst: true,
        ...NO_DATA_SORT,
        cell: ({ row }) => (
          <span className="font-mono text-[12.5px] tabular-nums text-ink-2">
            {row.original.traders === null ? (
              <span className="text-ink-3">—</span>
            ) : (
              formatCount(row.original.traders)
            )}
          </span>
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
        id: "age",
        accessorFn: (a) => a.ageDays,
        header: "상장",
        cell: ({ row }) => (
          <span className="font-mono text-[12.5px] tabular-nums text-ink-3">
            {row.original.ageDays === 0
              ? "오늘"
              : `${formatCount(row.original.ageDays)}일`}
          </span>
        ),
      },
      // 컨트랙트 주소 열은 뺐다. 목록 19행에 0x… 를 깔면 화면이 가장 크게
      // "여기는 크립토다"라고 외치는데, 타겟 유저가 그 열을 볼 일은 없다.
      // 원본 기록은 자산 상세에 남아 있다 (감추는 건 배관이지 고지가 아니다).
    ],
    [ethKrw, window_],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // 정렬·필터가 적용된 행 모델 — 모바일 카드도 같은 순서를 쓴다
  const sortedAssets = table.getRowModel().rows.map((r) => r.original);
  const goToAsset = (a: LiveAsset) => router.push(`/asset/${a.address}`);

  return (
    <div>
      {/* 툴바 — 기간 토글 + 새로고침. 기간은 일 단위만 연다 (절대 규칙 3) */}
      <div className="flex flex-wrap items-center justify-end gap-2.5 px-page">
        <div
          role="group"
          aria-label="변동률 기간"
          className="flex h-8 items-center gap-0.5 rounded-lg border border-hairline bg-panel p-0.5"
        >
          {BOARD_WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={window_ === w}
              onClick={() => setWindow(w)}
              className={`h-full rounded-md px-2.5 text-[12px] transition-colors ${
                window_ === w
                  ? "bg-accent/15 font-medium text-ink"
                  : "text-ink-3 hover:text-ink-2"
              }`}
            >
              {WINDOW_LABEL[w]}
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

      <Responsive
        desktop={
          <AssetBoardTable table={table} query={query} onRowClick={goToAsset} />
        }
        mobile={
          <AssetBoardCards
            assets={sortedAssets}
            ethKrw={ethKrw}
            windowLabel={WINDOW_LABEL[window_]}
            query={query}
            onSelect={goToAsset}
          />
        }
      />

      {/* 환산·집계 고지 (절대 규칙 1·5) */}
      <div className="mt-3 space-y-1 px-page text-[11.5px] leading-relaxed text-ink-3">
        <p>
          {ethKrw
            ? `· 원화 금액은 업비트 KRW-ETH 시세(₩${formatCount(Number(ethKrw))} · 60초 갱신)로 환산한 참고값입니다. 원화 자산이 기와체인에 존재하는 것은 아닙니다.`
            : "· 업비트 시세 조회가 일시적으로 불가해 ETH 단위로 표시 중입니다."}
        </p>
        <p>
          · 목록·가격·예치 규모는 기와체인에 기록된 실데이터입니다. 변동률 ·
          거래대금 · 참여 인원은 인덱서 연결 후 제공되며, 거래 데이터는 데모
          시드 봇이 생성합니다.
        </p>
        <p>
          · <b className="font-medium text-ink-2">{VERIFICATION_LEAD}.</b>{" "}
          {VERIFICATION_DETAIL}
        </p>
      </div>
    </div>
  );
}
