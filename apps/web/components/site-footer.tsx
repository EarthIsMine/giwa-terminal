import Link from "next/link";
import { giwaChain } from "@giwa/config";
import { SITE_LINKS } from "@/lib/site";
import { BrandLogo } from "./brand-logo";
import { TelegramIcon, XIcon } from "./social-icons";

export function SiteFooter() {
  return (
    // 본문 마루와 구분되는 짙은 그늘 영역 — 나무는 배경으로 희미하게만 비친다
    <footer className="mt-14 border-t border-black/50 bg-[#150d07]/85">
      <div className="mx-auto grid w-full max-w-[1840px] grid-cols-1 gap-10 px-8 py-12 text-[13px] md:grid-cols-[1.2fr_1fr_1.6fr]">
        <div>
          <div className="flex items-center gap-2">
            <BrandLogo size={20} />
            <span className="flex items-baseline gap-1.5">
              <span className="text-[15px] font-bold">나루</span>
              <span className="font-mono text-[9.5px] tracking-[0.14em] text-ink-3">
                NARU
              </span>
            </span>
          </div>
          <p className="mt-3 leading-relaxed text-ink-3">
            업비트에서 기와 온체인으로 오는 나룻길.
            <br />
            기와체인 가격 데이터 레이어 위에 올린 온체인 터미널.
          </p>
          <div className="mt-4 flex items-center gap-3 text-ink-3">
            <a
              href={SITE_LINKS.x}
              target="_blank"
              rel="noreferrer"
              aria-label="나루 X 계정"
              className="transition-colors hover:text-ink-2"
            >
              <XIcon size={14} />
            </a>
            <a
              href={SITE_LINKS.telegram}
              target="_blank"
              rel="noreferrer"
              aria-label="나루 텔레그램 채널"
              className="transition-colors hover:text-ink-2"
            >
              <TelegramIcon size={15} />
            </a>
          </div>
        </div>

        <div>
          <h2 className="text-[11px] font-medium tracking-[0.08em] text-ink-3">
            네트워크
          </h2>
          <ul className="mt-3 space-y-1.5 text-ink-2">
            <li>
              <Link href="/docs" className="transition-colors hover:text-ink">
                기술 문서
              </Link>
            </li>
            <li>
              <a
                href={giwaChain.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-ink"
              >
                블록 익스플로러 ↗
              </a>
            </li>
            <li>
              <a
                href={giwaChain.bridgeUrl}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-ink"
              >
                공식 브릿지 ↗
              </a>
            </li>
            {giwaChain.tokenFactoryAddress ? (
              <li>
                <a
                  href={`${giwaChain.explorerUrl}/address/${giwaChain.tokenFactoryAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-ink"
                >
                  발행 게이트 컨트랙트 ↗
                </a>
              </li>
            ) : (
              <li className="text-ink-3">컨트랙트 주소는 배포 후 공개됩니다</li>
            )}
          </ul>
        </div>

        <div>
          <h2 className="text-[11px] font-medium tracking-[0.08em] text-ink-3">
            고지
          </h2>
          <ul className="mt-3 space-y-1.5 leading-relaxed text-ink-3">
            <li>
              본 화면은 {giwaChain.name} 테스트넷 데모이며, 거래 데이터는 데모
              시드 봇이 생성합니다.
            </li>
            <li>
              원화 금액은 업비트 KRW-ETH 시세로 환산한 참고값입니다. 원화
              자산이 온체인에 존재하는 것은 아닙니다.
            </li>
            <li>표시 자산은 신원 검증을 통과한 자산으로 한정됩니다.</li>
            <li>
              검증은 사기 필터이지 투자 보증이 아닙니다. 발행 시점의 신원과
              온체인 안전장치를 확인한 것입니다.
            </li>
            <li>
              나루는 두나무가 만든 GIWA 체인 위에서 동작하는 독립 서비스이며,
              업비트·두나무와 제휴 관계가 아닙니다.
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-hairline/60">
        <p className="mx-auto w-full max-w-[1840px] px-8 py-5 text-[12px] text-ink-3">
          © 2026 나루 NARU · GIWA 가속 데모
        </p>
      </div>
    </footer>
  );
}
