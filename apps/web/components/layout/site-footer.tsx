import { giwaChain } from "@giwa/config";
import { SITE_LINKS } from "@/lib/site";
import { BrandLogo } from "@/components/ui/brand-logo";
import { TelegramIcon, XIcon } from "@/components/ui/social-icons";

export function SiteFooter() {
  return (
    // 본문 마루와 구분되는 짙은 그늘 영역 - 나무는 배경으로 희미하게만 비친다
    <footer className="mt-14 border-t border-black/50 bg-[#150d07]/85">
      {/* 세로 여백은 내용에 맞게 조인 상태(2026-08-29) - 내용보다 공기가
          많으면 푸터가 빈 띠처럼 길어 보인다 */}
      <div className="mx-auto w-full max-w-page px-page py-7">
        <div className="grid grid-cols-1 gap-6 text-[13px] md:grid-cols-[1.2fr_1fr] md:gap-10">
          {/* flex-col + mt-auto: SNS 아이콘을 컬럼 왼쪽 아래에 고정 -
              네트워크 컬럼이 길어져도 아이콘이 바닥선을 따라간다 */}
          <div className="flex flex-col">
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
              업비트에서 기와체인으로 오는 나룻길.
              <br />
              익숙한 원화 환산 시세로 보고 거래하는 터미널.
            </p>
            {/* md:-mb-7 + pb-2 = 컨테이너 하단 패딩(py-7)을 상쇄하되 8px만
                남겨 바닥선에 근접. 모바일 스택에선 다음 섹션을 침범하므로
                md+ 전용 */}
            <div className="mt-auto flex items-center gap-3 pt-4 text-ink-3 md:-mb-7 md:pb-2">
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
            <h2 className="text-[11px] font-semibold tracking-[0.18em] text-accent/90">
              네트워크
            </h2>
            <ul className="mt-3 space-y-1.5 text-ink-2">
              <li>
                {/* 독립 문서 - 새 탭으로 띄운다 (터미널 세션을 끊지 않는다) */}
                <a
                  href="/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-ink"
                >
                  기술 문서 ↗
                </a>
              </li>
              <li>
                <a
                  href={giwaChain.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-ink"
                >
                  기와체인 기록 보기 ↗
                </a>
              </li>
              <li>
                <a
                  href={giwaChain.bridgeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-ink"
                >
                  자산 옮기기 ↗
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
                <li className="text-ink-3">
                  컨트랙트 주소는 배포 후 공개됩니다
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
