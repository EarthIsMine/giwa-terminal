// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {IdentityRegistry} from "../src/identity/IdentityRegistry.sol";
import {NaruswapV2Factory} from "../src/dex/NaruswapV2Factory.sol";
import {NaruswapV2Router} from "../src/dex/NaruswapV2Router.sol";
import {TokenFactory} from "../src/launchpad/TokenFactory.sol";
import {IWETH} from "../src/interfaces/IWETH.sol";

/// @notice 나루 스택 전체 배포. 출력된 주소·startBlock을 config/chains.ts(.env)에 기록한다.
///
/// 사용 (둘 중 하나):
///   A. keystore (권장 — 키가 평문으로 남지 않는다):
///      cast wallet import giwa-deployer --interactive   # 최초 1회
///      forge script script/Deploy.s.sol --rpc-url $GIWA_RPC_URL --account giwa-deployer --broadcast
///   B. env 키: packages/contracts/.env 에 DEPLOYER_PRIVATE_KEY 기록 후
///      forge script script/Deploy.s.sol --rpc-url $GIWA_RPC_URL --broadcast
///      (Foundry는 실행한 디렉토리의 .env만 자동 로드한다 — 루트 .env는 안 잡힘)
///
/// 선택 env: WETH_ADDRESS — 미설정 시 OP Stack 프리디플로이 0x4200...0006
contract Deploy is Script {
    function run() external {
        address weth =
            vm.envOr("WETH_ADDRESS", address(0x4200000000000000000000000000000000000006));

        // 키 소스 이원화: env에 키가 있으면 그것으로, 없으면 CLI 지갑(--account/--private-key)으로
        uint256 pk = vm.envOr("DEPLOYER_PRIVATE_KEY", uint256(0));
        if (pk != 0) {
            vm.startBroadcast(pk);
        } else {
            vm.startBroadcast();
        }
        (, address deployer,) = vm.readCallers(); // 실제 브로드캐스터 = 운영자
        // 키가 어디서도 로드되지 않으면 Foundry 기본 발신자로 시뮬레이션만 돈다 — 조기 차단
        require(
            deployer != DEFAULT_SENDER,
            "no wallet loaded: use --account <keystore> or set DEPLOYER_PRIVATE_KEY in packages/contracts/.env"
        );
        IdentityRegistry registry = new IdentityRegistry(deployer);
        NaruswapV2Factory dexFactory = new NaruswapV2Factory();
        NaruswapV2Router router = new NaruswapV2Router(address(dexFactory), weth);
        TokenFactory tokenFactory = new TokenFactory(registry, dexFactory, IWETH(weth));

        // 운영 지갑 첫 어테스테이션 — 데모 시드 봇이 제품과 같은 게이트로 발행한다
        registry.attest(deployer, keccak256("naru:seed-operator:v1"));
        vm.stopBroadcast();

        console2.log("=== NARU deployment ===");
        console2.log("IdentityRegistry :", address(registry));
        console2.log("NaruswapV2Factory:", address(dexFactory));
        console2.log("NaruswapV2Router :", address(router));
        console2.log("TokenFactory     :", address(tokenFactory));
        console2.log("WETH             :", weth);
        console2.log("operator         :", deployer);
        console2.log("startBlock       :", block.number);
    }
}
