// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice Uniswap V2와 동일한 수학 유틸 — 최초 유동성 산출(sqrt)과 비례 산출(min)에 사용.
library Math {
    function min(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = x < y ? x : y;
    }

    /// @dev 바빌로니안 방법. V2 원본과 동일한 결과를 내야 초기 LP 물량이 레퍼런스와 일치한다.
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
