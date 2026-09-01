import type { ReactNode } from "react";

/**
 * 법적 문서(이용약관·개인정보처리방침) 공용 표현 프리미티브.
 * 콘텐츠는 terms-content / privacy-content 가 쥐고, 여기선 골격만 준다
 * (page.tsx 조립 전용 원칙 - 리터럴 카피는 콘텐츠 컴포넌트로).
 */

export function LegalIntro({
  title,
  meta,
  lead,
}: {
  title: string;
  meta: string;
  lead: string;
}) {
  return (
    <header>
      <h1 className="text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
      <p className="mt-2 text-[13px] text-ink-3">{meta}</p>
      <p className="mt-4 leading-relaxed text-ink-2">{lead}</p>
    </header>
  );
}

export function LegalSection({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-[15px] font-semibold text-accent/90">
        {n}. {title}
      </h2>
      <div className="mt-2 space-y-2 leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}

// 임시 문서 각주 - 데모 단계임을 밝힌다(추정·확정 금지, 규칙 5의 정신)
export function LegalNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-10 border-t border-hairline/60 pt-4 text-[12.5px] leading-relaxed text-ink-3">
      {children}
    </p>
  );
}
