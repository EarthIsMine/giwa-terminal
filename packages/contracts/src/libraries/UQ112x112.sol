// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice V2 표준 고정소수점(UQ112.112) — TWAP 누적가격 계산용.
/// 인덱서는 reserve 비율로 가격을 직접 계산하지만(CLAUDE.md 지표 정의),
/// 온체인 가격 오라클이 필요해질 때를 위해 V2와 동일한 누적기를 유지한다.
library UQ112x112 {
    uint224 internal constant Q112 = 2 ** 112;

    function encode(uint112 y) internal pure returns (uint224 z) {
        z = uint224(y) * Q112; // uint112 * 2^112 는 uint224를 넘지 않는다
    }

    function uqdiv(uint224 x, uint112 y) internal pure returns (uint224 z) {
        z = x / uint224(y);
    }
}
