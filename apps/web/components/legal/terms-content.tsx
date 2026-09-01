import {
  LegalIntro,
  LegalNote,
  LegalSection,
} from "@/components/legal/legal-primitives";

export function TermsContent() {
  return (
    <>
      <LegalIntro
        title="이용약관"
        meta="시행일 2026-09-01 · 데모 단계 임시 문서"
        lead="나루(NARU) 서비스 이용에 관한 기본 약정입니다. 현재 나루는 두나무 가속(GASOK) 심사용 데모이며 GIWA Sepolia 테스트넷 기준으로 동작합니다."
      />
      <LegalSection n={1} title="서비스 개요">
        <p>
          나루는 기와체인의 온체인 자산을 원화 환산 시세로 조회하고 거래하는
          터미널이자, 신원 검증을 통과한 발행자만 자산을 상장하는 런치패드입니다.
        </p>
      </LegalSection>
      <LegalSection n={2} title="금융상품이 아닙니다">
        <p>
          나루는 예금·이자·수익 보장·원금 보장을 제공하지 않습니다. 화면에
          표시되는 원화 금액은 업비트 KRW-ETH 시세로 환산한 참고값이며,
          기와체인에 원화 자산이 존재하는 것은 아닙니다.
        </p>
      </LegalSection>
      <LegalSection n={3} title="자산과 거래">
        <p>
          모든 온체인 거래는 이용자 지갑에서 직접 서명·전송되며 취소할 수
          없습니다. 나루는 이용자의 개인키나 자산을 보관하지 않습니다.
        </p>
      </LegalSection>
      <LegalSection n={4} title="데모 데이터">
        <p>
          테스트넷 화면을 채우기 위한 시드 데이터와 모의 거래가 포함되어 있으며,
          이는 메인넷 지표와 다릅니다.
        </p>
      </LegalSection>
      <LegalNote>
        본 약관은 데모 단계의 임시 문서로, 정식 서비스 출시 전 법률 검토를 거쳐
        개정됩니다.
      </LegalNote>
    </>
  );
}
