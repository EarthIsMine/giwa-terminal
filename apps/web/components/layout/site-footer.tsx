import type { ReactNode } from "react";
import Link from "next/link";
import { giwaChain } from "@giwa/config";
import { SITE_LINKS } from "@/lib/site";
import { BrandLogo } from "@/components/ui/brand-logo";
import { TelegramIcon, XIcon } from "@/components/ui/social-icons";

// 온체인 외부 링크 - 주소는 체인 config 에서 조립한다(하드코딩 금지, 절대 규칙 4)
const ONCHAIN_LINKS = [
  { href: giwaChain.explorerUrl, label: "기와체인 기록 보기" },
  { href: giwaChain.bridgeUrl, label: "자산 옮기기" },
];

// 문서·안내 - 실제 페이지 단위로만 노출한다. /docs 섹션(지표 정의·신원 검증 등)은
// 앵커라 결국 같은 /docs 로 귀속돼 별개 목적지처럼 보이면 오해를 준다(딥링크 배제)
const DOC_LINKS = [
  { href: "/docs", label: "기술 문서" },
  { href: "/guide", label: "이용 안내" },
];

const SOCIAL_LINKS = [
  { href: SITE_LINKS.x, label: "나루 X 계정", Icon: XIcon, size: 14 },
  {
    href: SITE_LINKS.telegram,
    label: "나루 텔레그램 채널",
    Icon: TelegramIcon,
    size: 15,
  },
];

/**
 * 사업자 정보 - 실서비스 승격 시 채운다(전자상거래법 표시 의무).
 * 지금은 법인·등록 전이라 비활성(null)이며, 값이 채워질 때만 하단 바에
 * 렌더된다 - 가짜 등록번호를 심사 제출물에 노출하지 않는다(규칙 5·추정 금지).
 * 활성화: 아래를 실제 값 객체로 바꾸면 자동으로 노출된다.
 */
const BUSINESS_INFO: {
  company: string;
  ceo: string;
  regNo: string;
  mailOrder: string;
  address: string;
  contact: string;
} | null = null;

// 컬럼 골격 - 라벨 헤더 + 세로 링크 목록 (의도別 그룹, 스캔용 이정표)
function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h2 className="text-[11px] font-semibold tracking-[0.18em] text-accent/90">
        {title}
      </h2>
      <ul className="mt-3 space-y-1.5 text-ink-2">{children}</ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    // 본문 마루와 구분되는 짙은 그늘 영역 - 나무는 배경으로 희미하게만 비친다
    <footer className="mt-14 border-t border-black/50 bg-[#150d07]/85">
      <div className="mx-auto w-full max-w-page px-page py-9">
        {/* 상단 tier = 탐색/지원: 브랜드(좌) · 링크 컬럼(중앙) · 소셜(우).
            타겟 유저(업저씨)엔 nav 중복보다 온체인·문서·정책 중심 구성이 맞다.
            모바일 2열에선 브랜드 전폭, 소셜은 정책 옆 4번째 칸을 채운다 */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto] md:gap-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <BrandLogo size={20} />
              <span className="flex items-baseline gap-1.5">
                <span className="text-[15px] font-bold">나루</span>
                <span className="font-mono text-[9.5px] tracking-[0.14em] text-ink-3">
                  NARU
                </span>
              </span>
            </div>
            <p className="mt-3 max-w-[15rem] text-[13px] leading-relaxed text-ink-3">
              업비트에서 기와체인으로 오는 나룻길.
              <br />
              익숙한 원화 환산 시세로 보고 거래하는 터미널.
            </p>
          </div>

          <FooterColumn title="온체인">
            {ONCHAIN_LINKS.map((it) => (
              <li key={it.label}>
                <a
                  href={it.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[13px] transition-colors hover:text-ink"
                >
                  {it.label}
                </a>
              </li>
            ))}
            {giwaChain.tokenFactoryAddress ? (
              <li>
                <a
                  href={`${giwaChain.explorerUrl}/address/${giwaChain.tokenFactoryAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[13px] transition-colors hover:text-ink"
                >
                  발행 게이트 컨트랙트
                </a>
              </li>
            ) : (
              <li className="text-[13px] text-ink-3">
                컨트랙트 주소는 배포 후 공개됩니다
              </li>
            )}
          </FooterColumn>

          <FooterColumn title="문서·안내">
            {DOC_LINKS.map((it) => (
              <li key={it.href}>
                {/* 독립 문서 - 새 탭으로 띄운다 (터미널 세션을 끊지 않는다) */}
                <a
                  href={it.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[13px] transition-colors hover:text-ink"
                >
                  {it.label}
                </a>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn title="정책·지원">
            <li>
              <Link
                href="/terms"
                className="text-[13px] transition-colors hover:text-ink"
              >
                이용약관
              </Link>
            </li>
            <li>
              {/* 개인정보처리방침은 굵게 - 한국 서비스 표기 관행 */}
              <Link
                href="/privacy"
                className="text-[13px] font-medium text-ink transition-colors hover:text-accent"
              >
                개인정보처리방침
              </Link>
            </li>
            <li>
              <a
                href={SITE_LINKS.telegram}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] transition-colors hover:text-ink"
              >
                문의
              </a>
            </li>
          </FooterColumn>

          {/* 소셜은 링크가 아니라 별도 affordance - 우상단 음각 원형 버튼.
              모바일 2열에선 정책·지원 옆 4번째 칸을 채운다(빈칸 방지) */}
          <div className="flex items-start gap-3 md:justify-end">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.href}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                className="carved flex h-10 w-10 items-center justify-center rounded-full text-ink-3 transition-colors hover:text-accent"
              >
                <s.Icon size={s.size} />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* 하단 tier = 법률/메타: 사업자 정보(활성 시)와 저작권 */}
      <div className="border-t border-hairline/60">
        <div className="mx-auto w-full max-w-page px-page py-3.5 text-[12px] text-ink-3">
          {BUSINESS_INFO ? (
            <p className="mb-1.5">
              {BUSINESS_INFO.company} · 대표 {BUSINESS_INFO.ceo} · 사업자등록번호{" "}
              {BUSINESS_INFO.regNo} · 통신판매업신고 {BUSINESS_INFO.mailOrder} ·{" "}
              {BUSINESS_INFO.address} · 문의 {BUSINESS_INFO.contact}
            </p>
          ) : null}
          <p className="text-right">© 2026 나루 NARU · GIWA 가속 데모</p>
        </div>
      </div>
    </footer>
  );
}
