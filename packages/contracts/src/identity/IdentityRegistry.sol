// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IIdentityVerifier} from "../interfaces/IIdentityVerifier.sol";
import {Owned} from "../libraries/Owned.sol";

/// @title IdentityRegistry - 신원 검증 원장 (v1: 운영자 어테스테이션)
///
/// 나루 런치패드의 발행 게이트가 참조하는 검증 원장. 검증 배지는 장식이 아니라
/// 스키마의 1급 시민이다 (절대 규칙 6) - 이 컨트랙트가 그 온체인 원천이다.
///
/// v1은 운영자(나루 팀)가 오프체인 심사 후 수동으로 어테스테이션을 기록한다.
/// 신청 → (오프체인 심사) → attest → 발행 자격 획득 - 프론트의 "신청 → 검증 → 상장"
/// 흐름과 대응된다. 도장(Dojang) 어테스테이션 / GIWA ID 온체인 연동이 공개되면
/// IIdentityVerifier를 구현한 어댑터로 교체하며, TokenFactory는 수정되지 않는다.
contract IdentityRegistry is IIdentityVerifier, Owned {
    struct Attestation {
        /// @dev 신원 참조: 도장 어테스테이션 해시, GIWA ID namehash 등 검증 근거의 지문.
        ///      개인정보 원문은 절대 온체인에 올리지 않는다.
        bytes32 identityRef;
        uint64 attestedAt;
    }

    mapping(address => Attestation) private _attestations;

    event Attested(address indexed subject, bytes32 identityRef);
    event Revoked(address indexed subject);

    error EmptyIdentityRef();
    error NotAttested();

    constructor(address initialOwner) Owned(initialOwner) {}

    /// @notice 오프체인 심사를 통과한 주소에 어테스테이션을 기록한다. 재호출 시 갱신.
    function attest(address subject, bytes32 identityRef) external onlyOwner {
        if (identityRef == bytes32(0)) revert EmptyIdentityRef();
        _attestations[subject] =
            Attestation({identityRef: identityRef, attestedAt: uint64(block.timestamp)});
        emit Attested(subject, identityRef);
    }

    /// @notice 어테스테이션 회수. 이후 신규 발행은 막히지만,
    ///         이미 발행된 토큰의 "발행 시점 검증" 기록(TokenFactory 스냅샷)은 남는다.
    function revoke(address subject) external onlyOwner {
        if (_attestations[subject].identityRef == bytes32(0)) revert NotAttested();
        delete _attestations[subject];
        emit Revoked(subject);
    }

    /// @inheritdoc IIdentityVerifier
    function isVerified(address subject) external view returns (bool) {
        return _attestations[subject].identityRef != bytes32(0);
    }

    /// @inheritdoc IIdentityVerifier
    function identityRefOf(address subject) external view returns (bytes32) {
        return _attestations[subject].identityRef;
    }

    /// @notice UI용 상세 조회 (검증 카드에 어테스테이션 시각 표시)
    function attestationOf(address subject)
        external
        view
        returns (bytes32 identityRef, uint64 attestedAt)
    {
        Attestation storage a = _attestations[subject];
        return (a.identityRef, a.attestedAt);
    }
}
