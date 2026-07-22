# @giwa-terminal/contracts

나루(NARU) 런치패드 온체인 스택 — 신원 검증 발행 게이트 + Naruswap V2 DEX.

```
src/
  identity/IdentityRegistry.sol   신원 검증 원장 (v1: 운영자 어테스테이션, 도장/GIWA ID 어댑터 자리)
  launchpad/TokenFactory.sol      발행 게이트 — 검증된 신원만 발행+상장 (런치패드 제품의 코어)
  launchpad/NaruToken.sol         고정 공급 ERC-20, 특권 표면 없음
  dex/NaruswapV2Factory.sol       V2 포크 팩토리
  dex/NaruswapV2Pair.sol          V2 포크 페어 (플래시스왑·프로토콜 수수료 제거)
  dex/NaruswapV2Router.sol        V2 포크 라우터 (축소판, getPair 조회 방식)
script/
  Deploy.s.sol                    전체 스택 배포 + 운영자 첫 어테스테이션
  Smoke.s.sol                     배포 후 발행→매수→매도 온체인 리허설
```

## 명령어

```bash
forge build
forge test          # 39 tests: 단위 + 퍼즈(K 불변식) + E2E + 인덱서 topic0 고정
```

## 배포 (GIWA Sepolia)

```bash
# .env: DEPLOYER_PRIVATE_KEY, GIWA_RPC_URL (WETH_ADDRESS 미설정 시 0x4200...0006)
forge script script/Deploy.s.sol --rpc-url $GIWA_RPC_URL --broadcast
```

출력된 주소·startBlock을 루트 `.env`(NEXT_PUBLIC_GIWA_*)에 기록한다. 주소는
`config/chains.ts` 한 곳으로만 흐른다 (절대 규칙 4).

### Blockscout verify (제출 필수)

```bash
forge verify-contract <ADDRESS> src/launchpad/TokenFactory.sol:TokenFactory \
  --verifier blockscout --verifier-url https://sepolia-explorer.giwa.io/api \
  --chain-id 91342
# IdentityRegistry, NaruswapV2Factory, NaruswapV2Router, (첫 발행 후) NaruToken·Pair 동일 절차
```

### 스모크 리허설

```bash
# .env에 배포 주소 채운 뒤
forge script script/Smoke.s.sol --rpc-url $GIWA_RPC_URL --broadcast
```

## 신뢰 모델 요약

- 발행은 `IdentityRegistry`를 통과한 신원만 가능 — "신청 → 검증 → 상장"의 온체인 게이트
- 발행 시점 신원 참조(identityRef)를 스냅샷으로 영구 기록 — 이후 revoke 되어도 발행 이력은 불변
- `NaruToken`은 owner/추가발행/수수료 스위치가 없다 — 발행자가 보유자 토큰에 손댈 수단 자체를 제거
- DEX 계층은 표준 V2 시맨틱 그대로 — 이벤트 topic0가 캐노니컬과 동일해 기존 툴링·인덱서 호환
