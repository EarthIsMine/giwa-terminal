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
 *
 * ⚠️ 양쪽 다 마운트된다 — 숨겨진 쪽의 useEffect·폴링·차트 마운트도 돈다.
 * 여기 넣는 컴포넌트는 순수 렌더로 유지하고, 데이터 조회·구독은 부모(컨테이너)가
 * 한 번만 해서 props 로 내린다. 이펙트가 꼭 필요한 무거운 쌍이 생기면 이 컴포넌트를
 * "첫 페인트는 CSS, 하이드레이션 후 안 보이는 쪽 언마운트" 하이브리드로 바꾼다
 * (조립부는 그대로 두고 여기 내부만 고치면 된다).
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
