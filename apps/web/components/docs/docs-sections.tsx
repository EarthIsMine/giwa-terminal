import { giwaChain } from "@giwa/config";
import { VERIFICATION_LEAD } from "@/lib/site";
import { AddressRow, KeyValueTable, Term } from "@/components/docs/docs-primitives";

/**
 * 기술 문서 콘텐츠 - 섹션 목록과 본문의 단일 소스.
 * 섹션을 추가·삭제할 때는 이 파일의 DOC_SECTIONS 배열만 고치면
 * 사이드바 목차와 본문이 함께 따라온다. 내용의 원본은 CLAUDE.md / 개발 명세서 v1.3.
 */

function OverviewContent() {
  return (
    <>
      <p>
        나루는 기와체인(GIWA)의 <Term>가격 데이터 레이어</Term>와, 그 위에 올린{" "}
        <Term>업비트 유저용 온체인 터미널 · 검증 런치패드</Term>입니다. 두
        층으로 나뉩니다.
      </p>
      <pre className="overflow-x-auto rounded-lg border border-hairline/60 bg-black/30 px-4 py-3 font-mono text-[12px] leading-relaxed text-ink-2">
{`[하단] 인덱서 + 가격 API      기와 생태계의 가격 표준을 먼저 정의한다
[상단] 터미널 + 검증 런치패드  하단 API의 첫 번째 소비자이자 쇼케이스`}
      </pre>
      <p>
        타겟은 온체인 경험이 없는 업비트 이용자입니다. 그래서 화면은 반대로
        갑니다. 신원 검증을 통과한 자산만 수십 종 이내, 원화 환산 우선 표기,
        일·월 단위 변동률, 낮은 정보 밀도. 지수 표기(
        <span className="font-mono text-[12px]">$0.0₅…</span>)와 무한 스크롤은
        쓰지 않습니다.
      </p>
    </>
  );
}

function ArchitectureContent() {
  return (
    <>
      <p>pnpm 모노레포 4개 워크스페이스로 구성됩니다.</p>
      <KeyValueTable
        variant="mono"
        rows={[
          ["packages/contracts", "Foundry · V2 포크 DEX + 발행 게이트 + 신원 원장"],
          ["packages/indexer", "Ponder · 이벤트 전수 인덱싱 + 가격 API(Hono)"],
          ["apps/web", "Next.js App Router · 터미널 프론트 (서버 컴포넌트 중심)"],
          ["scripts/seed", "데모 토큰 발행 + 스왑 봇 (프로덕션 번들과 격리)"],
        ]}
      />
      <p>
        데이터 흐름:{" "}
        <span className="font-mono text-[12px]">
          체인 이벤트(PairCreated · Sync · Swap · TokenIssued/Listed ·
          Transfer) → Ponder → 가격 API → Next 서버(15초 재검증) → 화면
        </span>
        . 체결 이벤트는 라우터가 아니라 <Term>페어가 발행</Term>하므로 라우터를
        우회한 직접 체결도 전량 잡힙니다. 리오그는 Ponder의 체크포인트·롤백이
        처리하고, 같은 블록을 두 번 처리해도 결과가 같습니다.
      </p>
    </>
  );
}

function ChainConfigContent() {
  return (
    <>
      <p>
        RPC URL, chainId, 컨트랙트 주소, 시작 블록, 익스플로러 URL 등 체인에
        의존하는 모든 값은 <Term>env로 주입</Term>되며{" "}
        <span className="font-mono text-[12px]">config/chains.ts</span> 한
        곳으로만 흐릅니다. 코드에 주소나 chainId를 하드코딩하지 않습니다.
      </p>
      <p>
        따라서 프라이빗 메인넷 초대 시 <Term>env 교체만으로 재싱크</Term>됩니다.
        인덱서와 시드 봇은 재시작으로 충분하고, 웹은 NEXT_PUBLIC 값이 빌드
        타임에 정적 치환되므로 <Term>재빌드 1회가 포함</Term>됩니다. 서버 전용
        RPC(Nodit 등 키 포함 엔드포인트)는 NEXT_PUBLIC 접두사 없는 별도 변수로
        분리해 클라이언트 번들에 노출되지 않습니다.
      </p>
    </>
  );
}

