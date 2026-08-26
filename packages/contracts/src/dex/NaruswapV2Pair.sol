// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {INaruswapV2Pair} from "../interfaces/INaruswapV2Pair.sol";
import {IERC20} from "../interfaces/IERC20.sol";
import {Math} from "../libraries/Math.sol";
import {UQ112x112} from "../libraries/UQ112x112.sol";

/// @title NaruswapV2Pair - 나루 터미널의 유동성 페어 (Uniswap V2 포크)
///
/// 캐노니컬 V2에서 의도적으로 뺀 것 두 가지, 이유와 함께:
///  1. 플래시스왑 콜백(swap의 data 파라미터): v1 제품 범위 밖. 콜백 리엔트런시 표면을
///     통째로 제거해 심사 시점 공격면을 줄인다.
///  2. 프로토콜 수수료(feeTo / kLast): 스왑 수수료 0.3%는 전량 LP에 귀속된다.
///     수수료 정책은 메인넷 단계에서 별도 결정한다.
/// 이벤트/수학/상태 배치는 V2와 동일하다 - 기존 V2 인덱서·툴링이 그대로 붙는다.
contract NaruswapV2Pair is INaruswapV2Pair {
    using UQ112x112 for uint224;

    // --- LP 토큰 (V2처럼 페어 자체가 ERC-20) ---
    string public constant name = "Naruswap V2";
    string public constant symbol = "NARU-V2";
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    /// @dev 최초 유동성에서 영구 잠그는 물량 - 풀 전량 인출로 가격이 붕괴하는 것을 막는다 (V2 동일)
    uint256 public constant MINIMUM_LIQUIDITY = 1e3;

    address public immutable factory;
    address public token0;
    address public token1;

    uint112 private reserve0;
    uint112 private reserve1;
    uint32 private blockTimestampLast;

    uint256 public price0CumulativeLast;
    uint256 public price1CumulativeLast;

    // --- 리엔트런시 락 ---
    uint256 private unlocked = 1;

    modifier lock() {
        require(unlocked == 1, "Naruswap: LOCKED");
        unlocked = 0;
        _;
        unlocked = 1;
    }

    constructor() {
        factory = msg.sender;
    }

    /// @notice 팩토리가 CREATE2 배포 직후 1회 호출
    function initialize(address token0_, address token1_) external {
        require(msg.sender == factory, "Naruswap: FORBIDDEN");
        token0 = token0_;
        token1 = token1_;
    }

    function getReserves()
        public
        view
        returns (uint112 reserve0_, uint112 reserve1_, uint32 blockTimestampLast_)
    {
        reserve0_ = reserve0;
        reserve1_ = reserve1;
        blockTimestampLast_ = blockTimestampLast;
    }

    // ------------------------------------------------------------------
    // LP ERC-20
    // ------------------------------------------------------------------

    function _mint(address to, uint256 value) private {
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }

    function _burn(address from, uint256 value) private {
        balanceOf[from] -= value;
        totalSupply -= value;
        emit Transfer(from, address(0), value);
    }

    function _transfer(address from, address to, uint256 value) private {
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
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

    // ------------------------------------------------------------------
    // 페어 코어
    // ------------------------------------------------------------------

    /// @dev 준비금 갱신 + TWAP 누적. 누적기 오버플로 래핑은 V2 설계 의도라 unchecked로 재현한다.
    function _update(uint256 balance0, uint256 balance1, uint112 reserve0_, uint112 reserve1_)
        private
    {
        require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, "Naruswap: OVERFLOW");
        unchecked {
            uint32 blockTimestamp = uint32(block.timestamp % 2 ** 32);
            uint32 timeElapsed = blockTimestamp - blockTimestampLast; // 의도된 래핑
            if (timeElapsed > 0 && reserve0_ != 0 && reserve1_ != 0) {
                price0CumulativeLast +=
                    uint256(UQ112x112.encode(reserve1_).uqdiv(reserve0_)) * timeElapsed;
                price1CumulativeLast +=
                    uint256(UQ112x112.encode(reserve0_).uqdiv(reserve1_)) * timeElapsed;
            }
            blockTimestampLast = blockTimestamp;
        }
        // 위 require에서 uint112 상한을 이미 검증했으므로 안전한 캐스트다
        // forge-lint: disable-next-line(unsafe-typecast)
        reserve0 = uint112(balance0);
        // forge-lint: disable-next-line(unsafe-typecast)
        reserve1 = uint112(balance1);
        emit Sync(reserve0, reserve1);
    }

    /// @notice 유동성 공급. 호출 전에 토큰을 페어로 먼저 보내는 V2 패턴 (라우터가 대행)
    function mint(address to) external lock returns (uint256 liquidity) {
        (uint112 reserve0_, uint112 reserve1_,) = getReserves();
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 amount0 = balance0 - reserve0_;
        uint256 amount1 = balance1 - reserve1_;

        uint256 totalSupply_ = totalSupply;
        if (totalSupply_ == 0) {
            liquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(0), MINIMUM_LIQUIDITY);
        } else {
            liquidity = Math.min(
                (amount0 * totalSupply_) / reserve0_, (amount1 * totalSupply_) / reserve1_
            );
        }
        require(liquidity > 0, "Naruswap: INSUFFICIENT_LIQUIDITY_MINTED");
        _mint(to, liquidity);

        _update(balance0, balance1, reserve0_, reserve1_);
        emit Mint(msg.sender, amount0, amount1);
    }

    /// @notice 유동성 회수. LP 토큰을 페어로 먼저 보낸 뒤 호출하는 V2 패턴 (라우터가 대행)
    function burn(address to) external lock returns (uint256 amount0, uint256 amount1) {
        (uint112 reserve0_, uint112 reserve1_,) = getReserves();
        address token0_ = token0;
        address token1_ = token1;
        uint256 balance0 = IERC20(token0_).balanceOf(address(this));
        uint256 balance1 = IERC20(token1_).balanceOf(address(this));
        uint256 liquidity = balanceOf[address(this)];

        uint256 totalSupply_ = totalSupply;
        amount0 = (liquidity * balance0) / totalSupply_;
        amount1 = (liquidity * balance1) / totalSupply_;
        require(amount0 > 0 && amount1 > 0, "Naruswap: INSUFFICIENT_LIQUIDITY_BURNED");
        _burn(address(this), liquidity);
        _safeTransfer(token0_, to, amount0);
        _safeTransfer(token1_, to, amount1);
        balance0 = IERC20(token0_).balanceOf(address(this));
        balance1 = IERC20(token1_).balanceOf(address(this));

        _update(balance0, balance1, reserve0_, reserve1_);
        emit Burn(msg.sender, amount0, amount1, to);
    }

    /// @notice 스왑. 출력을 낙관적으로 먼저 보내고 K 불변식(수수료 0.3% 반영)으로 검증하는 V2 방식
    function swap(uint256 amount0Out, uint256 amount1Out, address to) external lock {
        require(amount0Out > 0 || amount1Out > 0, "Naruswap: INSUFFICIENT_OUTPUT_AMOUNT");
        (uint112 reserve0_, uint112 reserve1_,) = getReserves();
        require(amount0Out < reserve0_ && amount1Out < reserve1_, "Naruswap: INSUFFICIENT_LIQUIDITY");

        uint256 balance0;
        uint256 balance1;
        {
            address token0_ = token0;
            address token1_ = token1;
            require(to != token0_ && to != token1_, "Naruswap: INVALID_TO");
            if (amount0Out > 0) _safeTransfer(token0_, to, amount0Out);
            if (amount1Out > 0) _safeTransfer(token1_, to, amount1Out);
            balance0 = IERC20(token0_).balanceOf(address(this));
            balance1 = IERC20(token1_).balanceOf(address(this));
        }
        uint256 amount0In =
            balance0 > reserve0_ - amount0Out ? balance0 - (reserve0_ - amount0Out) : 0;
        uint256 amount1In =
            balance1 > reserve1_ - amount1Out ? balance1 - (reserve1_ - amount1Out) : 0;
        require(amount0In > 0 || amount1In > 0, "Naruswap: INSUFFICIENT_INPUT_AMOUNT");
        {
            // 수수료 0.3%: 입력에 3/1000을 적용한 조정 잔고로 K를 검증한다
            uint256 balance0Adjusted = balance0 * 1000 - amount0In * 3;
            uint256 balance1Adjusted = balance1 * 1000 - amount1In * 3;
            require(
                balance0Adjusted * balance1Adjusted
                    >= uint256(reserve0_) * uint256(reserve1_) * 1000 ** 2,
                "Naruswap: K"
            );
        }

        _update(balance0, balance1, reserve0_, reserve1_);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    /// @notice 준비금 초과분을 걷어낸다 (직접 전송으로 쌓인 토큰 회수)
    function skim(address to) external lock {
        address token0_ = token0;
        address token1_ = token1;
        _safeTransfer(token0_, to, IERC20(token0_).balanceOf(address(this)) - reserve0);
        _safeTransfer(token1_, to, IERC20(token1_).balanceOf(address(this)) - reserve1);
    }

    /// @notice 준비금을 실제 잔고에 강제 동기화
    function sync() external lock {
        _update(
            IERC20(token0).balanceOf(address(this)),
            IERC20(token1).balanceOf(address(this)),
            reserve0,
            reserve1
        );
    }

    /// @dev 반환값이 없거나 true인 ERC-20 모두 수용 (USDT류 비표준 대응)
    function _safeTransfer(address token, address to, uint256 value) private {
        (bool success, bytes memory data) =
            token.call(abi.encodeCall(IERC20.transfer, (to, value)));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "Naruswap: TRANSFER_FAILED");
    }
}
