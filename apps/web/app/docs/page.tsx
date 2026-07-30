import type { Metadata } from "next";
import { DocsFooter, DocsHeader, DocsIntro } from "@/components/docs/docs-chrome";
import { DocsNav } from "@/components/docs/docs-nav";
import { Section } from "@/components/docs/docs-primitives";
import { DOC_SECTIONS } from "@/components/docs/docs-sections";

/**
 * 기술 문서 (가속 제출물) — 이 파일은 조립 전용이다.
 * 콘텐츠는 docs-sections.tsx(단일 소스), 크롬은 docs-chrome.tsx,
 * 표현 프리미티브는 docs-primitives.tsx에 있다.
 */

export const metadata: Metadata = {
  title: "기술 문서 · 나루 NARU",
  description:
    "나루의 아키텍처, 체인 파라미터 주입 구조, 지표 정의, 컨트랙트, 신원 검증·온체인 분석 설계를 공개합니다.",
};

// 사이드바 목차는 본문과 같은 배열에서 파생 — 섹션 추가 시 여기 손댈 일 없음
const NAV_SECTIONS = DOC_SECTIONS.map(({ id, title }) => ({ id, title }));

export default function DocsPage() {
  return (
    <>
      <DocsHeader />
      <main className="mx-auto w-full max-w-[1180px] px-page pb-20 pt-8 sm:pt-12">
        <DocsIntro />
        <div className="mt-10 gap-10 lg:grid lg:grid-cols-[210px_minmax(0,1fr)]">
          <DocsNav sections={NAV_SECTIONS} />
          <div className="min-w-0 rounded-xl bg-black/[0.18] px-7 py-2">
            {DOC_SECTIONS.map(({ id, title, Content }) => (
              <Section key={id} id={id} title={title}>
                <Content />
              </Section>
            ))}
          </div>
        </div>
      </main>
      <DocsFooter />
    </>
  );
}
