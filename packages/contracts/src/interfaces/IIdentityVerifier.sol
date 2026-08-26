// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice 신원 검증 조회 인터페이스 - 발행 게이트(TokenFactory)가 의존하는 유일한 표면.
///
/// 나루 런치패드의 정체성은 "신원 검증 발행"이다 (2026-07-21 팀 결정).
/// v1은 운영자 어테스테이션 방식의 IdentityRegistry가 이 인터페이스를 구현하고,
/// 도장(Dojang) 어테스테이션 / GIWA ID 온체인 연동이 열리면
/// 같은 인터페이스를 구현한 어댑터로 교체한다. TokenFactory는 수정하지 않는다.
interface IIdentityVerifier {
    /// @notice 해당 주소가 현재 검증된 발행 주체인지
    function isVerified(address subject) external view returns (bool);

    /// @notice 검증에 사용된 신원 참조 (도장 어테스테이션 해시, GIWA ID namehash 등).
    ///         미검증 주소는 bytes32(0)을 반환한다.
    function identityRefOf(address subject) external view returns (bytes32);
}
