// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice WETH9 인터페이스.
/// GIWA는 OP Stack 체인이라 표준 프리디플로이 WETH9(0x4200...0006)가 존재한다.
/// 주소는 하드코딩하지 않고 배포 스크립트에서 env로 주입한다 (절대 규칙 4).
interface IWETH {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address owner) external view returns (uint256);
}
