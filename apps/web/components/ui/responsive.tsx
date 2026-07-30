/**
 * 뷰포트별 조립 스위치 — 조립부(부모)가 데스크톱/모바일 구성을 명시적으로 선언한다.
 *
 * 내부는 CSS 전환(md 경계): 둘 다 렌더하고 한쪽만 보인다. 훅(isMobile ? A : B)이
 * 아닌 이유는 SSR — 서버는 뷰포트를 몰라서 훅 분기는 모바일 첫 페인트에 데스크톱
 * 뷰가 번쩍인다. CSS는 JS 로드 전에도 첫 페인트부터 올바른 뷰가 나온다 (UX 우선).
 * 뷰포트별 "동작" 분기가 필요하면 hooks/use-media-query 를 쓴다.
 *
 * 사용처: 뷰 단위 쌍(테이블 ↔ 카드)에만. 헤더 크롬처럼 flex 줄 안의 아이템은
 * 래퍼 div가 레이아웃을 깨므로 인라인 반응형 클래스로 남긴다.
 */
export function Responsive({
  desktop,
  mobile,
}: {
  desktop: React.ReactNode;
  mobile: React.ReactNode;
}) {
  return (
    <>
      <div className="hidden md:block">{desktop}</div>
      <div className="md:hidden">{mobile}</div>
    </>
  );
}
