"use client";

import { formatChangeBps, formatEth, formatKrw, weiToDisplayKrw } from "@giwa/shared";
import { KrwCompact } from "@/components/asset/asset-board-model";
import type { LiveAsset } from "@/components/asset/asset-board-model";
import { AssetAvatar } from "@/components/ui/asset-avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";

/**
 * 자산 보드 - 모바일 카드 렌더.
 * 데스크톱 테이블과의 전환은 컨테이너의 <Responsive> 조립이 정한다 - 여기는
 * 뷰포트를 모른다. 테이블 컬럼을 다 욱여넣지 않는다(절대 규칙 3): 현재가·변동률이
 * 1급, 예치 규모·발행자는 보조 줄 하나로 끝낸다. 정렬·필터 순서는 테이블과 동일
 * (컨테이너가 정렬된 행 모델을 그대로 내려준다).
 */
export function AssetBoardCards({
  assets,
  ethKrw,
  windowLabel,
  query,
  onSelect,
}: {
  assets: LiveAsset[];
  ethKrw: bigint | null;
  windowLabel: string;
  query: string;
  onSelect: (asset: LiveAsset) => void;
}) {
  if (assets.length === 0) {
    return (
      <p className="mt-4 border-y border-black/45 bg-black/[0.12] px-page py-14 text-center text-[13.5px] text-ink-3">
        {query.trim() === ""
          ? "자산을 불러오는 중이거나 아직 발행된 자산이 없습니다"
          : `"${query}" 검색 결과가 없습니다`}
      </p>
    );
  }

  return (
    <ul className="mt-4 border-y border-black/45 bg-black/[0.12]">
      {assets.map((a) => (
        <li key={a.address} className="border-b border-black/30 last:border-0">
          <button
            type="button"
            onClick={() => onSelect(a)}
            className="flex w-full items-center gap-3 px-page py-3 text-left transition-colors hover:bg-black/30"
          >
            <AssetAvatar symbol={a.symbol} size={34} />

            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="text-[14px] font-semibold tracking-wide">
                  {a.symbol}
                </span>
                <VerifiedBadge verification={a.verification} />
              </span>
              <span className="mt-0.5 block truncate text-[11.5px] text-ink-3">
                {a.nameKo} · {a.issuerName}
              </span>
            </span>

            <span className="shrink-0 text-right">
              {ethKrw ? (
                <span className="block font-mono text-[14px] font-medium tabular-nums">
                  <span className="mr-px text-ink-2">₩</span>
                  {formatKrw(weiToDisplayKrw(a.priceWei, ethKrw))}
                </span>
              ) : (
                <span className="block font-mono text-[14px] font-medium tabular-nums">
                  {formatEth(a.priceWei, 8)}{" "}
                  <span className="text-[11px] text-ink-3">ETH</span>
                </span>
              )}
              <span className="mt-0.5 block text-[12px]">
                {a.changeBps === null ? (
                  <span className="font-mono text-ink-3">{windowLabel} -</span>
                ) : (
                  <span
                    className={`font-mono font-medium tabular-nums ${a.changeBps >= 0 ? "text-up" : "text-down"}`}
                  >
                    {windowLabel} {formatChangeBps(a.changeBps)}
                  </span>
                )}
              </span>
            </span>
          </button>

          {/* 보조 지표 한 줄 - 예치 규모만 (밀도 절제) */}
          <p className="flex items-baseline gap-1.5 px-page pb-3 text-[11.5px] text-ink-3">
            예치 규모{" "}
            {ethKrw ? (
              <KrwCompact v={a.liquidityWei} ethKrw={ethKrw} />
            ) : (
              <span className="font-mono tabular-nums">
                {formatEth(a.liquidityWei, 4)} ETH
              </span>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
