"use client";

import { useEffect, useState } from "react";
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from "d3-force";
import type { SimulationLinkDatum, SimulationNodeDatum } from "d3-force";
import { shortHex } from "@giwa/shared";
import type { HolderGraphWire } from "@/lib/indexer";

/**
 * 홀더 관계도 (버블맵) — 명세서 §2.2 / Bubblemaps 공개 방법론.
 * 버블 = 상위 홀더(크기 = 보유 비중), 선 = 두 지갑 간 직접 전송 이력,
 * 클러스터 = 연결 성분(계산은 인덱서 API의 union-find — 여기는 그리기만 한다).
 * 색: 발행자 연계 = 하락 빨강 계열(경고 아님, 등록 라벨 표시), 연결 클러스터 = 한지색,
 * 단독 = 저채도 브라운. 액센트 금지(데이터 인코딩 금지 규칙).
 * 시뮬레이션은 마운트 후에만 돈다 — SSR 결정성 문제를 피한다.
 */

interface SimNode extends SimulationNodeDatum {
  id: string;
  r: number;
  permille: number;
  isIssuer: boolean;
  issuerLinked: boolean;
  clustered: boolean;
  clusterId: string;
}

interface Layout {
  nodes: SimNode[];
  links: { source: SimNode; target: SimNode }[];
}

const WIDTH = 640;
const HEIGHT = 400;

function radiusOf(permille: number): number {
  // 면적 ∝ 보유 비중 (√ 스케일), 화면 하한·상한
  return Math.max(5, Math.min(36, Math.sqrt(permille) * 3.4));
}

function nodeFill(n: SimNode): string {
  if (n.issuerLinked) return "rgba(246, 70, 93, 0.65)"; // 발행자 연계 — down 계열
  if (n.clustered) return "rgba(179, 166, 144, 0.75)"; // 연결 클러스터 — 한지색
  return "rgba(141, 128, 104, 0.45)"; // 단독 — 저채도
}

function runLayout(graph: HolderGraphWire): Layout {
  const nodes: SimNode[] = graph.nodes.map((n) => ({
    id: n.address,
    r: radiusOf(n.permille),
    permille: n.permille,
    isIssuer: n.isIssuer,
    issuerLinked: n.issuerLinked,
    clustered: n.clustered,
    clusterId: n.clusterId,
  }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const links = graph.links
    .filter((l) => byId.has(l.source) && byId.has(l.target))
    .map((l) => ({
      source: byId.get(l.source) as SimNode,
      target: byId.get(l.target) as SimNode,
    }));

  // 같은 클러스터끼리 같은 앵커로 모은다 — 성분별 시각적 군집
  const clusterIds = [...new Set(nodes.map((n) => n.clusterId))];
  const anchor = new Map<string, { x: number; y: number }>();
  clusterIds.forEach((id, i) => {
    const angle = (i / Math.max(1, clusterIds.length)) * Math.PI * 2;
    anchor.set(id, {
      x: WIDTH / 2 + Math.cos(angle) * WIDTH * 0.22,
      y: HEIGHT / 2 + Math.sin(angle) * HEIGHT * 0.22,
    });
  });

  const sim = forceSimulation(nodes)
    .force("charge", forceManyBody().strength(-24))
    .force(
      "link",
      forceLink<SimNode, SimulationLinkDatum<SimNode>>(links)
        .distance(46)
        .strength(0.5),
    )
    .force(
      "collide",
      forceCollide<SimNode>().radius((d) => d.r + 3),
    )
    .force("x", forceX<SimNode>((d) => anchor.get(d.clusterId)?.x ?? WIDTH / 2).strength(0.08))
    .force("y", forceY<SimNode>((d) => anchor.get(d.clusterId)?.y ?? HEIGHT / 2).strength(0.1))
    .stop();
  for (let i = 0; i < 300; i++) sim.tick();

  // 화면 밖 이탈 클램프
  for (const n of nodes) {
    n.x = Math.max(n.r + 2, Math.min(WIDTH - n.r - 2, n.x ?? WIDTH / 2));
    n.y = Math.max(n.r + 2, Math.min(HEIGHT - n.r - 2, n.y ?? HEIGHT / 2));
  }
  return { nodes, links };
}

export function HolderGraph({ graph }: { graph: HolderGraphWire }) {
  const [layout, setLayout] = useState<Layout | null>(null);
  useEffect(() => {
    setLayout(runLayout(graph));
  }, [graph]);

  if (!layout) {
    return (
      <div className="grid h-[280px] place-items-center text-[12px] text-ink-3">
        관계도를 그리는 중…
      </div>
    );
  }

  const hasLinks = layout.links.length > 0;

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="홀더 관계도: 버블 크기는 보유 비중, 선은 두 지갑 간 직접 전송 이력"
        className="h-auto w-full"
      >
        <g stroke="rgba(179, 166, 144, 0.3)" strokeWidth="1">
          {layout.links.map((l) => (
            <line
              key={`${l.source.id}-${l.target.id}`}
              x1={l.source.x}
              y1={l.source.y}
              x2={l.target.x}
              y2={l.target.y}
            />
          ))}
        </g>
        {layout.nodes.map((n) => (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r={n.r} fill={nodeFill(n)}>
              <title>
                {`${shortHex(n.id, 6, 4)} · ${(n.permille / 10).toFixed(1)}%${n.isIssuer ? " · 발행자" : n.issuerLinked ? " · 발행자 연계" : ""}`}
              </title>
            </circle>
            {n.isIssuer ? (
              <text
                x={n.x}
                y={(n.y ?? 0) + 3}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill="#2a1c10"
              >
                발행자
              </text>
            ) : null}
          </g>
        ))}
      </svg>
      {/* 범례는 실제로 그려진 것만 설명한다 — 연결이 없는데 클러스터 색을 안내하면
          "왜 저 색이 없지"를 유발한다 */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-ink-3">
        <span className="flex items-center gap-1.5">
          <i className="size-2 rounded-full" style={{ background: "rgba(246,70,93,.65)" }} />
          발행자·연계 지갑
        </span>
        {hasLinks ? (
          <span className="flex items-center gap-1.5">
            <i className="size-2 rounded-full" style={{ background: "rgba(179,166,144,.75)" }} />
            연결 클러스터
          </span>
        ) : null}
        <span className="flex items-center gap-1.5">
          <i className="size-2 rounded-full" style={{ background: "rgba(141,128,104,.45)" }} />
          단독(연결 없음)
        </span>
        <span>
          {hasLinks
            ? "선 = 두 지갑 간 직접 전송 이력 · 크기 = 보유 비중"
            : "크기 = 보유 비중 · 라우터·페어를 거친 매매는 지갑 간 연결로 치지 않습니다"}
        </span>
      </div>
    </div>
  );
}
