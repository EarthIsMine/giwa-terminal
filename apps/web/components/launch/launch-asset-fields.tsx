"use client";

/*
 * 2. 자산 정보 / 3. 링크 입력 섹션 - 값·변경은 전부 부모(LaunchForm) 상태에 위임한다.
 */

const INPUT_CLASS =
  "h-10 w-full rounded-lg border border-hairline bg-panel px-3.5 text-[13.5px] text-ink placeholder:text-ink-3";
const INVALID_INPUT_CLASS = "border-down/70";

const LABEL_CLASS = "mb-1.5 block text-[12.5px] font-medium text-ink-2";

/** 심볼 입력 정규화 - 대문자 영숫자 10자 제한 (기존 onChange 인라인 로직과 동일) */
function sanitizeTicker(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
}

export function LaunchAssetSection({
  name,
  onNameChange,
  ticker,
  onTickerChange,
  logoUrl,
  onLogoUrlChange,
  showLogo,
  onLogoError,
}: {
  name: string;
  onNameChange: (value: string) => void;
  ticker: string;
  onTickerChange: (value: string) => void;
  logoUrl: string;
  onLogoUrlChange: (value: string) => void;
  showLogo: boolean;
  onLogoError: () => void;
}) {
  return (
    <section className="rounded-xl carved p-6">
      <h2 className="text-[15px] font-semibold">2. 자산 정보</h2>
      <p className="mt-1.5 text-[12.5px] text-ink-3">
        공급량은 발행 시 고정되며, 이후 추가 발행·과세·소유자 권한이
        없습니다.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="asset-name" className={LABEL_CLASS}>
            자산 이름
          </label>
          <input
            id="asset-name"
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="예: 청자"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="asset-ticker" className={LABEL_CLASS}>
            심볼
          </label>
          <input
            id="asset-ticker"
            type="text"
            value={ticker}
            onChange={(e) => onTickerChange(sanitizeTicker(e.target.value))}
            placeholder="예: CHUNGJA"
            className={`${INPUT_CLASS} font-mono`}
          />
        </div>
      </div>
      <div className="mt-4">
        <span className={LABEL_CLASS}>
          로고{" "}
          <span className="font-normal text-ink-3">(이미지 URL)</span>
        </span>
        <div className="flex items-center gap-4">
          <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-dashed border-hairline text-[11px] text-ink-3">
            {showLogo ? (
              // 미리보기 전용 원격 이미지 - 업로드 전 확인 용도라 next/image 최적화 대상이 아니다
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="로고 미리보기"
                className="size-16 object-cover"
                onError={onLogoError}
              />
            ) : (
              "로고 없음"
            )}
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="asset-logo" className="sr-only">
              로고 이미지 URL
            </label>
            <input
              id="asset-logo"
              type="url"
              value={logoUrl}
              onChange={(e) => onLogoUrlChange(e.target.value)}
              placeholder="https://…/logo.png"
              className={INPUT_CLASS}
            />
            <p className="mt-1.5 text-[11.5px] text-ink-3">
              정사각형 PNG/JPG 직링크. IPFS나 자체 서버 모두 가능합니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LaunchLinksSection({
  website,
  onWebsiteChange,
  websiteValid,
  xUrl,
  onXUrlChange,
  xUrlValid,
  telegramUrl,
  onTelegramUrlChange,
  telegramUrlValid,
}: {
  website: string;
  onWebsiteChange: (value: string) => void;
  websiteValid: boolean;
  xUrl: string;
  onXUrlChange: (value: string) => void;
  xUrlValid: boolean;
  telegramUrl: string;
  onTelegramUrlChange: (value: string) => void;
  telegramUrlValid: boolean;
}) {
  return (
    <section className="rounded-xl carved p-6">
      <h2 className="text-[15px] font-semibold">
        3. 링크{" "}
        <span className="text-[12px] font-normal text-ink-3">(선택)</span>
      </h2>
      <p className="mt-1.5 text-[12.5px] text-ink-3">
        자산 상세 페이지에 표시됩니다. 발행 후 발행자 서명으로 변경할 수
        있습니다.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div>
          <label htmlFor="asset-website" className={LABEL_CLASS}>
            웹사이트
          </label>
          <input
            id="asset-website"
            type="url"
            value={website}
            onChange={(e) => onWebsiteChange(e.target.value)}
            aria-invalid={!websiteValid}
            placeholder="https://yourasset.xyz"
            className={`${INPUT_CLASS} ${websiteValid ? "" : INVALID_INPUT_CLASS}`}
          />
        </div>
        <div>
          <label htmlFor="asset-x" className={LABEL_CLASS}>
            X (트위터)
          </label>
          <input
            id="asset-x"
            type="url"
            value={xUrl}
            onChange={(e) => onXUrlChange(e.target.value)}
            aria-invalid={!xUrlValid}
            placeholder="https://x.com/yourasset"
            className={`${INPUT_CLASS} ${xUrlValid ? "" : INVALID_INPUT_CLASS}`}
          />
        </div>
        <div>
          <label htmlFor="asset-telegram" className={LABEL_CLASS}>
            Telegram
          </label>
          <input
            id="asset-telegram"
            type="url"
            value={telegramUrl}
            onChange={(e) => onTelegramUrlChange(e.target.value)}
            aria-invalid={!telegramUrlValid}
            placeholder="https://t.me/yourasset"
            className={`${INPUT_CLASS} ${telegramUrlValid ? "" : INVALID_INPUT_CLASS}`}
          />
        </div>
      </div>
    </section>
  );
}