function ContractsContent() {
  return (
    <>
      <p>
        Uniswap V2 포크(Factory / Pair / Router)에 발행 게이트와 신원 원장을
        더했습니다. 전 컨트랙트가 Blockscout에 소스 검증(verify)되어 있습니다.
      </p>
      <table className="w-full text-[12.5px]">
        <tbody>
          <AddressRow label="NaruswapV2Factory" address={giwaChain.factoryAddress} />
          <AddressRow label="NaruswapV2Router" address={giwaChain.routerAddress} />
          <AddressRow label="TokenFactory (발행 게이트)" address={giwaChain.tokenFactoryAddress} />
          <AddressRow label="IdentityRegistry (신원 원장)" address={giwaChain.identityRegistryAddress} />
          <AddressRow label="WETH (OP Stack 프리디플로이)" address={giwaChain.wethAddress} />
        </tbody>
      </table>
      <p>캐노니컬 V2 대비 의도적 변경은 세 가지뿐입니다.</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>플래시스왑 제거 · 데모 범위에서 공격 표면 축소</li>
        <li>
          프로토콜 수수료(feeTo/kLast) 제거 · 0.3% 전량 유동성 공급자 귀속,
          수수료 정책은 메인넷 단계에서 별도 결정
        </li>
        <li>LP 토큰 permit 제거</li>
      </ul>
      <p>
        발행은 <Term>issueAndList 단일 경로</Term>입니다: 신원 원장(attest)을
        통과한 주체만 호출할 수 있고, 공급량이 고정되고 추가발행·전송 과세·오너
        권한이 없는 토큰을 만들어 페어 생성과 초기 유동성 공급까지 한
        트랜잭션으로 끝냅니다. 검증 근거의 지문(identityRef)은 발행 시점에
        온체인에 영구 기록됩니다.
      </p>
    </>
  );
}

function MetricsContent() {
  return (
    <>
      <p>
        모든 화폐 계산은 bigint로 하고 표시 직전에만 문자열로 변환합니다.
        정의가 코드보다 우선합니다.
      </p>
      <KeyValueTable
        rows={[
          ["가격", "WETH 준비금 ÷ 토큰 준비금. 같은 tx에서 Sync가 Swap보다 먼저 발행되므로(V2 _update 순서) Sync가 가격을 갱신하고 Swap이 그 가격으로 체결·캔들을 기록"],
          ["캔들", "1분봉 원본 → 1h/1d 롤업을 같은 트랜잭션에서 upsert. 버킷 첫 체결의 open은 체결 직전 가격. 체결 후 가격을 쓰면 저활동 페어 변동률이 0%로 뭉개진다. 일봉 경계 00:00 UTC = 09:00 KST (업비트 일봉과 동일)"],
          ["원화 환산", "업비트 KRW-ETH 시세(60초 캐시) × ETH 가격. 온체인에 원화 자산은 없으며 항상 '환산 참고값'으로 표기. 조회 실패 시 ETH 단위로 폴백. 추정치를 확정값처럼 보여주지 않는다. 표시값은 항상 내림"],
          ["예치 규모", "풀 WETH 준비금 × 2 (V2 기준)"],
          ["거래대금", "윈도우 내 스왑의 WETH 체결액 합. 요청 시점 원장 스캔 없이 캔들에서 읽는다"],
          ["참여 인원", "distinct tx.origin (msg.sender를 쓰면 라우터 주소 하나로 집계된다)"],
          ["변동률", "당일(UTC) 일봉 open 대비 close. 데이터가 없으면 0%가 아니라 '데이터 없음'으로 응답"],
        ]}
      />
    </>
  );
}

function IdentityContent() {
  return (
    <>
      <p>
        기와는 익명 퍼미션리스 체인이 아니라 신원 기반 규제 준수 체인입니다.
        나루는 그 정체성을 발행 구조로 옮겼습니다.{" "}
        <Term>검증된 신원만 발행 게이트를 통과</Term>하고, 터미널에는 검증
        자산만 표시됩니다.
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          현행 신원 원장은 도장(Dojang) 어테스테이션 스키마를 준거한 자체
          IdentityRegistry입니다. 정식 attester 등록은 기와팀과 협의 중이며,
          연동 시 실제 검증 기록으로 대체됩니다
        </li>
        <li>
          배지 주체는 <Term>&ldquo;나루 검증&rdquo;</Term>으로 명시합니다. GIWA
          공식 인증이 아니며,{" "}
          <Term>{VERIFICATION_LEAD}</Term>
        </li>
        <li>
          나루 포인트의 참여 게이트는 기와의 실제 도장 컨트랙트를
          조회합니다(업비트 KYC Verified Address, 조회는 퍼미션리스). 지갑을
          아무리 만들어도 인증 없이는 적립되지 않는 시빌 방어 구조입니다
        </li>
      </ul>
    </>
  );
}

