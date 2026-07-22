# @giwa/indexer — 나루 가격 데이터 레이어

GIWA Sepolia 의 나루스왑(V2 포크) 이벤트를 인덱싱해 **가격·캔들·체결·집계 지표**를
제공하는 [Ponder](https://ponder.sh) 앱. 터미널(apps/web)의 차트·체결 내역·변동률이
전부 여기서 나온다. 지표의 수학적 정의는 루트 `CLAUDE.md` "지표 정의" 섹션이 원본이다.

## 동작 방식

```
NaruswapV2Factory:PairCreated ─→ pairs        (WETH 페어만 — quote 없는 페어는 가격 정의 불가)
NaruswapV2Pair:Sync           ─→ pairs 갱신   (준비금 → 가격 = wethReserve/tokenReserve)
NaruswapV2Pair:Swap           ─→ trades       (체결 원장, tx.origin 보존)
                              └→ candles      (1m 원본 + 1h/1d 롤업 동시 upsert)
```

- V2 `swap()` 은 같은 tx 에서 Sync → Swap 순으로 이벤트를 내므로, Swap 핸들러 시점에는
  가격이 이미 체결 직후 준비금으로 갱신되어 있다. 그 가격을 체결가·캔들에 쓴다.
- 페어 주소는 `PairCreated` 이벤트에서 동적으로 발견한다(Ponder factory 패턴) —
  새 자산이 상장되면 자동으로 인덱싱에 편입된다.
- 멱등성·리오그 롤백은 Ponder 체크포인트가 보장한다.

## API (Hono, 기본 :42069)

| 엔드포인트 | 응답 |
|---|---|
| `GET /candles/:pair?interval=1m\|1h\|1d&limit=` | OHLCV (오름차순, wei 문자열) |
| `GET /trades/:pair?limit=` | 최근 체결 (최신순) |
| `GET /stats/:pair` | 당일 변동률(bps)·거래대금·체결 수·distinct `tx.origin` 참여 인원 |
| `GET /pairs` | 인덱싱된 페어 목록 (검증용) |

모든 화폐 값은 wei bigint 를 문자열로 직렬화한다 — 환산·포맷팅은 소비자 몫.

## 실행

```bash
pnpm indexer:dev     # 루트에서. 로컬 DB는 내장 PGlite (.ponder/) — Postgres 불필요
pnpm indexer:start   # 프로덕션 — DATABASE_URL(Postgres) 필요
```

체인 파라미터는 루트 `.env` 를 그대로 읽는다 (절대 규칙 4 — config 교체만으로 재싱크):
`NEXT_PUBLIC_GIWA_FACTORY_ADDRESS`, `NEXT_PUBLIC_GIWA_START_BLOCK` 필수.

| env | 용도 |
|---|---|
| `GIWA_INDEXER_RPC_URL` | 인덱서 전용 RPC (Nodit 등). 미설정 시 공개 RPC 폴백 |
| `DATABASE_URL` | 프로덕션 Postgres. 미설정 시 dev 는 PGlite |
| `DATABASE_SCHEMA` | `ponder start` 배포 스키마 — Railway 에선 `RAILWAY_DEPLOYMENT_ID` 활용 권장 |

## Railway 배포 메모

1. Postgres 플러그인 추가 → `DATABASE_URL` 주입
2. 서비스 루트는 저장소 루트, start command: `pnpm --filter @giwa/indexer start`
3. `DATABASE_SCHEMA=${{RAILWAY_DEPLOYMENT_ID}}` 설정 (배포마다 고유 스키마 — 무중단 전환)
4. 웹 서비스에 `INDEXER_URL` 을 인덱서 내부 주소로 설정 (서버-투-서버 소비, 공개 불필요)
