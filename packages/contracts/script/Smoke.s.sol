// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {NaruswapV2Router} from "../src/dex/NaruswapV2Router.sol";
import {TokenFactory} from "../src/launchpad/TokenFactory.sol";
import {NaruToken} from "../src/launchpad/NaruToken.sol";

/// @notice 배포 직후 GIWA Sepolia에서 실행하는 스모크 리허설:
///         발행+상장 → 매수 → 매도 전체 수명주기를 실제 체인에서 1회 왕복한다.
///         테스트넷 파우셋 ETH가 귀하므로 금액은 최소로 잡는다.
///
/// 사용: Deploy.s.sol과 동일한 키 방식 (--account keystore 또는 .env의 DEPLOYER_PRIVATE_KEY)
///   forge script script/Smoke.s.sol --rpc-url $GIWA_RPC_URL --account giwa-deployer --broadcast
///
/// 필요 env: TOKEN_FACTORY_ADDRESS, ROUTER_ADDRESS (배포 출력값)
contract Smoke is Script {
    NaruswapV2Router internal router;
    address internal operator;

    function run() external {
        TokenFactory tokenFactory = TokenFactory(vm.envAddress("TOKEN_FACTORY_ADDRESS"));
        router = NaruswapV2Router(payable(vm.envAddress("ROUTER_ADDRESS")));

        uint256 pk = vm.envOr("DEPLOYER_PRIVATE_KEY", uint256(0));
        if (pk != 0) {
            vm.startBroadcast(pk);
        } else {
            vm.startBroadcast();
        }
        (, operator,) = vm.readCallers();
        // Deploy.s.sol과 동일한 조기 차단 — 키 미로드 시 기본 발신자 시뮬레이션 방지
        require(
            operator != DEFAULT_SENDER,
            "no wallet loaded: use --account <keystore> or set DEPLOYER_PRIVATE_KEY in packages/contracts/.env"
        );
        (address token, address pair) = tokenFactory.issueAndList{value: 0.001 ether}(
            "Naru Smoke", "SMOKE", 1_000_000e18, 400_000e18, "smoke-test"
        );
        uint256 bought = _buy(token, 0.0001 ether);
        uint256 soldBack = _sell(token, bought);
        vm.stopBroadcast();

        console2.log("=== NARU smoke ===");
        console2.log("token :", token);
        console2.log("pair  :", pair);
        console2.log("bought (SMOKE):", bought);
        console2.log("sold back (wei ETH):", soldBack);
    }

    function _buy(address token, uint256 ethIn) internal returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = router.WETH();
        path[1] = token;
        uint256[] memory amounts =
            router.swapExactETHForTokens{value: ethIn}(0, path, operator, block.timestamp + 300);
        return amounts[1];
    }

    function _sell(address token, uint256 tokenIn) internal returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = token;
        path[1] = router.WETH();
        NaruToken(token).approve(address(router), tokenIn);
        uint256[] memory amounts =
            router.swapExactTokensForETH(tokenIn, 0, path, operator, block.timestamp + 300);
        return amounts[1];
    }
}
