import { giwaChain } from "@giwa/config";

/**
 * 온보딩 가이드 본문 (명세서 P0) — 페이지(/guide)와 오버레이가 공유한다.
 * 원칙: 마찰(가스·브릿지 시간·7일 출금)은 겪기 전에 미리 고지한다 (기획서 §3).
 */

interface Step {
  title: string;
  body: React.ReactNode;
  note?: React.ReactNode;
}

const STEPS: Step[] = [
  {
    title: "지갑 준비",
    body: (
      <>
        기와월렛 또는 MetaMask 같은 이더리움 지갑을 설치합니다. 지갑을 만들면
        나오는 <b className="text-ink-2">복구 구문(시드 구문)은 종이에 적어
        보관</b>하세요 — 누구에게도 알려주면 안 되고, 나루가 물어보는 일도
        없습니다.
      </>
    ),
  },
  {
    title: "업비트에서 ETH 출금",
    body: (
      <>
        업비트에서 ETH를 <b className="text-ink-2">이더리움 네트워크</b>로 내
        지갑 주소에 출금합니다. 업비트는 아직 기와 체인 직접 입출금을 지원하지
        않아 이더리움을 한 번 거칩니다.
      </>
    ),
    note: (
      <>
        미리 알아둘 것 — 업비트 출금 수수료가 들고, 첫 출금 주소는 등록 절차가
        있을 수 있습니다. 출금 전 주소 앞뒤 4자리를 꼭 대조하세요.
      </>
    ),
  },
  {
    title: "공식 브릿지로 건너오기",
    body: (
      <>
        <a
          href={giwaChain.bridgeUrl}
          target="_blank"
          rel="noreferrer"
          className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
        >
          기와 공식 브릿지 ↗
        </a>
        에서 이더리움의 ETH를 기와 체인으로 이동합니다. 들어오는 방향은 보통 수
        분 안에 도착합니다.
      </>
    ),
    note: (
      <>
        미리 알아둘 것 — 이동에는 이더리움 가스비(네트워크 수수료)가 들고,{" "}
        <b className="text-ink-2">
          반대 방향(기와 → 이더리움) 출금은 약 7일이 걸립니다
        </b>
        (옵티미스틱 롤업의 이의 제기 기간 — 자산을 지키는 장치이지 수수료가
        아닙니다). 되돌아갈 계획까지 감안해 금액을 정하세요.
      </>
    ),
  },
  {
    title: "나루에서 첫 교환",
    body: (
      <>
        토큰 목록에서 검증 자산을 고르고 매수/매도 패널에서 교환합니다. 교환
        수수료는 0.3%이며 확인 화면에 원화로 환산해 보여줍니다.
      </>
    ),
    note: (
      <>
        미리 알아둘 것 — 모든 온체인 동작에는 소액의 가스비(ETH)가 듭니다. MAX
        버튼은 가스 예약분 0.001 ETH를 빼고 채워, 잔고 전부를 넣어 거래가
        실패하는 일을 막습니다.
      </>
    ),
  },
];

export function GuideContent() {
  return (
    <>
      <ol className="space-y-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="rounded-xl carved p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent/15 font-mono text-[12px] font-bold text-accent">
                {i + 1}
              </span>
              <h3 className="text-[15px] font-semibold">{step.title}</h3>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
              {step.body}
            </p>
            {step.note ? (
              <p className="mt-3 rounded-lg border border-warn/20 bg-warn/[0.06] px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-3">
                {step.note}
              </p>
            ) : null}
          </li>
        ))}
      </ol>

      <p className="mt-6 text-[11.5px] leading-relaxed text-ink-3">
        · 현재 나루는 {giwaChain.name} 테스트넷 데모로 동작하며, 화면의 거래
        데이터는 데모 시드 봇이 생성합니다.
        <br />· 이 안내는 이용 절차에 대한 정보 제공이며 투자 권유가 아닙니다.
      </p>
    </>
  );
}
