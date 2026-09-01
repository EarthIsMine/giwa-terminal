"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef, Row, SortingState } from "@tanstack/react-table";
import {
  feeFromVolume,
  formatChangeBps,
  formatCount,
  formatEth,
  formatKrw,
  shortHex,
  wei,
  weiToDisplayKrw,
} from "@giwa/shared";
import type { HolderBoardStats } from "@/lib/analysis";
import { BOARD_WINDOWS } from "@/lib/indexer";
import type { BoardStatsWire, BoardWindow } from "@/lib/indexer";
import type { LiveAssetWire } from "@/lib/onchain";
import { AssetBoardCards } from "@/components/asset/asset-board-cards";
import { KrwCompact, WINDOW_LABEL } from "@/components/asset/asset-board-model";
import type { LiveAsset } from "@/components/asset/asset-board-model";
import { AssetBoardTable } from "@/components/asset/asset-board-table";
import { AssetAvatar } from "@/components/ui/asset-avatar";
import { CopyAddress } from "@/components/ui/copy-address";
import { Responsive } from "@/components/ui/responsive";
import { useSearch } from "@/contexts/search-context";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { VERIFICATION_LEAD } from "@/lib/site";

/**
 * 자산 보드 컨테이너 - GIWA Sepolia 온체인 실데이터 (목데이터 제거, 2026-07-22).
 * 현재가·예치 규모는 페어 준비금에서, 자산 메타는 발행 게이트 레지스트리에서 온다.
 * 상태(정렬·기간·검색)와 컬럼 정의는 여기가 쥐고, 렌더는 뷰포트별 분리:
 * 데스크톱 = asset-board-table, 모바일 = asset-board-cards - 전환은
 * <Responsive> 조립으로 명시한다 (ui/responsive.tsx 에 방식·이유 주석).
 */

/**
 * 데이터 없는 값은 정렬에서 항상 맨 아래로 보낸다.
 * `?? 0`(또는 `-1`)로 채우면 "데이터 없음"이 보합·0건으로 취급돼 하락 자산보다
 * 위에 랭크된다 - 셀은 "-"로 그리는데 순서만 0%처럼 도는 모순이다(절대 규칙 1).
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
    <div className="flex items-center gap-3">
      <AssetAvatar symbol={asset.symbol} size={36} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <Link
            href={`/asset/${asset.address}`}
            onClick={(e) => e.stopPropagation()}
            className="text-[14px] font-semibold tracking-wide"
          >
            {asset.symbol}
          </Link>
          <VerifiedBadge verification={asset.verification} />
        </div>
        {/* 둘째 줄 - 한글명 + 축약 주소(2026-08-31, 팀 결정으로 노출 전환).
            이전엔 주소 문자열을 아예 감췄으나(절대 규칙 3), 축약 표기 +
            복사 버튼을 한 줄로 묶는 편이 식별성이 높다는 팀 판단으로 바꿨다.
            전체 0x… 풀 주소는 여전히 안 보여준다 - shortHex 로 자른다.
            whitespace-nowrap: 공백 없는 한글명은 안 걸면 글자 단위로 세로로
            쪼개진다(자산 컬럼이 좁을 때). 넘치면 셀이 아니라 표가 스크롤한다 */}
        <div className="mt-1 flex items-center gap-1.5 whitespace-nowrap text-[11.5px] text-ink-3">
          <span>{asset.nameKo}</span>
          <span aria-hidden className="text-ink-3/50">
            ·
          </span>
          <span className="font-mono">{shortHex(asset.address)}</span>
          <CopyAddress address={asset.address} />
        </div>
      </div>
    </div>
  );
}

