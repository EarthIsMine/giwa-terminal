import { explorerAddressUrl } from "@giwa/config";

/**
 * 기술 문서 전용 표현 프리미티브 - 섹션 틀·강조·표.
 * 콘텐츠(docs-sections.tsx)와 조립(app/docs/page.tsx)이 공용으로 쓴다.
 */

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 border-b border-black/30 py-8 first:pt-0 last:border-0"
    >
      <h2 className="font-serif text-[20px] font-bold tracking-tight">
        {title}
      </h2>
      <div className="mt-4 space-y-3 text-[13px] leading-relaxed text-ink-2">
        {children}
      </div>
    </section>
  );
}

export function Term({ children }: { children: React.ReactNode }) {
  return <b className="font-medium text-ink">{children}</b>;
}

/**
 * [항목, 설명] 2열 표.
 * variant "mono" = 코드 식별자 키(경로·패키지명), "label" = 지표·항목명 키
 */
export function KeyValueTable({
  rows,
  variant = "label",
}: {
  rows: ReadonlyArray<readonly [string, string]>;
  variant?: "mono" | "label";
}) {
  const keyClass =
    variant === "mono"
      ? "py-2 pr-4 font-mono text-[12px] text-ink-3"
      : "w-24 py-2 pr-4 align-top font-medium text-ink";
  const valueClass = variant === "mono" ? "py-2" : "py-2 text-ink-2";
  return (
    <table className="w-full text-[12.5px]">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k} className="border-b border-black/25 last:border-0">
            <td className={keyClass}>{k}</td>
            <td className={valueClass}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function AddressRow({
  label,
  address,
}: {
  label: string;
  address: `0x${string}` | null;
}) {
  return (
    <tr className="border-b border-black/25 last:border-0">
      <td className="py-2 pr-4 text-ink-3">{label}</td>
      <td className="py-2 text-right">
        {address ? (
          <a
            href={explorerAddressUrl(address)}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[12px] text-ink-2 transition-colors hover:text-accent"
          >
            {address} ↗
          </a>
        ) : (
          <span className="text-[12px] text-ink-3">배포 후 공개</span>
        )}
      </td>
    </tr>
  );
}
