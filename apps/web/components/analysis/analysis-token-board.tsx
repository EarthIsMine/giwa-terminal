"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatCount } from "@giwa/shared";
import type { AssetVerification } from "@giwa/shared";
import { VERIFICATION_DETAIL, VERIFICATION_LEAD } from "@/lib/site";
import { AssetAvatar } from "@/components/ui/asset-avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";

/**
 * 분석 탭 - 토큰 보드 (5면 구성 §분석 [토큰 · 온체인 주식]의 앞쪽 절반).
 * 자산 상세의 보유 분포(단건 조회)를 전 자산 가로 비교로 편 것.
 * 수치는 전부 산정 기준이 붙은 사실값만 - 위험 점수·등급 같은 해석 지표와
 * 인사이더·스나이퍼 같은 추정 지표는 만들지 않는다 (추정 금지).
 */
export interface AnalysisTokenRow {
  address: `0x${string}`;
  symbol: string;
  nameKo: string;
  issuerName: string;
  verification: AssetVerification;
  /** Blockscout 집계 실패면 null - 0 으로 채우지 않는다 */
  holderCount: number | null;
  /** 발행자 지갑 보유 ÷ 총공급, ‰ */
  issuerPermille: number | null;
  /** 상위 10 지갑 합산 ÷ 총공급, ‰ - 유동성 페어 제외 */
  top10Permille: number | null;
  /** 최근 30일 distinct tx.origin - 인덱서 미연결이면 null */
  traders30d: number | null;
}

/**
 * 지분 셀 - 숫자 아래에 음각 홈이 찬 만큼의 막대.
 *
 * 등급 라벨(안전·주의·위험)이나 경고색은 붙이지 않는다. 나루는 이 자산들을
 * 검증해 상장시킨 주체라 자기가 통과시킨 자산에 위험 딱지를 다는 건 자기모순이고,
 * 발행자가 실명 단체여서 해석을 앞세우면 사실 서술의 선을 넘는다.
 * 게다가 상장 초기의 높은 발행자 물량은 이상 징후가 아니라 런치패드의 정상 상태다.
 * 길이와 농도로 정도만 보이고 판단은 독자 몫으로 남긴다.
 *
 * 색은 한지빛 한 계열만 쓴다 - 액센트(골든 오크)는 하락 빨강과 색각이상 축이
 * 가까워 데이터 인코딩에 쓰지 않고, 초록/빨강은 등락 전용 축이다.
 *
 * null 은 "-" (집계 실패·미연결을 0 과 구분한다).
 */
function ShareCell({ permille }: { permille: number | null }) {
  if (permille === null) {
    return <span className="text-ink-3">-</span>;
  }
  const ratio = Math.min(1, Math.max(0, permille / 1_000));
  return (
    <span className="inline-flex flex-col items-end gap-1.5">
      <span className="font-mono tabular-nums">
        {(permille / 10).toFixed(1)}
        <span className="ml-0.5 text-[11px] text-ink-3">%</span>
      </span>
      {/*
        눈금은 0~100% 고정이다. 값이 60~95% 에 몰려 있다고 축을 잘라 확대하면
        차이가 실제보다 커 보인다 - 비슷한 것은 비슷하게 보여야 한다.
        농도는 값에 따라 바꾸지 않는다: 길이가 이미 값을 말하고, 이 구간에서
        알파 차이는 눈에 잡히지 않아 이중 인코딩이 낭비다.
      */}
      <span
        aria-hidden
        className="block h-[4px] w-[86px] overflow-hidden rounded-full bg-black/55"
      >
        <span
          className="block h-full rounded-full bg-[rgba(199,186,163,0.72)]"
          style={{ width: `${ratio * 100}%` }}
        />
      </span>
    </span>
  );
}

function CountCell({ count }: { count: number | null }) {
  if (count === null) {
    return <span className="text-ink-3">-</span>;
  }
  return <span className="font-mono tabular-nums">{formatCount(count)}</span>;
}

