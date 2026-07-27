import { explorerAddressUrl } from "@giwa/config";
import {
  formatEth,
  formatKrwCompact,
  shortHex,
  wei,
  weiToDisplayKrw,
} from "@giwa/shared";
import type { WeiAmount } from "@giwa/shared";
import type { LiveAssetWire } from "@/lib/onchain";

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline/60 py-3 last:border-0">
      <dt className="shrink-0 text-[12.5px] text-ink-3">{label}</dt>
      <dd className="text-right text-[13px]">{children}</dd>
    </div>
  );
}

export function ExplorerLink({ address }: { address: `0x${string}` }) {
  return (
    <a
      href={explorerAddressUrl(address)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-mono text-[12.5px] text-ink-2 transition-colors hover:text-accent"
    >
      {shortHex(address, 6, 4)}
      <span aria-hidden className="text-[11px]">↗</span>
    </a>
  );
}

/** 온체인 정보 + 신원 검증 카드 — 우측 사이드바의 정적 정보 블록 */
export function AssetDetailInfo({
  asset,
  ethKrw,
}: {
  asset: LiveAssetWire;
  ethKrw: bigint | null;
}) {
  const liquidityWei = wei(BigInt(asset.liquidityWei)) as WeiAmount;
  const supply = BigInt(asset.totalSupply) / 10n ** 18n;
  const issuedDate = new Date(asset.issuedAt * 1000);

  return (
    <>
      <div className="rounded-xl carved p-6">
        <h2 className="text-[15px] font-semibold">온체인 정보</h2>
        <dl className="mt-3">
          <InfoRow label="예치 규모">
            {ethKrw ? (
              <span className="font-mono tabular-nums">
                {formatKrwCompact(weiToDisplayKrw(liquidityWei, ethKrw))}
                <span className="ml-0.5 text-[11px] text-ink-3">원</span>
              </span>
            ) : (
              <span className="font-mono tabular-nums">
                {formatEth(liquidityWei, 4)}{" "}
                <span className="text-[11px] text-ink-3">ETH</span>
              </span>
            )}
          </InfoRow>
          <InfoRow label="총 공급량">
            <span className="font-mono tabular-nums">
              {supply.toLocaleString("en-US")}
              <span className="ml-0.5 text-[11px] text-ink-3">
                개 (고정)
              </span>
            </span>
          </InfoRow>
          <InfoRow label="상장일">
            <span className="font-mono tabular-nums">
              {issuedDate.toISOString().slice(0, 10)}
            </span>
          </InfoRow>
          <InfoRow label="토큰 컨트랙트">
            <ExplorerLink address={asset.address} />
          </InfoRow>
          <InfoRow label="유동성 페어">
            <ExplorerLink address={asset.pair} />
          </InfoRow>
        </dl>
      </div>

      <div className="rounded-xl carved p-6">
        <h2 className="text-[15px] font-semibold">신원 검증</h2>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
          <span className="font-medium text-good">
            발행 시점에 검증된 자산입니다.
          </span>{" "}
          발행 게이트가 검증 근거의 지문을 온체인에 영구 기록했습니다.
        </p>
        <dl className="mt-3">
          <InfoRow label="검증 방식">
            <span className="text-good">
              {asset.verification.label} · 자체 신원 원장(도장 스키마 준거)
            </span>
          </InfoRow>
          <InfoRow label="신원 참조">
            <span className="font-mono text-[12px] text-ink-3">
              {shortHex(asset.identityRef, 10, 6)}
            </span>
          </InfoRow>
        </dl>
        <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
          테스트넷 데모입니다. 검증은 나루 운영자 어테스테이션이며,
          도장(Dojang) 정식 연동 시 같은 자리에 실검증이 기록됩니다.{" "}
          <b className="font-medium text-ink-2">
            검증은 사기 필터이며 투자 보증이 아닙니다.
          </b>
        </p>
      </div>
    </>
  );
}
