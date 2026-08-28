import { giwaChain } from "@giwa/config";
import { SITE_LINKS, VERIFICATION_DISCLAIMER } from "@/lib/site";
import { BrandLogo } from "@/components/ui/brand-logo";
import { TelegramIcon, XIcon } from "@/components/ui/social-icons";

export function SiteFooter() {
  return (
    // 본문 마루와 구분되는 짙은 그늘 영역 - 나무는 배경으로 희미하게만 비친다
    <footer className="mt-14 border-t border-black/50 bg-[#150d07]/85">
      {/* 세로 여백은 내용에 맞게 조인 상태(2026-08-29) - 내용보다 공기가
          많으면 푸터가 빈 띠처럼 길어 보인다 */}
      <div className="mx-auto grid w-full max-w-page grid-cols-1 gap-6 px-page py-7 text-[13px] md:grid-cols-[1.2fr_1fr_1.6fr] md:gap-10">
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
            업비트에서 기와체인으로 오는 나룻길.
            <br />
            기와체인 자산을 원화 환산 시세로 확인하고 거래하는 터미널.
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
              <li className="text-ink-3">컨트랙트 주소는 배포 후 공개됩니다</li>
            )}
          </ul>
        </div>

        <div>
          <h2 className="text-[11px] font-semibold tracking-[0.18em] text-accent/90">
            고지
          </h2>
          {/* 고지 단일화(2026-08-29): 보드 밑 각주 3문장을 여기로 흡수했다 -
              전부 사이트 전체에 해당하는 문장이라 두 군데로 갈라져 있으면
              표현이 조용히 어긋난다(검증 문구 단일 소스 원칙과 같은 이유).
              테스트넷·시드 봇의 "데모" 고지 자체는 상단 배너가 담당한다 */}
          <ul className="mt-3 space-y-1.5 leading-relaxed text-ink-3">
            <li>
              원화 금액은 업비트 KRW-ETH 시세(60초 갱신)로 환산한
              참고값이며, 원화 자산이 기와체인에 존재하는 것은 아닙니다.
            </li>
            <li>
              목록·가격·예치 규모는 기와체인에 기록된 실데이터입니다. 변동률
              · 거래대금 · 참여 지갑 · 총수수료는 인덱서 연결 후 제공되며,
              거래 데이터는 데모 시드 봇이 생성합니다.
            </li>
            <li>표시 자산은 신원 검증을 통과한 자산으로 한정됩니다.</li>
            <li>{VERIFICATION_DISCLAIMER}</li>
            <li>
              나루는 두나무가 만든 GIWA 체인 위에서 동작하는 독립 서비스이며,
              업비트·두나무와 제휴 관계가 아닙니다.
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-hairline/60">
        <p className="mx-auto w-full max-w-page px-page py-3.5 text-[12px] text-ink-3">
          © 2026 나루 NARU · GIWA 가속 데모
        </p>
      </div>
    </footer>
  );
}