function AnalysisContent() {
  return (
    <>
      <p>
        발행 토큰의 <Term>Transfer를 전수 인덱싱</Term>해 홀더 잔고 원장과 지갑
        간 직접 전송 그래프를 만듭니다. 발행자·팀 지갑은 심사에서 등록되므로
        라벨이 추론이 아니라 기록입니다.
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          홀더 관계도: 버블 = 상위 홀더(크기 = 보유 비중), 선 = 두 지갑 간 직접
          전송 이력
        </li>
        <li>
          클러스터 = 연결 성분(union-find). 그래프를 전체 전송 참여자 위에서
          만들고 홀더로 투영해, 잔고 0인 경유 지갑을 통한 간접 연결도 같은
          클러스터로 묶입니다
        </li>
        <li>
          라우터·페어·팩토리 같은 인프라 주소는 성분 계산에서 제외합니다.
          거르지 않으면 모든 거래 지갑이 한 덩어리가 됩니다
        </li>
        <li>
          인사이더·스나이퍼 비중은 취득 이력 산식 연결 후 제공하며, 그 전에는
          추정치로 채우지 않습니다
        </li>
      </ul>
    </>
  );
}

function SeedContent() {
  return (
    <>
      <p>
        테스트넷 화면의 거래 데이터는 데모 시드 봇이 생성하며, 이 사실을{" "}
        <Term>숨기지 않습니다</Term>. 화면 상단 배너·목록·차트·푸터에 고지하고,
        온체인 메타데이터에도 시드 표식이 남습니다.
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          발행은 멱등합니다. 로컬 상태가 아니라 온체인 레지스트리와 메타데이터
          버전으로 기발행을 판별해 재기동·중간 실패에 안전합니다
        </li>
        <li>
          봇 지갑은 배포 지갑과 분리된 테스트넷 전용 키이며, 설정이
          테스트넷(chainId 91342)이 아니면 기동 자체를 거부합니다
        </li>
        <li>메인넷에서는 시드 봇을 운영하지 않습니다</li>
      </ul>
    </>
  );
}

function StackContent() {
  return (
    <>
      <KeyValueTable
        rows={[
          ["인덱서", "Ponder (viem 기반, 리오그 처리 내장) + PostgreSQL"],
          ["프론트", "Next.js App Router · TypeScript strict (any 금지)"],
          ["체인 연동", "viem (지갑은 EIP-6963 멀티 프로바이더)"],
          ["시각화", "TanStack Table · TradingView Lightweight Charts · d3-force"],
          ["컨트랙트", "Foundry (Solidity 0.8) · Blockscout verify"],
          ["보조 데이터", "홀더 수·상위 홀더 Blockscout API / ETH-KRW 업비트 시세 API"],
        ]}
      />
      <p className="text-[11.5px] text-ink-3">
        본 문서는 {giwaChain.name} 테스트넷 데모 기준이며, 문서의 정의는
        저장소의 CLAUDE.md · 개발 명세서와 동기화됩니다.
      </p>
    </>
  );
}

export interface DocSectionEntry {
  id: string;
  title: string;
  Content: () => React.ReactNode;
}

export const DOC_SECTIONS: readonly DocSectionEntry[] = [
  { id: "overview", title: "개요", Content: OverviewContent },
  { id: "architecture", title: "아키텍처", Content: ArchitectureContent },
  { id: "chain-config", title: "체인 파라미터 주입", Content: ChainConfigContent },
  { id: "contracts", title: "컨트랙트", Content: ContractsContent },
  { id: "metrics", title: "지표 정의", Content: MetricsContent },
  { id: "identity", title: "신원 검증", Content: IdentityContent },
  { id: "analysis", title: "온체인 분석", Content: AnalysisContent },
  { id: "seed", title: "데모 시드 데이터", Content: SeedContent },
  { id: "stack", title: "기술 스택", Content: StackContent },
];
