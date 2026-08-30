"use client";

import { flexRender } from "@tanstack/react-table";
import type { Table } from "@tanstack/react-table";
import type { LiveAsset } from "@/components/asset/asset-board-model";

/**
 * 자산 보드 - 데스크톱 테이블 렌더.
 * 모바일 카드(asset-board-cards)와의 전환은 컨테이너의 <Responsive> 조립이 정한다
 * - 여기는 뷰포트를 모른다. 상태·컬럼 정의도 asset-board(컨테이너) 소유.
 */

const RIGHT_ALIGNED = new Set([
  "price",
  "change",
  "marketCap",
  "volume",
  "netInflow",
  "trades",
  "traders",
  "liquidity",
  "totalFees",
]);

/**
 * 컬럼별 고정 폭 - 나머지는 자산 컬럼이 흡수한다.
 * 풀폭 전환(2026-08-26) 후 자산 컬럼 하나가 남는 공간을 전부 삼켜 이름과 지표
 * 사이에 큰 빈 띠가 생겼다. 지표 컬럼 폭을 넓혀 그 여백을 나눠 갖게 한다.
 */
const COL_WIDTH: Record<string, string> = {
  // 지표 컬럼 고정폭 합이 뷰포트를 넘어서면(특히 xl 진입 직후) 브라우저가
  // 나머지 공간을 자산 컬럼에서 뺏어가 0에 가깝게 눌린다 - 공백 없는 한글
  // 자산명은 줄바꿈 기회가 글자 사이마다 있어 한 글자씩 세로로 쌓인다.
  // 최소폭을 걸어 그 붕괴를 막는다(진짜 좁으면 overflow-x-auto 로 넘긴다)
  asset: "min-w-[220px]",
  price: "w-[200px]",
  change: "w-[140px]",
  marketCap: "w-[150px]",
  volume: "w-[150px]",
  netInflow: "w-[150px]",
  trades: "w-[120px]",
  traders: "w-[140px]",
  liquidity: "w-[150px]",
  totalFees: "w-[150px]",
};

/**
 * 좁은 데스크톱에서 우선순위 낮은 컬럼을 숨긴다 - 가로 스크롤 없이 테이블을
 * 항상 화면 폭에 고정하기 위해서다(2026-08-29). 컬럼 고정폭 합이 화면을 넘으면
 * 브라우저가 폭을 눌러 숫자+단위("5.89 억")가 세로로 쪼개지므로, 줄이는 게 아니라
 * 숨긴다. 브레이크포인트는 "그 폭에서 남는 컬럼들의 고정폭 합 < 뷰포트"가 되도록
 * 잡았다(2026-08-31): lg(1024) 6열, xl(1280) 7열, 2xl(1536)에 나머지 3열.
 * 자산·현재가·변동률·예치 규모는 항상 보인다 - 목록에서 자산을 고르는 핵심 지표.
 * th/td 양쪽에 같은 클래스를 건다 (한쪽만 걸면 열이 어긋난다).
 */
const COL_HIDE: Record<string, string> = {
  marketCap: "hidden lg:table-cell",
  volume: "hidden lg:table-cell",
  netInflow: "hidden xl:table-cell",
  trades: "hidden 2xl:table-cell",
  traders: "hidden 2xl:table-cell",
  totalFees: "hidden 2xl:table-cell",
};

export function AssetBoardTable({
  table,
  query,
  onRowClick,
}: {
  table: Table<LiveAsset>;
  query: string;
  onRowClick: (asset: LiveAsset) => void;
}) {
  const rows = table.getRowModel().rows;

  return (
    /* 테이블 - 감싸는 패널 없이 전폭으로 펼친다. 행은 투명하게 두고
       영역 전체에 옅은 그늘 하나만 얹어 나무 결이 그대로 비치게 한다 */
    <div className="mt-4 border-y border-black/45 bg-black/[0.12]">
      {/* min-w 고정폭은 뺐다(2026-08-29) - 1760px 미만 데스크톱에서 무조건 가로
         스크롤이 생겼다. 테이블은 화면 폭에 고정하고, 남는 공간 배분은 COL_WIDTH,
         좁은 폭 대응은 COL_HIDE(컬럼 숨김)가 맡는다. overflow-x-auto 는 예상 밖
         콘텐츠(아주 긴 자산명 등)로 레이아웃이 깨질 때의 마지막 안전망일 뿐,
         정상 상태에서는 어떤 폭에서도 스크롤이 생기지 않는다 */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">
            기와체인 검증 자산 목록. 실데이터: 현재가, 예치 규모
          </caption>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr
                key={hg.id}
                className="border-b border-black/45 bg-[#120c06]/[0.97]"
              >
                <th
                  scope="col"
                  className="w-14 py-2.5 pl-page pr-2 text-[11.5px] font-medium tracking-[0.1em] text-ink-3"
                >
                  #
                </th>
                {hg.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const right = RIGHT_ALIGNED.has(header.column.id);
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                            ? "descending"
                            : undefined
                      }
                      className={`whitespace-nowrap px-6 py-2.5 text-[11.5px] font-medium tracking-[0.1em] text-ink-3 last:pr-8 ${right ? "text-right" : ""} ${COL_WIDTH[header.column.id] ?? ""} ${COL_HIDE[header.column.id] ?? ""}`}
                    >
                      {header.column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 transition-colors hover:text-ink-2"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          <span aria-hidden className="text-[9px]">
                            {sorted === "asc"
                              ? "▲"
                              : sorted === "desc"
                                ? "▼"
                                : ""}
                          </span>
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                {/* # 열 + 컬럼 10개 */}
                <td
                  colSpan={11}
                  className="py-14 text-center text-[13.5px] text-ink-3"
                >
                  {query.trim() === ""
                    ? "자산을 불러오는 중이거나 아직 발행된 자산이 없습니다"
                    : `"${query}" 검색 결과가 없습니다`}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick(row.original)}
                  className="cursor-pointer border-b border-black/30 transition-colors last:border-0 hover:bg-black/30"
                >
                  <td className="py-3.5 pl-page pr-2 font-mono text-[11px] text-ink-3">
                    #{i + 1}
                  </td>
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`px-6 py-3.5 last:pr-8 ${RIGHT_ALIGNED.has(cell.column.id) ? "whitespace-nowrap text-right" : ""} ${COL_HIDE[cell.column.id] ?? ""}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
