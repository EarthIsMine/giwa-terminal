import type { Metadata, Viewport } from "next";
import { Noto_Serif_KR } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { NaruFeedDock } from "@/components/naru-feed-dock";
import { SearchProvider } from "@/components/search-context";
import { WalletProvider } from "@/components/wallet-context";

/** 히어로 헤드라인 전용 명조 — 수묵 풍경과 붓글씨 결 */
const notoSerifKr = Noto_Serif_KR({
  weight: ["600", "700"],
  subsets: ["latin"],
  variable: "--font-noto-serif-kr",
  display: "swap",
});

export const metadata: Metadata = {
  title: "나루 NARU — 업비트에서 기와 온체인으로 오는 나룻길",
  description:
    "기와체인(GIWA)의 신원 검증 자산을 업비트 보던 방식 그대로. 원화 환산 시세, 일·월 단위 변동, 낮은 정보 밀도.",
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
          테스트넷 데모 모드 — 시드 유동성·시뮬레이션 거래가 포함된 화면입니다.
          메인넷 지표와 다릅니다.
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
