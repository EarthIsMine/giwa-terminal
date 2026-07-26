"use client";

import { useEffect, useState } from "react";
import { formatKrwCompact, wei, weiToDisplayKrw } from "@giwa/shared";
import type { DisplayKrw } from "@giwa/shared";
import type { LiveAssetWire } from "@/lib/onchain";
import { useWallet } from "./wallet-context";

/**
 * 나루 포인트 (기획서 §4.4 · 명세서 §2.5) — 시즌 0 이전의 정직한 화면.
 * 지금 실동작하는 것: ① 도장(Dojang) 업비트 KYC 게이트 온체인 조회
 * ② 예상 잔고 포인트 미리보기 — 명세서 산식 그대로(매도 시뮬레이션 평가).
 * 가짜 점수·가짜 이벤트는 만들지 않는다. 적립 원장은 시즌 0 집계 서버(P1)가 연다.
 * 카피 주의: 수익·보상 보장 표현 금지(절대 규칙 2) — "참여", "배분"만 쓴다.
 */

interface PortfolioResponse {
  ethBalance: string;
  holdings: (LiveAssetWire & { balance: string })[];
  ethKrw: string | null;
}

/** V2 매도 시뮬레이션 — 스팟가 아닌 "실제로 팔 때 받는 ETH" (조작 방어, 명세서 §2.5) */
function saleEth(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) return 0n;
  const withFee = amountIn * 997n;
  return (withFee * reserveOut) / (reserveIn * 1000n + withFee);
}

/** 잔고 구간표 (명세서 §2.5) — DisplayKrw(0.001원 단위)로 비교 */
const TIERS = [
  { minKrwMilli: 100_000_000_000n, points: 4, label: "1억원 이상" },
  { minKrwMilli: 10_000_000_000n, points: 3, label: "1,000만원 ~ 1억원" },
  { minKrwMilli: 1_000_000_000n, points: 2, label: "100만원 ~ 1,000만원" },
  { minKrwMilli: 100_000_000n, points: 1, label: "10만원 ~ 100만원" },
  { minKrwMilli: 0n, points: 0, label: "10만원 미만" },
] as const;

type KycState = "idle" | "loading" | "verified" | "unverified" | "error";

