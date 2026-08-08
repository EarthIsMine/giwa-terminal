import type { Metadata, Viewport } from "next";
import { Noto_Serif_KR } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { NaruFeedDock } from "@/components/feed/naru-feed-dock";
import { SearchProvider } from "@/contexts/search-context";
import { WalletProvider } from "@/contexts/wallet-context";

/** 히어로 헤드라인 전용 명조 — 수묵 풍경과 붓글씨 결 */
const notoSerifKr = Noto_Serif_KR({
  weight: ["600", "700"],
  subsets: ["latin"],
  variable: "--font-noto-serif-kr",
  display: "swap",
});

export const metadata: Metadata = {
  title: "나루 NARU · 업비트에서 기와체인으로 오는 나룻길",
  description:
    "발행 주체의 신원을 확인한 기와체인 자산의 시세와 변동을 원화로 확인하세요.",
};

export const viewport: Viewport = {
  themeColor: "#2a1c10",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${GeistMono.variable} ${notoSerifKr.variable}`}>
      <body>
        {/* 절대 규칙 5 + 명세서 §6-9: 데모 모드 상시 고지 — 메인넷 빌드에서 제거 */}
        <div className="border-b border-warn/25 bg-warn/[0.07] px-4 py-1.5 text-center text-[11.5px] text-warn/90">
          테스트넷 데모입니다. 시드 예치와 모의 거래가 포함돼 메인넷 지표와
          다릅니다.
        </div>
        <WalletProvider>
          <SearchProvider>{children}</SearchProvider>
        </WalletProvider>
        {/* 나루터 소식 — 하단 고정 도크 (전 페이지 공통, 데이터 없으면 비노출) */}
        <NaruFeedDock />
      </body>
    </html>
  );
}
