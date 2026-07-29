/**
 * 상장 한 판의 배분 구조 — 문장을 그림으로 옮긴 것.
 *
 * ① 지갑들의 점수 기둥과 문턱선: 넘은 기둥만 밝다.
 * ② 넘은 지갑이 각 15점을 소각하며 참여를 확정한다.
 * ③ 배분 물량을 넘은 지갑 수대로 똑같이 자른다: 조각 크기가 전부 같다.
 *
 * 이 그림의 요점은 "포인트가 많아도 몫이 커지지 않는다"이다. 문턱은 자격이고
 * 배분은 지갑당 균등이다 — 점수 비례 배분처럼 보이면 그리는 의미가 없으므로
 * 조각은 반드시 같은 폭으로 그린다. 배분 물량의 크기는 상장마다 공지되는
 * 값이라 여기 숫자를 적지 않는다 (미확정 값을 확정처럼 그리지 않는다).
 *
 * 기둥 수·높이는 개념도용 임의값이다(데이터 아님). 색은 한지빛 한 계열 —
 * 넘음/못 넘음을 농도로만 가른다 (액센트는 데이터 인코딩에 쓰지 않는다).
 */

/** 개념도용 기둥 높이(px). 문턱(56px)을 넘는 4개 + 못 넘는 2개 */
const BARS = [84, 72, 64, 60, 38, 22] as const;
const THRESHOLD_PX = 56;
const QUALIFIED = BARS.filter((h) => h >= THRESHOLD_PX).length;

const HANJI_BRIGHT = "rgba(199, 186, 163, 0.72)";
const HANJI_DIM = "rgba(199, 186, 163, 0.24)";

export function PointsAllocationDiagram() {
  return (
    <div className="mt-6 border-t border-hairline/40 pt-5">
      <p className="text-[12.5px] font-medium text-ink-2">
        상장 한 판의 배분 구조
      </p>

      <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
        {/* ① 문턱 — 점수 기둥과 문턱선 */}
        <div className="flex-1">
          <div className="relative flex h-[96px] items-end gap-2.5 pr-14">
            {/* 문턱선 — 이 위에 선 기둥만 참여할 수 있다 */}
            <span
              aria-hidden
              className="absolute inset-x-0 border-t border-dashed border-ink-3/60"
              style={{ bottom: THRESHOLD_PX }}
            />
            <span
              className="absolute right-0 -translate-y-1/2 text-[10.5px] text-ink-3"
              style={{ bottom: THRESHOLD_PX - 7 }}
            >
              문턱 점수
            </span>
            {BARS.map((h, i) => (
              <span
                key={i}
                aria-hidden
                className="w-6 rounded-t"
                style={{
                  height: h,
                  backgroundColor: h >= THRESHOLD_PX ? HANJI_BRIGHT : HANJI_DIM,
                }}
              />
            ))}
          </div>
          <p className="mt-2.5 text-[11.5px] leading-snug text-ink-3">
            ① 포인트가 문턱을 넘은 지갑만 참여할 수 있습니다
          </p>
        </div>

        {/* ② 소각 — 참여 확정의 값 */}
        <div className="flex shrink-0 flex-col items-start justify-center gap-1 lg:items-center">
          <span aria-hidden className="hidden text-[18px] text-ink-3 lg:block">
            →
          </span>
          <span className="rounded-md border border-hairline bg-black/25 px-2.5 py-1 font-mono text-[12px] tabular-nums text-ink-2">
            각 −15점
          </span>
          <p className="text-[11.5px] leading-snug text-ink-3">
            ② 참여를 확정하며 소각
          </p>
        </div>

        {/* ③ 균등 배분 — 같은 폭의 조각 */}
        <div className="flex flex-1 flex-col justify-end">
          <p className="text-[10.5px] tracking-[0.06em] text-ink-3">
            배분 물량 · 상장마다 공지
          </p>
          <div className="mt-1.5 flex h-10 gap-[3px]">
            {Array.from({ length: QUALIFIED }, (_, i) => (
              <span
                key={i}
                className="grid flex-1 place-items-center rounded"
                style={{
                  backgroundColor: i === 1 ? HANJI_BRIGHT : "rgba(199, 186, 163, 0.42)",
                }}
              >
                {i === 1 ? (
                  <span className="text-[10px] font-semibold text-[#1a120a]">
                    내 몫
                  </span>
                ) : null}
              </span>
            ))}
          </div>
          <p className="mt-2.5 text-[11.5px] leading-snug text-ink-3">
            ③ 넘은 지갑 수대로 똑같이 나눕니다 · 조각은 전부 같은 크기
          </p>
        </div>
      </div>

      <p className="mt-4 max-w-[720px] text-[12px] leading-relaxed text-ink-2">
        포인트가 많아도 몫이 커지지 않습니다. 문턱은 자격이고, 배분은 지갑당
        균등입니다. 인증 지갑 하나가 곧 한 사람이기 때문에 가능한 방식입니다.
      </p>
    </div>
  );
}
