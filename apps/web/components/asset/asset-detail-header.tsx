import { explorerTokenUrl } from "@giwa/config";
import { formatEth, formatKrw, wei, weiToDisplayKrw } from "@giwa/shared";
import type { WeiAmount } from "@giwa/shared";
import type { LiveAssetWire } from "@/lib/onchain";
import { AssetAvatar } from "@/components/ui/asset-avatar";
import { CopyAddress } from "@/components/ui/copy-address";
import { VerifiedBadge } from "@/components/ui/verified-badge";

/** 자산 상세 헤더 - 심볼·검증 배지·주소와 현재가. 환율 없으면 ETH 단위로 폴백 */
export function AssetDetailHeader({
  asset,
  ethKrw,
}: {
  asset: LiveAssetWire;
  ethKrw: bigint | null;
}) {
  const priceWei = wei(BigInt(asset.priceWei)) as WeiAmount;

  return (
    <div className="mt-5 flex flex-wrap items-center gap-4">
      <AssetAvatar symbol={asset.symbol} size={46} />
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-[24px] font-bold tracking-wide">
            {asset.symbol}
          </h1>
          <VerifiedBadge verification={asset.verification} />
          <CopyAddress address={asset.address} />
          <a
            href={explorerTokenUrl(asset.address)}
            target="_blank"
            rel="noreferrer"
            title="기와체인 원본 기록"
            aria-label={`${asset.symbol} 토큰 원본 기록 열기`}
            className="group grid place-items-center"
          >
            {/* 기와 공식 마크(누끼 PNG) - 검정 원화라 다크 배경에선 invert로 밝힌다 (site-header 와 동일 처리) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/giwa-mark.png"
              alt=""
              width={13}
              height={13}
              className="opacity-55 invert transition-opacity group-hover:opacity-90"
            />
          </a>
        </div>
        <p className="mt-0.5 text-[13px] text-ink-3">
          {asset.nameKo} · 발행 {asset.issuerName}
        </p>
      </div>
      {/* 모바일: 이름 아래 전폭 줄로 내려온다 / sm 이상: 우측 정렬 */}
      <div className="w-full sm:ml-auto sm:w-auto sm:text-right">
        {ethKrw ? (
          <>
            <p className="font-mono text-[22px] font-semibold tabular-nums sm:text-[26px]">
              <span className="mr-0.5 text-[18px] text-ink-2">₩</span>
              {formatKrw(weiToDisplayKrw(priceWei, ethKrw))}
            </p>
            <p className="mt-0.5 font-mono text-[12px] tabular-nums text-ink-3">
              {formatEth(priceWei, 8)} ETH
            </p>
          </>
        ) : (
          <p className="font-mono text-[22px] font-semibold tabular-nums sm:text-[26px]">
            {formatEth(priceWei, 8)}{" "}
            <span className="text-[14px] text-ink-3">ETH</span>
          </p>
        )}
      </div>
    </div>
  );
}
