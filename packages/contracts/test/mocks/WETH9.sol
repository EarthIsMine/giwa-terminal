// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @notice 테스트용 WETH9 — GIWA 프리디플로이(0x4200...0006)와 동일한 인터페이스 표면
contract WETH9 {
    string public constant name = "Wrapped Ether";
    string public constant symbol = "WETH";
    uint8 public constant decimals = 18;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Deposit(address indexed dst, uint256 wad);
    event Withdrawal(address indexed src, uint256 wad);

    receive() external payable {
        deposit();
    }

    function deposit() public payable {
        balanceOf[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 wad) external {
        balanceOf[msg.sender] -= wad;
        (bool ok,) = msg.sender.call{value: wad}("");
        require(ok, "WETH: ETH_TRANSFER_FAILED");
        emit Withdrawal(msg.sender, wad);
    }

    function totalSupply() external view returns (uint256) {
        return address(this).balance;
    }

    function approve(address spender, uint256 wad) external returns (bool) {
        allowance[msg.sender][spender] = wad;
        emit Approval(msg.sender, spender, wad);
        return true;
    }

    function transfer(address to, uint256 wad) external returns (bool) {
        return _transferFrom(msg.sender, to, wad);
    }

    function transferFrom(address from, address to, uint256 wad) external returns (bool) {
        if (from != msg.sender && allowance[from][msg.sender] != type(uint256).max) {
            allowance[from][msg.sender] -= wad;
        }
        return _transferFrom(from, to, wad);
    }

    function _transferFrom(address from, address to, uint256 wad) private returns (bool) {
        balanceOf[from] -= wad;
        balanceOf[to] += wad;
        emit Transfer(from, to, wad);
        return true;
    }
}