/**
 * 좁은 폭에서는 우선순위 낮은 컬럼을 숨긴다 - 가로 스크롤 대신 컬럼 수를
 * 줄이는 메인 보드(asset-board-table COL_HIDE)와 같은 방식 (2026-09-01).
 * 자산·현재 참여 지갑은 항상 보인다. th/td 양쪽에 같은 클래스를 건다
 * (한쪽만 걸면 열이 어긋난다).
 */
const HEADERS = [
  { key: "asset", label: "자산", right: false, hide: "" },
  { key: "holders", label: "현재 참여 지갑", right: true, hide: "" },
  { key: "issuer", label: "발행자 물량", right: true, hide: "hidden sm:table-cell" },
  { key: "top10", label: "상위 10 집중도", right: true, hide: "hidden md:table-cell" },
  { key: "traders", label: "30일간 참여 지갑", right: true, hide: "hidden lg:table-cell" },
] as const;

type SortKey = (typeof HEADERS)[number]["key"];

/** 정렬용 숫자값 추출 - asset 은 여기 안 오고 이름 비교로 따로 처리한다 */
function sortValue(row: AnalysisTokenRow, key: SortKey): number | null {
  switch (key) {
    case "holders":
      return row.holderCount;
    case "issuer":
      return row.issuerPermille;
    case "top10":
      return row.top10Permille;
    case "traders":
      return row.traders30d;
    default:
      return null;
  }
}

