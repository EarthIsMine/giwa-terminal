import { giwaChain } from "@giwa/config";
import { SITE_LINKS, VERIFICATION_DISCLAIMER } from "@/lib/site";
import { BrandLogo } from "@/components/ui/brand-logo";
import { TelegramIcon, XIcon } from "@/components/ui/social-icons";

/**
 * 푸터 - 행 구조(2026-08-29 개편).
 * 이전의 3열 그리드(브랜드|네트워크|고지)는 풀폭 프레임(2026-08-26)에서
 * 열들이 화면 폭을 따라 늘어나 열 사이가 수백 px 씩 비고, 고지 6줄이
 * 본문과 같은 크기로 오른쪽 절반을 차지해 텍스트 벽이 됐다.
 * 1행 브랜드|링크 → 2행 고지 각주 → 3행 © 로 눕힌다 - 고지는 본문이
 * 아니라 각주라서, 보드 하단 각주(· 접두 + 작은 글씨)와 같은 문법을 쓴다.
 */

const NETWORK_LINKS = [
  // 독립 문서 - 새 탭으로 띄운다 (터미널 세션을 끊지 않는다)
  { href: "/docs", label: "기술 문서" },
  { href: giwaChain.explorerUrl, label: "기와체인 기록 보기" },
  { href: giwaChain.bridgeUrl, label: "자산 옮기기" },
  ...(giwaChain.tokenFactoryAddress
    ? [
        {
          href: `${giwaChain.explorerUrl}/address/${giwaChain.tokenFactoryAddress}`,
          label: "발행 게이트 컨트랙트",
        },
      ]
    : []),
];

const NOTICES = [
  `본 화면은 ${giwaChain.name} 테스트넷 데모이며, 거래 데이터는 데모 시드 봇이 생성합니다.`,
  "원화 금액은 업비트 KRW-ETH 시세로 환산한 참고값입니다. 원화 자산이 기와체인에 존재하는 것은 아닙니다.",
  "표시 자산은 신원 검증을 통과한 자산으로 한정됩니다.",
  VERIFICATION_DISCLAIMER,
  "나루는 두나무가 만든 GIWA 체인 위에서 동작하는 독립 서비스이며, 업비트·두나무와 제휴 관계가 아닙니다.",
];

export function SiteFooter() {
  return (
    // 본문 마루와 구분되는 짙은 그늘 영역 - 나무는 배경으로 희미하게만 비친다
    <footer className="mt-14 border-t border-black/50 bg-[#150d07]/85">
      {/* 1행: 브랜드 + 태그라인 | 네트워크 링크 + 소셜 */}
      <div className="mx-auto flex w-full max-w-page flex-col gap-6 px-page py-8 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2">
            <BrandLogo size={20} />
            <span className="flex items-baseline gap-1.5">
              <span className="text-[15px] font-bold">나루</span>
              <span className="font-mono text-[9.5px] tracking-[0.14em] text-ink-3">
                NARU
              </span>
            </span>
          </div>
          <p className="text-[12.5px] text-ink-3">
            업비트에서 기와체인으로 오는 나룻길
          </p>
        </div>

        <nav
          aria-label="네트워크 링크"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-ink-2"
        >
          {NETWORK_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-ink"
            >
              {l.label} ↗
            </a>
          ))}
          {giwaChain.tokenFactoryAddress ? null : (
            <span className="text-ink-3">
              컨트랙트 주소는 배포 후 공개됩니다
            </span>
          )}
          <span aria-hidden className="hidden h-3 w-px bg-hairline sm:block" />
          <a
            href={SITE_LINKS.x}
            target="_blank"
            rel="noreferrer"
            aria-label="나루 X 계정"
            className="text-ink-3 transition-colors hover:text-ink-2"
          >
            <XIcon size={14} />
          </a>
          <a
            href={SITE_LINKS.telegram}
            target="_blank"
            rel="noreferrer"
            aria-label="나루 텔레그램 채널"
            className="text-ink-3 transition-colors hover:text-ink-2"
          >
            <TelegramIcon size={15} />
          </a>
        </nav>
      </div>

      {/* 2행: 고지 - 보드 하단 각주와 같은 문법 (· 접두, 작은 글씨).
          법적으로 필요한 문장들이지만 본문이 아니라 각주다 - 크기로 낮춘다 */}
      <div className="border-t border-hairline/60">
        <ul className="mx-auto w-full max-w-page space-y-1 px-page py-5 text-[11.5px] leading-relaxed text-ink-3">
          {NOTICES.map((n) => (
            <li key={n}>· {n}</li>
          ))}
        </ul>
      </div>

      {/* 3행: © 바 */}
      <div className="border-t border-hairline/60">
        <p className="mx-auto w-full max-w-page px-page py-4 text-[11.5px] text-ink-3">
          © 2026 나루 NARU · GIWA 가속 데모
        </p>
      </div>
    </footer>
  );
}
