import type { Metadata, Viewport } from "next";
import { Noto_Serif_KR } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
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
  themeColor: "#070b14",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${GeistMono.variable} ${notoSerifKr.variable}`}>
      <body>
        <WalletProvider>
          <SearchProvider>{children}</SearchProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
