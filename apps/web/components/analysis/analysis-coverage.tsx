import { VERIFICATION_DISCLAIMER } from "@/lib/site";

/**
 * 체인 ↔ 나루 사이의 좌표 한 줄.
 *
 * 체인 전체 토큰을 순위표로 늘어놓지 않는다 - 그건 DEX 스캐너가 하는 일이고
 * (절대 규칙 3), 검증하지 않은 자산을 나루 화면에 세우면 "표시 자산은 신원 검증을
 * 통과한 자산으로 한정" 이라는 약속과 정면으로 어긋난다 (절대 규칙 6).
 * 대신 우리가 무엇을 다루고 무엇을 안 다루는지 범위만 밝힌다.
 * 누적 계단 차트는 그 범위가 시간을 따라 어떻게 넓어졌는지다 - 발행 시점
 * (온체인 issuedAt) 기준이라 인덱서 없이도 그려진다.
 */

const W = 600;
const H = 64;

function CoverageGrowth({ issuedAts }: { issuedAts: number[] }) {
  // 두 시점은 있어야 "넓어짐"이라 할 게 있다
  if (issuedAts.length < 2) return null;
  const sorted = [...issuedAts].sort((a, b) => a - b);
  const start = sorted[0];
  if (start === undefined) return null;
  const now = Math.floor(Date.now() / 1000);
  const span = Math.max(now - start, 1);
  const total = sorted.length;

  // 계단: 발행마다 한 칸 오르고, 마지막 값은 오늘까지 수평으로 잇는다
  let path = "";
  sorted.forEach((t, i) => {
    const x = (((t - start) / span) * W).toFixed(1);
    const y = (H - ((i + 1) / total) * H).toFixed(1);
    path += i === 0 ? `M${x},${H} L${x},${y}` : ` L${x},${(H - (i / total) * H).toFixed(1)} L${x},${y}`;
  });
  path += ` L${W},${0}`;

  const firstDate = new Date(start * 1000).toISOString().slice(0, 10);

  return (
    <div className="mt-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${firstDate}부터 오늘까지 검증 자산 수 누적. 현재 ${total}종.`}
        className="block h-16 w-full text-accent"
      >
        <defs>
          <linearGradient id="coverage-growth-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path
          d={`${path} L${W},${H} Z`}
          fill="url(#coverage-growth-fill)"
        />
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          className="opacity-80"
        />
      </svg>
      <div className="mt-1.5 flex justify-between font-mono text-[10.5px] tabular-nums text-ink-3">
        <span>{firstDate} 첫 발행</span>
        <span>오늘 {total}종</span>
      </div>
    </div>
  );
}

export function AnalysisCoverage({
  verifiedCount,
  issuedAts,
}: {
  verifiedCount: number;
  issuedAts: number[];
}) {
  return (
    <section className="mt-9 rounded-xl carved px-6 py-5">
      <h2 className="text-[15px] font-semibold">나루에서 표시하는 자산</h2>
      {/* 폭 제한 없음 - 데스크톱에서 한 줄로 떨어지게 (두 줄 리드는 답답하다는 피드백) */}
      <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
        기와체인에는 나루 밖에서 발행된 자산도 있습니다. 나루에는 발행 주체의
        신원을 확인한{" "}
        <strong className="font-semibold text-ink">{verifiedCount}종</strong>만
        표시합니다. 다른 경로로 발행된 자산은 같은 검증 절차가 마련된 뒤에
        다룹니다.
      </p>
      <CoverageGrowth issuedAts={issuedAts} />
      <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-3">
        {VERIFICATION_DISCLAIMER}
      </p>
    </section>
  );
}
