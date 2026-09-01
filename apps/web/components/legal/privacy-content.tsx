import {
  LegalIntro,
  LegalNote,
  LegalSection,
} from "@/components/legal/legal-primitives";

export function PrivacyContent() {
  return (
    <>
      <LegalIntro
        title="개인정보처리방침"
        meta="시행일 2026-09-01 · 데모 단계 임시 문서"
        lead="나루(NARU)는 개인정보를 수집·보관하지 않는 것을 원칙으로 설계되었습니다."
      />
      <LegalSection n={1} title="개인정보 비보유 원칙">
        <p>
          나루는 회원가입 절차가 없으며 이름·이메일·전화번호 등 개인정보를
          수집하거나 저장하지 않습니다.
        </p>
      </LegalSection>
      <LegalSection n={2} title="지갑 연결">
        <p>
          지갑 주소는 서버에 저장하지 않으며, 매 방문 시 이용자 지갑에서 새로
          받습니다. 브라우저에는 이용자가 선택한 지갑 종류 표식 하나만 저장하며,
          주소·잔고·서명 값은 저장하지 않습니다.
        </p>
      </LegalSection>
      <LegalSection n={3} title="외부 시세 조회">
        <p>
          원화 환산을 위해 업비트 공개 시세 API를 조회합니다. 이 과정에서
          이용자를 식별할 수 있는 정보는 전송하지 않습니다.
        </p>
      </LegalSection>
      <LegalSection n={4} title="온체인 공개 데이터">
        <p>
          화면의 잔고·거래 내역은 기와체인 공개 원장과 Blockscout 공개 기록에서
          조회한 것으로, 특정 개인을 식별하기 위해 별도로 수집하는 정보가
          아닙니다.
        </p>
      </LegalSection>
      <LegalNote>
        본 방침은 데모 단계의 임시 문서로, 정식 서비스 출시 전 법률 검토를 거쳐
        개정됩니다.
      </LegalNote>
    </>
  );
}