export function AssetBoard({
  assets,
  ethKrw: ethKrwRaw,
  boardStats,
  holderStats,
}: {
  assets: LiveAssetWire[];
  ethKrw: string | null;
  boardStats: BoardStatsWire | null;
  /** 보유 지갑·상위 10 집중도 - Blockscout 원천(인덱서와 별개), 실패 자산은 키 없음 */
  holderStats: HolderBoardStats;
}) {
  const router = useRouter();
  // 새로고침 = 서버 데이터 재조회(router.refresh)지 페이지 전체 리로드가 아니다
  // - 전체 리로드는 선택한 기간·정렬·스크롤까지 날린다
  const [refreshing, startRefresh] = useTransition();
  const { query } = useSearch();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "liquidity", desc: true },
  ]);
  // 기본은 24시간 - 롤링 단기 윈도우 중 가장 넓어 저활동 자산도 지표가 덜 빈다
  const [window_, setWindow] = useState<BoardWindow>("24h");

  const ethKrw = useMemo(() => (ethKrwRaw ? BigInt(ethKrwRaw) : null), [ethKrwRaw]);

  const data = useMemo<LiveAsset[]>(() => {
    const parsed = assets.map((a) => {
      const entry = boardStats?.[a.pair.toLowerCase()];
      // windows 옵셔널 체이닝 - 인덱서 응답 캐시가 구버전일 수 있다
      const w = entry?.windows?.[window_];
      // 총수수료는 lifetime 값이라 선택 윈도우가 아니라 전체 누적 거래대금에서 낸다.
      // 롤링 윈도우 전환(2026-08-31)으로 "all" 윈도우가 사라져 인덱서가 별도 필드로 준다
      const allVolume = entry?.lifetimeVolumeWeth;
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
        netInflowWei: w ? wei(BigInt(w.netInflowWeth)) : null,
        trades: w?.trades ?? null,
        traders: w?.traders ?? null,
        totalFeesWei: allVolume
          ? wei(feeFromVolume(BigInt(allVolume)))
          : null,
        holderCount: holderStats[a.address.toLowerCase()]?.holderCount ?? null,
        issuerPermille:
          holderStats[a.address.toLowerCase()]?.issuerPermille ?? null,
        top10Permille:
          holderStats[a.address.toLowerCase()]?.top10Permille ?? null,
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
  }, [assets, query, boardStats, holderStats, window_]);

  const columns = useMemo<ColumnDef<LiveAsset>[]>(
    () => [
      {
        id: "asset",
        header: "자산",
        enableSorting: false,
        cell: ({ row }) => <AssetCell asset={row.original} />,
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
            // 원화가 보이면 ETH 병기는 뺀다 - 업저씨에게 wei 단위 소수는 잡음이다
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
        // "15분"만 두면 무슨 지표인지 안 보인다(다른 윈도우 의존 컬럼은 지표명이
        // 헤더다) - 지표명 "변동"만 둔다. 어느 윈도우인지는 기간 토글이 정한다
        header: "변동",
        sortDescFirst: true,
        ...NO_DATA_SORT,
        sortingFn: (a: Row<LiveAsset>, b: Row<LiveAsset>) =>
          (a.original.changeBps ?? 0) - (b.original.changeBps ?? 0),
        cell: ({ row }) => {
          const bps = row.original.changeBps;
          // 데이터 없음과 0.00%는 다르다 - 없으면 자리표시로 둔다
          if (bps === null) {
            return <span className="font-mono text-[12px] text-ink-3">-</span>;
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
            return <span className="font-mono text-[12px] text-ink-3">-</span>;
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
        id: "netInflow",
        accessorFn: (a) => a.netInflowWei ?? undefined,
        // 순유입 = 총매수 - 총매도. 유동성 공급/회수는 방향성 있는 매수·매도가
        // 아니라서 제외한다 (지표 정의 §순유입) - "거래대금"과 달리 부호가 있다
        header: "순유입",
        sortDescFirst: true,
        ...NO_DATA_SORT,
        sortingFn: (a: Row<LiveAsset>, b: Row<LiveAsset>) =>
          cmpBigint(
            a.original.netInflowWei ?? wei(0n),
            b.original.netInflowWei ?? wei(0n),
          ),
        cell: ({ row }) => {
          const v = row.original.netInflowWei;
          if (v === null) {
            return <span className="font-mono text-[12px] text-ink-3">-</span>;
          }
          // 상승/하락과 같은 색 관례(초록/빨강, 국제 관례) 재사용 - 순매수 우위는
          // 상승과 같은 방향 신호라 새 색을 만들 필요가 없다
          const sign = v > 0n ? "+" : v < 0n ? "-" : "";
          const abs = wei(v < 0n ? -v : v);
          return (
            <span
              className={`inline-flex items-baseline gap-0.5 font-mono text-[13px] tabular-nums ${v >= 0n ? "text-up" : "text-down"}`}
            >
              {sign}
              {ethKrw ? (
                <KrwCompact v={abs} ethKrw={ethKrw} />
              ) : (
                <>
                  {formatEth(abs, 4)}{" "}
                  <span className="text-[11px] text-ink-3">ETH</span>
                </>
              )}
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
              <span className="text-ink-3">-</span>
            ) : (
              formatCount(row.original.trades)
            )}
          </span>
        ),
      },
      {
        id: "traders",
        accessorFn: (a) => a.traders ?? undefined,
        header: "참여 지갑",
        sortDescFirst: true,
        ...NO_DATA_SORT,
        cell: ({ row }) => (
          <span className="font-mono text-[12.5px] tabular-nums text-ink-2">
            {row.original.traders === null ? (
              <span className="text-ink-3">-</span>
            ) : (
              formatCount(row.original.traders)
            )}
          </span>
        ),
      },
      {
        id: "holders",
        accessorFn: (a) => a.holderCount ?? undefined,
        // 분석 탭 자산 보드 제거(2026-09-01)로 편입 - 지금 이 자산을 쥔 지갑 수.
        // 윈도우 지표 "참여 지갑"(기간 내 거래 지갑)과 다른 값이라 "보유"로 가른다
        header: "보유 지갑",
        sortDescFirst: true,
        ...NO_DATA_SORT,
        cell: ({ row }) => (
          <span className="font-mono text-[12.5px] tabular-nums text-ink-2">
            {row.original.holderCount === null ? (
              <span className="text-ink-3">-</span>
            ) : (
              formatCount(row.original.holderCount)
            )}
          </span>
        ),
      },
      {
        id: "issuerShare",
        accessorFn: (a) => a.issuerPermille ?? undefined,
        // 분석 탭 집중도 비교 차트 제거(2026-09-01)로 편입 - 발행자 지갑이 쥔
        // 총공급 비율. 상장 초기에는 높은 것이 일반적이다 (푸터 고지 참고)
        header: "발행자 물량",
        sortDescFirst: true,
        ...NO_DATA_SORT,
        cell: ({ row }) => {
          const p = row.original.issuerPermille;
          if (p === null) {
            return <span className="font-mono text-[12px] text-ink-3">-</span>;
          }
          return (
            <span className="font-mono text-[12.5px] tabular-nums text-ink-2">
              {(p / 10).toFixed(1)}
              <span className="ml-0.5 text-[11px] text-ink-3">%</span>
            </span>
          );
        },
      },
      {
        id: "top10",
        accessorFn: (a) => a.top10Permille ?? undefined,
        // 상위 10개 지갑 합산 ÷ 총공급, 인프라 주소 제외. 등급·경고가 아니라
        // 사실 비율이다 - 색 인코딩 없이 수치만 둔다 (분석 탭 비교 차트와 동일 원칙)
        header: "상위 10 집중도",
        sortDescFirst: true,
        ...NO_DATA_SORT,
        cell: ({ row }) => {
          const p = row.original.top10Permille;
          if (p === null) {
            return <span className="font-mono text-[12px] text-ink-3">-</span>;
          }
          return (
            <span className="font-mono text-[12.5px] tabular-nums text-ink-2">
              {(p / 10).toFixed(1)}
              <span className="ml-0.5 text-[11px] text-ink-3">%</span>
            </span>
          );
        },
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
        id: "totalFees",
        accessorFn: (a) => a.totalFeesWei ?? undefined,
        header: "총수수료",
        sortDescFirst: true,
        ...NO_DATA_SORT,
        sortingFn: (a: Row<LiveAsset>, b: Row<LiveAsset>) =>
          cmpBigint(
            a.original.totalFeesWei ?? wei(0n),
            b.original.totalFeesWei ?? wei(0n),
          ),
        cell: ({ row }) => {
          const f = row.original.totalFeesWei;
          // 데이터 없음(인덱서 미연결)과 0원은 다르다 - 없으면 자리표시로 둔다
          if (f === null) {
            return <span className="font-mono text-[12px] text-ink-3">-</span>;
          }
          return ethKrw ? (
            <KrwCompact v={f} ethKrw={ethKrw} />
          ) : (
            <span className="font-mono text-[13px] tabular-nums">
              {formatEth(f, 4)}{" "}
              <span className="text-[11px] text-ink-3">ETH</span>
            </span>
          );
        },
      },
      // 상장 경과일 열도 뺐다. 총수수료가 들어오며 열이 늘었는데, 며칠 됐는지는
      // 목록에서 자산을 고르는 판단에 쓰이지 않는다 (자산 상세의 "상장일"에 남아 있다).
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

  // 정렬·필터가 적용된 행 모델 - 모바일 카드도 같은 순서를 쓴다
  const sortedAssets = table.getRowModel().rows.map((r) => r.original);
  const goToAsset = (a: LiveAsset) => router.push(`/asset/${a.address}`);

  return (
    <div>
      {/* 툴바 - 기간 토글 + 새로고침. 기간은 일 단위만 연다 (절대 규칙 3) */}
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
          disabled={refreshing}
          onClick={() => startRefresh(() => router.refresh())}
          className="grid size-8 place-items-center rounded-lg border border-hairline bg-panel text-ink-3 transition-colors hover:text-ink-2 disabled:opacity-60"
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
            className={refreshing ? "animate-spin" : undefined}
          >
            <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
            <path d="M13.5 1.8v2.7h-2.7" />
          </svg>
        </button>

        {/* 테스트넷 칩은 뺐다(2026-08-29) - 상단 배너가 같은 사실을 전 페이지
            상시 고지한다 (절대 규칙 5 충족). 같은 화면에 두 번 말할 필요 없다 */}
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

      {/* 푸터 "고지" 컬럼 해체(2026-08-31) - 사이트 공통 고지를 각 화면이
          직접 진다. 보드 몫 = 원화 환산 라벨(절대 규칙 1) + 검증 한정(규칙 6).
          시드 봇 고지는 상단 데모 배너 담당(규칙 5) */}
      <div className="mt-3 space-y-1 px-page text-[11.5px] leading-relaxed text-ink-3">
        {ethKrw === null ? (
          <p>· 업비트 시세 조회가 일시적으로 불가해 ETH 단위로 표시 중입니다.</p>
        ) : (
          <p>
            · 원화 금액은 업비트 KRW-ETH 시세(60초 갱신)로 환산한 참고값이며,
            기와체인에 원화 자산이 존재하는 것은 아닙니다.
          </p>
        )}
        <p>
          · 표시 자산은 신원 검증을 통과한 자산으로 한정됩니다.{" "}
          {VERIFICATION_LEAD}.
        </p>
      </div>
    </div>
  );
}
