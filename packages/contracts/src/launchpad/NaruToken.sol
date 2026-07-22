// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title NaruToken — 발행 게이트를 통해서만 태어나는 표준 ERC-20
///
/// 설계 원칙: 토큰 자체에는 어떤 특권도 없다.
///  - 공급량은 생성 시 고정, mint/burn 함수 자체가 없다
///  - owner/수수료 스위치/블랙리스트 같은 러그 벡터 없음
///  - 검증·프로비넌스 정보는 TokenFactory 레지스트리가 들고, 토큰은 발행자 주소만 기록
/// 업저씨가 들고 있는 토큰에 발행자가 손댈 수 있는 수단을 남기지 않는 것이
/// "신원 검증 발행"과 짝을 이루는 신뢰 모델이다.
contract NaruToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public immutable totalSupply;

    /// @notice 발행자 (검증된 신원) — 익스플로러에서 바로 확인 가능하도록 토큰에도 남긴다
    address public immutable issuer;
    /// @notice 이 토큰을 발행한 게이트 컨트랙트
    address public immutable tokenFactory;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        address recipient,
        address issuer_
    ) {
        name = name_;
        symbol = symbol_;
        totalSupply = totalSupply_;
        issuer = issuer_;
        tokenFactory = msg.sender;
        balanceOf[recipient] = totalSupply_;
        emit Transfer(address(0), recipient, totalSupply_);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - value;
        }
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) private {
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }
}