export function AnalysisTokenBoard({ rows }: { rows: AnalysisTokenRow[] }) {
  // 헤더 클릭 정렬 (2026-09-01) - 숫자 컬럼은 내림차순부터, 같은 컬럼 재클릭으로
  // 반대 방향 → 해제(기본 순서 = 예치 규모 내림차순, 자산 보드와 동일) 순환.
  // null 은 방향과 무관하게 항상 끝 - 집계 실패가 "가장 작은 값"으로 읽히면 안 된다.
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean } | null>(null);

  const sortedRows = useMemo(() => {
    if (sort === null) return rows;
    const { key, desc } = sort;
    return [...rows].sort((a, b) => {
      if (key === "asset") {
        const cmp = a.nameKo.localeCompare(b.nameKo, "ko");
        return desc ? -cmp : cmp;
      }
      const av = sortValue(a, key);
      const bv = sortValue(b, key);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return desc ? bv - av : av - bv;
    });
  }, [rows, sort]);

  const toggleSort = (key: SortKey) => {
    setSort((prev) => {
      const descFirst = key !== "asset";
      if (prev === null || prev.key !== key) return { key, desc: descFirst };
      if (prev.desc === descFirst) return { key, desc: !descFirst };
      return null;
    });
  };

  return (
    <section className="mt-8">
      {/* 섹션 제목 없음 - 탭 라벨(토큰)이 이미 이름표라 겹치면 짜친다 (2026-09-01) */}
      {/* 테이블은 자산 보드와 같은 문법 - 감싸는 패널 없이 검은 홈줄 행 + 인두 띠 헤더 */}
      <div className="border-y border-black/45 bg-black/[0.12]">
        {/* min-w 고정폭은 뺐다 - 좁은 폭 대응은 HEADERS.hide(컬럼 숨김)가 맡고,
           overflow-x-auto 는 예상 밖 콘텐츠로 깨질 때의 마지막 안전망일 뿐이다 */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">
              상장 자산 보유 현황 비교. 현재 참여 지갑, 발행자 물량, 상위 10
              집중도, 30일간 참여 지갑
            </caption>
            <thead>
              <tr className="border-b border-black/45 bg-[#120c06]/[0.97]">
                {HEADERS.map((h) => {
                  const dir =
                    sort?.key === h.key ? (sort.desc ? "desc" : "asc") : null;
                  return (
                    <th
                      key={h.key}
                      scope="col"
                      aria-sort={
                        dir === "asc"
                          ? "ascending"
                          : dir === "desc"
                            ? "descending"
                            : undefined
                      }
                      className={`whitespace-nowrap px-4 py-2.5 text-[11.5px] font-medium tracking-[0.1em] text-ink-3 first:pl-6 last:pr-6 ${h.right ? "text-right" : ""} ${h.hide}`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(h.key)}
                        className="inline-flex items-center gap-1 transition-colors hover:text-ink-2"
                      >
                        {h.label}
                        {/* 업비트식 ▲▼ 세로 스택 - 항상 보이고, 활성 방향만 액센트로 켠다.
                           글리프는 정삼각형이라 납작한 캐럿은 SVG 로 직접 그린다 */}
                        <span
                          aria-hidden
                          className="inline-flex flex-col justify-center gap-[2px]"
                        >
                          <svg
                            width="7"
                            height="4"
                            viewBox="0 0 8 4"
                            className={
                              dir === "asc" ? "text-accent" : "text-ink-3/40"
                            }
                          >
                            <path d="M4 0 L8 4 H0 Z" fill="currentColor" />
                          </svg>
                          <svg
                            width="7"
                            height="4"
                            viewBox="0 0 8 4"
                            className={
                              dir === "desc" ? "text-accent" : "text-ink-3/40"
                            }
                          >
                            <path d="M4 4 L8 0 H0 Z" fill="currentColor" />
                          </svg>
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={HEADERS.length}
                    className="py-14 text-center text-[13.5px] text-ink-3"
                  >
                    자산을 불러오는 중이거나 아직 발행된 자산이 없습니다
                  </td>
                </tr>
              ) : (
                sortedRows.map((row) => (
                  <tr
                    key={row.address}
                    className="border-b border-black/30 transition-colors last:border-0 hover:bg-black/30"
                  >
                    <td className="px-4 py-2.5 first:pl-6">
                      <Link
                        href={`/asset/${row.address}`}
                        className="flex items-center gap-2.5"
                      >
                        <AssetAvatar symbol={row.symbol} size={30} />
                        {/* 업비트식 2단 셀 - 한글명 윗줄, 심볼 아랫줄 (2026-09-01) */}
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-[13px] font-medium text-ink">
                              {row.nameKo}
                            </span>
                            <VerifiedBadge verification={row.verification} />
                          </span>
                          <span className="font-mono text-[11px] text-ink-3">
                            {row.symbol}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-right text-[12.5px]">
                      <CountCell count={row.holderCount} />
                    </td>
                    <td className="hidden px-4 py-2.5 text-right text-[12.5px] sm:table-cell">
                      <ShareCell permille={row.issuerPermille} />
                    </td>
                    <td className="hidden px-4 py-2.5 text-right text-[12.5px] md:table-cell">
                      <ShareCell permille={row.top10Permille} />
                    </td>
                    <td className="hidden px-4 py-2.5 text-right text-[12.5px] last:pr-6 lg:table-cell">
                      <CountCell count={row.traders30d} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 산정 기준·고지 - 수치는 기준 없이는 읽을 수 없다 (절대 규칙 1·5·6) */}
      <div className="mt-3 space-y-1 text-[11.5px] leading-relaxed text-ink-3">
        <p>
          발행자 물량 = 발행자 지갑 보유량 ÷ 총공급. 상위 10 집중도 = 상위
          10개 지갑 합산 ÷ 총공급이며 예치 풀 등 기반 주소는 제외한
          값입니다. 막대는 그 비율을 길이로 옮긴 것일 뿐, 등급이나 경고가
          아닙니다. 상장 초기에는 발행자 물량이 높은 것이 일반적입니다.
        </p>
        <p>
          현재 참여 지갑은 지금 이 자산을 보유 중인 지갑 수, 30일간 참여
          지갑은 최근 30일 매수, 매도, 예치, 회수에 참여한 지갑 수입니다.
          테스트넷 데모라 시드 봇과 운영 지갑이 포함됩니다.
        </p>
        <p>
          집계에 실패한 값은 0 대신 -로 표시합니다. 인사이더와 스나이퍼
          비중은 취득 이력 산식 연결 후 제공되며, 추정치로 채우지 않습니다.
        </p>
        <p>
          <b className="font-medium text-ink-2">{VERIFICATION_LEAD}.</b>{" "}
          {VERIFICATION_DETAIL}
        </p>
      </div>
    </section>
  );
}
