/** 소셜 아이콘 세트 - currentColor 기반, 크기만 주입 */

export function XIcon({ size = 13 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden>
      <path
        fill="currentColor"
        d="M12.6 1.75h2.05l-4.48 5.12 5.27 6.97h-4.13L8.08 9.61l-3.7 4.23H2.33l4.79-5.48L2.06 1.75h4.23l2.92 3.86 3.39-3.86zm-.72 10.86h1.14L5.67 2.91H4.45l7.43 9.7z"
      />
    </svg>
  );
}

export function TelegramIcon({ size = 13 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden>
      <path
        fill="currentColor"
        d="M14.5 2.2 1.7 7.15c-.63.25-.6 1.15.05 1.35l3.25 1.02 1.25 3.96c.19.6.95.74 1.35.26l1.65-2 3.3 2.43c.5.37 1.2.09 1.32-.52l1.68-10.4c.11-.68-.55-1.22-1.15-.98zM5.7 9.05l6.72-4.14c.15-.09.3.11.17.23L7.2 10.2l-.24 2.13-1.26-3.28z"
      />
    </svg>
  );
}

export function GitHubIcon({ size = 13 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden>
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  );
}

export function GlobeIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden
    >
      <circle cx="8" cy="8" r="6.2" />
      <path d="M1.8 8h12.4M8 1.8c1.8 1.7 2.7 3.9 2.7 6.2S9.8 12.5 8 14.2C6.2 12.5 5.3 10.3 5.3 8S6.2 3.5 8 1.8z" />
    </svg>
  );
}
