// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {INaruswapV2Factory} from "../interfaces/INaruswapV2Factory.sol";
import {NaruswapV2Pair} from "./NaruswapV2Pair.sol";

/// @title NaruswapV2Factory - 페어 팩토리 (Uniswap V2 포크)
/// @notice 페어 생성은 퍼미션리스로 둔다. 발행 게이트(신원 검증)는 TokenFactory 계층의
///         책임이고, DEX 계층은 표준 V2 시맨틱을 유지해 기존 툴링 호환성을 지킨다.
///         feeTo(프로토콜 수수료)는 v1에서 제거 - 수수료는 전량 LP 귀속.
contract NaruswapV2Factory is INaruswapV2Factory {
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "Naruswap: IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "Naruswap: ZERO_ADDRESS");
        require(getPair[token0][token1] == address(0), "Naruswap: PAIR_EXISTS");

        // CREATE2: 토큰 쌍으로 주소가 결정된다 (V2 동일)
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        pair = address(new NaruswapV2Pair{salt: salt}());
        NaruswapV2Pair(pair).initialize(token0, token1);

        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // 역방향 조회
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);
    }
}