export function PointsView() {
  const { account, setLoginOpen } = useWallet();
  const [kyc, setKyc] = useState<KycState>("idle");
  const [valueKrwMilli, setValueKrwMilli] = useState<bigint | null>(null);
  const [valueLoaded, setValueLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setKyc(account ? "loading" : "idle");
    setValueKrwMilli(null);
    setValueLoaded(false);
    if (!account) return;

    const load = async () => {
      try {
        const [dojangRes, portfolioRes] = await Promise.all([
          fetch(`/api/dojang?address=${account}`),
          fetch(`/api/portfolio?address=${account}`),
        ]);
        if (!cancelled && dojangRes.ok) {
          const { verified } = (await dojangRes.json()) as {
            verified: boolean | null;
          };
          setKyc(
            verified === null ? "error" : verified ? "verified" : "unverified",
          );
        } else if (!cancelled) {
          setKyc("error");
        }
        if (!cancelled && portfolioRes.ok) {
          const p = (await portfolioRes.json()) as PortfolioResponse;
          if (p.ethKrw) {
            const ethKrw = BigInt(p.ethKrw);
            // 평가액 = ETH 잔고 + Σ(검증 자산을 풀에 전량 매도했을 때 받는 ETH)
            let totalWei = BigInt(p.ethBalance);
            for (const h of p.holdings) {
              totalWei += saleEth(
                BigInt(h.balance),
                BigInt(h.tokenReserveWei),
                BigInt(h.wethReserveWei),
              );
            }
            setValueKrwMilli(
              weiToDisplayKrw(wei(totalWei), ethKrw) as bigint,
            );
          }
          setValueLoaded(true);
        }
      } catch {
        if (!cancelled) setKyc("error");
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [account]);

  // 마지막 구간이 min 0 이라 find 는 항상 매칭 — 폴백은 타입 안전용
  const tier =
    valueKrwMilli === null
      ? null
      : (TIERS.find((t) => valueKrwMilli >= t.minKrwMilli) ?? TIERS[0]);

  return (
    <div className="mt-8 flex flex-col gap-5 xl:flex-row">
      {/* 좌: 내 자격·미리보기 */}
      <div className="w-full shrink-0 xl:w-[420px]">
        <div className="rounded-xl carved p-6">
          <h2 className="text-[15px] font-semibold">참여 자격 확인</h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">
            포인트 적립과 배분 참여는{" "}
            <b className="text-ink-2">업비트 KYC 인증 지갑</b>(도장 Verified
            Address)에만 열립니다. 인증 여부는 기와의 도장 컨트랙트에서 직접
            조회합니다.
          </p>

          {!account ? (
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="mt-4 w-full rounded-lg bg-accent py-3 text-[13.5px] font-semibold text-accent-ink transition-[filter] hover:brightness-110"
            >
              지갑 연결하고 자격 확인
            </button>
          ) : (
            <div className="mt-4 space-y-3">
              {kyc === "loading" ? (
                <p className="text-[12.5px] text-ink-3">
                  도장 어테스테이션 조회 중…
                </p>
              ) : kyc === "verified" ? (
                <p className="rounded-lg border border-good/25 bg-good/10 px-3.5 py-2.5 text-[12.5px] text-good">
                  업비트 KYC 인증 지갑입니다 — 시즌 0 적립 대상
                </p>
              ) : kyc === "unverified" ? (
                <div className="rounded-lg border border-hairline bg-black/20 px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-3">
                  이 지갑에는 업비트 KYC 어테스테이션(UPBIT_KOREA)이 없습니다.
                  <br />
                  테스트넷에서의 발급 정책은 기와팀과 확인 중입니다 — 시즌 0
                  산식은 인증 발급 상황에 맞춰 조정될 수 있습니다.
                </div>
              ) : (
                <p className="text-[12.5px] text-ink-3">
                  도장 조회에 실패했습니다 — 잠시 후 다시 시도해 주세요.
                </p>
              )}

              {/* 예상 잔고 포인트 미리보기 */}
              <div className="rounded-lg border border-hairline/60 bg-black/20 p-4">
                <div className="flex items-baseline justify-between">
                  <p className="text-[11.5px] text-ink-3">
                    예상 잔고 포인트 (미리보기)
                  </p>
                  <span className="text-[10px] text-ink-3">
                    적립은 시즌 0 개시 후
                  </span>
                </div>
                {tier !== null && valueKrwMilli !== null ? (
                  <>
                    <p className="mt-2 font-mono text-[26px] font-bold tabular-nums">
                      {tier.points}
                      <span className="ml-1 text-[13px] font-medium text-ink-3">
                        점/일
                      </span>
                    </p>
                    <p className="mt-1 text-[11px] text-ink-3">
                      평가액{" "}
                      {formatKrwCompact(valueKrwMilli as DisplayKrw)}원 ·{" "}
                      {tier.label} 구간
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-[12px] text-ink-3">
                    {valueLoaded
                      ? "원화 환산이 일시 불가해 계산할 수 없습니다."
                      : "온체인 잔고 계산 중…"}
                  </p>
                )}
                <p className="mt-2.5 border-t border-hairline/40 pt-2 text-[10.5px] leading-relaxed text-ink-3">
                  평가액 = GIWA ETH + 검증 자산. 검증 자산은 시세가 아니라{" "}
                  <b className="text-ink-2">
                    풀에 실제 매도했을 때 받는 금액
                  </b>
                  으로 평가합니다 — 얇은 풀에서 시세를 띄워 구간을 올리는 조작이
                  통하지 않습니다. LP 포지션 가중(2배)은 시즌 0에서 반영됩니다.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 우: 루프·산식 공개 */}
      <div className="min-w-0 flex-1 space-y-5">
        <div className="rounded-xl carved p-6">
          <h2 className="text-[15px] font-semibold">포인트가 도는 길</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-4">
            {[
              ["쌓기", "보유 잔고와 순매수로 매일 포인트가 쌓입니다 (15일 롤링)"],
              ["문턱", "새 자산 상장 이벤트마다 참여 문턱 점수가 열립니다"],
              ["소각", "참여를 확정하면 포인트 15점이 소각됩니다"],
              ["배분", "문턱을 넘은 인증 지갑에 균등 배분 — 추첨 없는 확정형"],
            ].map(([title, body], i) => (
              <li
                key={title}
                className="rounded-lg border border-hairline/60 bg-black/20 p-4"
              >
                <span className="grid size-5 place-items-center rounded-full bg-accent/15 font-mono text-[10.5px] font-bold text-accent">
                  {i + 1}
                </span>
                <p className="mt-2 text-[13px] font-semibold">{title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-3">
                  {body}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-xl carved p-6">
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-[15px] font-semibold">산식 공개</h2>
            <span className="text-[11px] text-ink-3">
              규칙을 전부 공개합니다 — 검증 가능한 적립이 원칙입니다
            </span>
          </div>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <div>
              <p className="text-[12.5px] font-medium text-ink-2">
                잔고 포인트 (일 1회 스냅샷)
              </p>
              <table className="mt-2 w-full text-[12px]">
                <tbody>
                  {[...TIERS].reverse().map((t) => (
                    <tr
                      key={t.label}
                      className="border-b border-black/25 last:border-0"
                    >
                      <td className="py-1.5 text-ink-3">{t.label}</td>
                      <td className="py-1.5 text-right font-mono tabular-nums">
                        {t.points}점/일
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[10.5px] leading-relaxed text-ink-3">
                스냅샷 시각은 매일 무작위이며, 기준 블록번호를 사후 공개해 누구나
                자기 점수를 재계산할 수 있게 합니다. LP 포지션은 2배 가중.
              </p>
            </div>
            <div className="space-y-3 text-[12px] leading-relaxed text-ink-3">
              <p>
                <b className="text-ink-2">매수 포인트</b> — 일일 순매수(매수 −
                매도) 3,000원부터, 금액이 2배가 될 때마다 1점씩 추가됩니다.
                신규 상장 자산은 상장 후 30일간 2배.
              </p>
              <p>
                <b className="text-ink-2">15일 롤링 · FIFO 소각</b> — 포인트는
                적립 후 15일이 지나면 소멸하고, 소각은 가장 오래된 적립분부터
                차감됩니다.
              </p>
              <p>
                <b className="text-ink-2">조작 방어</b> — 매수분은 다음 잔고
                스냅샷까지 보유해야 확정되고(사고 바로 팔면 무효), 같은 클러스터
                지갑끼리의 거래는 상계되며, 발행자·팀 지갑은 자사 자산 이벤트에
                참여할 수 없습니다.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl carved p-6">
          <h2 className="text-[15px] font-semibold">다가오는 상장 이벤트</h2>
          <p className="mt-3 grid h-[88px] place-items-center rounded-lg border border-dashed border-hairline text-[12.5px] text-ink-3">
            시즌 0 개시 후 이곳에 열립니다 — 첫 검증 상장과 함께 시작합니다
          </p>
        </div>

        <p className="text-[11px] leading-relaxed text-ink-3">
          · 포인트는 양도·환금할 수 없고 온체인 토큰이 아닙니다. 배분은 추첨
          없는 확정형이며 확률형 요소를 도입하지 않습니다.
          <br />· 인증 지갑 하나에 나루 계정 하나만 연결됩니다. 로그인 자체는
          누구나 가능하고, 시세·분석 조회에는 제한이 없습니다.
          <br />· 배분 참여는 투자 권유가 아니며, 배분 자산의 가치는 변동할 수
          있습니다.
        </p>
      </div>
    </div>
  );
}
