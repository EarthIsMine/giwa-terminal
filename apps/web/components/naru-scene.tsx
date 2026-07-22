/**
 * 나루터 풍경 — 히어로 배경 (수묵 레이어드 SVG).
 * 달·산 3겹·물안개·윤슬·나룻배(사공)·반영으로 "물 있고 산 있는 진짜 나루"를 그린다.
 * 뷰박스 1600×300은 히어로 비율(≈5.3:1)에 맞춘 값 — 와이드 크롭에도 달이 잘리지 않는다.
 * 장식 요소라 aria-hidden, 애니메이션은 CSS 키프레임(배 흔들림·안개 드리프트)만 사용.
 */
export function NaruScene() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1600 300"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id="ns-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#26190d" />
          <stop offset="0.52" stopColor="#3a2915" />
          <stop offset="0.75" stopColor="#5a411f" />
          <stop offset="0.82" stopColor="#3a2a16" />
        </linearGradient>
        <radialGradient id="ns-moonglow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#c9a554" stopOpacity="0.42" />
          <stop offset="0.55" stopColor="#c9a554" stopOpacity="0.15" />
          <stop offset="1" stopColor="#c9a554" stopOpacity="0" />
        </radialGradient>
        {/* 달 원반 — 좌상단 광원의 구형 음영 */}
        <radialGradient id="ns-moon" cx="0.4" cy="0.36" r="0.78">
          <stop offset="0" stopColor="#f8eecf" />
          <stop offset="0.5" stopColor="#eedcab" />
          <stop offset="0.82" stopColor="#dcc389" />
          <stop offset="1" stopColor="#c0a066" />
        </radialGradient>
        <clipPath id="ns-moonclip">
          <circle cx="1178" cy="58" r="28" />
        </clipPath>
        <linearGradient id="ns-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#46311a" />
          <stop offset="0.25" stopColor="#2a1d0e" />
          <stop offset="1" stopColor="#171008" />
        </linearGradient>
        <linearGradient id="ns-mist" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f3eee3" stopOpacity="0" />
          <stop offset="0.35" stopColor="#f3eee3" stopOpacity="0.16" />
          <stop offset="0.7" stopColor="#f3eee3" stopOpacity="0.08" />
          <stop offset="1" stopColor="#f3eee3" stopOpacity="0" />
        </linearGradient>
        <filter id="ns-soft1"><feGaussianBlur stdDeviation="1.6" /></filter>
        <filter id="ns-soft2"><feGaussianBlur stdDeviation="0.7" /></filter>
        <filter id="ns-mistblur"><feGaussianBlur stdDeviation="7" /></filter>
        <filter id="ns-reflectblur"><feGaussianBlur stdDeviation="1.8" /></filter>
      </defs>

      {/* 하늘 */}
      <rect width="1600" height="230" fill="url(#ns-sky)" />

      {/* 달 — 겹 달무리 + 구형 음영 원반 + 분화구 */}
      <circle cx="1178" cy="58" r="94" fill="url(#ns-moonglow)" opacity="0.85" />
      <circle cx="1178" cy="58" r="46" fill="url(#ns-moonglow)" />
      <circle cx="1178" cy="58" r="28" fill="url(#ns-moon)" />
      <g clipPath="url(#ns-moonclip)" fill="#96763f" filter="url(#ns-soft2)">
        <circle cx="1170" cy="51" r="5.5" opacity="0.16" />
        <circle cx="1185" cy="65" r="4.2" opacity="0.15" />
        <circle cx="1175" cy="71" r="2.6" opacity="0.16" />
        <circle cx="1189" cy="47" r="2.3" opacity="0.13" />
        <circle cx="1162" cy="63" r="3.1" opacity="0.13" />
        <circle cx="1181" cy="40" r="1.9" opacity="0.11" />
        <circle cx="1194" cy="57" r="1.6" opacity="0.12" />
        {/* 명암 경계 가장자리 어둠 */}
        <circle cx="1192" cy="66" r="26" opacity="0.1" />
      </g>

      {/* 기러기 */}
      <g stroke="#cdbfa5" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.55">
        <path d="M492 66l10 7 11-7" />
        <path d="M527 52l8 6 9-6" />
        <path d="M551 72l7 5 8-5" />
      </g>

      {/* 지형·물·배 — 300 프레임 기준으로 시프트 */}
      <g transform="translate(0,-70)">
        {/* 원경 산 — 수묵 번짐 */}
        <path
          d="M0 216C90 208 170 186 268 192C360 197 428 170 520 164C610 158 668 184 760 192C850 199 948 168 1052 162C1150 157 1214 180 1310 190C1400 199 1520 190 1600 180L1600 292L0 292Z"
          fill="#453117"
          opacity="0.8"
          filter="url(#ns-soft1)"
        />
        {/* 중경 산 */}
        <path
          d="M0 252C70 246 122 220 208 214C296 208 330 186 420 190C520 195 560 224 660 230C760 236 830 200 930 196C1030 192 1080 220 1180 228C1280 236 1370 214 1450 212C1510 210 1560 218 1600 222L1600 292L0 292Z"
          fill="#32220f"
          opacity="0.92"
          filter="url(#ns-soft2)"
        />
        {/* 근경 언덕 */}
        <path
          d="M0 280C110 272 190 258 300 262C420 267 500 280 620 284C760 288 860 274 980 272C1120 270 1240 282 1360 286C1450 289 1540 286 1600 284L1600 300L0 300Z"
          fill="#201409"
        />

        {/* 물안개 */}
        <g className="[animation:ns-drift_36s_ease-in-out_infinite_alternate]">
          <rect x="-80" y="238" width="980" height="26" fill="url(#ns-mist)" filter="url(#ns-mistblur)" />
          <rect x="620" y="256" width="1100" height="22" fill="url(#ns-mist)" filter="url(#ns-mistblur)" opacity="0.7" />
        </g>

        {/* 물 */}
        <rect y="290" width="1600" height="110" fill="url(#ns-water)" />
        <rect y="289" width="1600" height="1.2" fill="#c9a554" opacity="0.32" />

        {/* 윤슬 — 두 무리가 서로 다른 결로 흘러 잔잔한 물살을 만든다 */}
        <g fill="#eeda9f" className="[animation:ns-current_16s_ease-in-out_infinite_alternate]">
          <rect x="120" y="304" width="90" height="1.4" opacity="0.1" />
          <rect x="252" y="336" width="120" height="1.6" opacity="0.07" />
          <rect x="520" y="300" width="130" height="1.4" opacity="0.11" />
          <rect x="760" y="310" width="90" height="1.3" opacity="0.09" />
          <rect x="1330" y="308" width="100" height="1.4" opacity="0.1" />
          <rect x="1250" y="356" width="160" height="1.9" opacity="0.05" />
        </g>
        <g fill="#eeda9f" className="[animation:ns-current_21s_ease-in-out_infinite_alternate-reverse]">
          <rect x="330" y="318" width="60" height="1.2" opacity="0.08" />
          <rect x="610" y="326" width="70" height="1.3" opacity="0.08" />
          <rect x="470" y="352" width="150" height="1.8" opacity="0.06" />
          <rect x="840" y="344" width="130" height="1.7" opacity="0.06" />
          <rect x="1420" y="332" width="80" height="1.5" opacity="0.07" />
        </g>
        {/* 달빛 물기둥 */}
        <g fill="#fdf3d5" className="[animation:ns-shimmer_5.5s_ease-in-out_infinite]">
          <rect x="1146" y="296" width="66" height="1.6" opacity="0.3" />
          <rect x="1158" y="306" width="46" height="1.5" opacity="0.24" />
          <rect x="1140" y="318" width="78" height="1.7" opacity="0.2" />
          <rect x="1154" y="332" width="52" height="1.6" opacity="0.16" />
          <rect x="1132" y="348" width="92" height="1.9" opacity="0.12" />
          <rect x="1148" y="366" width="64" height="2" opacity="0.09" />
        </g>

        {/* 나루터 잔교 — 널 상판 + 말뚝 + 등롱 (마루가 그림 속으로 이어진다)
            좌측 텍스트 스크림에 묻히지 않게 열린 수면(x≈560)까지 길게 뺀다 */}
        <g>
          {/* 말뚝 */}
          <rect x="20" y="283" width="6" height="33" fill="#0c0805" />
          <rect x="110" y="283" width="6" height="32" fill="#0c0805" />
          <rect x="205" y="283" width="6" height="33" fill="#0c0805" />
          <rect x="300" y="283" width="6" height="32" fill="#0c0805" />
          <rect x="395" y="283" width="6" height="33" fill="#0c0805" />
          <rect x="488" y="283" width="6" height="32" fill="#0c0805" />
          <rect x="545" y="283" width="6" height="34" fill="#0c0805" />
          {/* 상판(널) */}
          <rect x="-20" y="281" width="585" height="8" fill="#2b1d10" />
          <rect x="-20" y="280.6" width="585" height="1.2" fill="#c9a554" opacity="0.6" />
          <rect x="-20" y="289" width="585" height="2" fill="#060402" opacity="0.5" />
          {/* 널 이음 홈 */}
          <g fill="#060402" opacity="0.4">
            <rect x="58" y="281" width="1.2" height="8" />
            <rect x="128" y="281" width="1.2" height="8" />
            <rect x="198" y="281" width="1.2" height="8" />
            <rect x="268" y="281" width="1.2" height="8" />
            <rect x="336" y="281" width="1.2" height="8" />
            <rect x="406" y="281" width="1.2" height="8" />
            <rect x="476" y="281" width="1.2" height="8" />
            <rect x="540" y="281" width="1.2" height="8" />
          </g>
          {/* 등롱 */}
          <rect x="546.5" y="252" width="3" height="29" fill="#0c0805" />
          <circle cx="548" cy="259" r="24" fill="url(#ns-moonglow)" opacity="0.95" />
          <rect x="542" y="253" width="12" height="14" rx="2.5" fill="#0d0805" />
          <rect x="544.5" y="256" width="7" height="8" rx="1.5" fill="#f3d998" opacity="0.9" />
          {/* 말뚝·등롱 반영 */}
          <g filter="url(#ns-reflectblur)">
            <rect x="21" y="318" width="4" height="13" fill="#060402" opacity="0.45" />
            <rect x="111" y="317" width="4" height="12" fill="#060402" opacity="0.45" />
            <rect x="206" y="318" width="4" height="13" fill="#060402" opacity="0.45" />
            <rect x="301" y="317" width="4" height="12" fill="#060402" opacity="0.45" />
            <rect x="396" y="318" width="4" height="13" fill="#060402" opacity="0.45" />
            <rect x="489" y="317" width="4" height="12" fill="#060402" opacity="0.45" />
            <rect x="546" y="319" width="4" height="14" fill="#060402" opacity="0.45" />
          </g>
          <g fill="#f0d894" className="[animation:ns-shimmer_5.5s_ease-in-out_infinite]">
            <rect x="527" y="298" width="44" height="1.6" opacity="0.24" />
            <rect x="535" y="308" width="30" height="1.4" opacity="0.18" />
            <rect x="521" y="320" width="56" height="1.7" opacity="0.12" />
          </g>
        </g>

        {/* 나룻배 + 사공 — 물을 오가는 왕복 + 잔흔들림 */}
        <g className="[animation:ns-ferry_22s_ease-in-out_infinite_alternate]">
          <g className="[animation:ns-bob_7s_ease-in-out_infinite]">
          <g>
            {/* 배 몸통 */}
            <path d="M905 296c14 12 76 12 92-2l14-4c-4 12-26 22-60 22s-52-8-58-18z" fill="#0b0704" />
            <path d="M903 295c16 3 82 3 110-6" stroke="#c9a554" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.75" />
            {/* 사공 */}
            <path d="M952 270c2.6 0 4.6 2 4.6 4.6 0 1.4-.6 2.6-1.6 3.6 3 1.4 5 3.8 5.6 7.4l1 8.4h-18l1.6-8.8c.6-3.2 2.4-5.6 5-6.9-1-.9-1.6-2.2-1.6-3.7 0-2.6 2-4.6 4.4-4.6z" fill="#0b0704" />
            {/* 삿대 */}
            <path d="M962 268l16 40" stroke="#0b0704" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M962 268l16 40" stroke="#c9a554" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
            {/* 노 젓는 파문 — 삿대 끝 동심원 + 배 밑에서 넓게 밀리는 물결 */}
            <g stroke="#eeda9f" strokeWidth="1" fill="none">
              <ellipse className="ns-ripple" cx="978" cy="309" rx="12" ry="3" />
              <ellipse
                className="ns-ripple"
                style={{ animationDelay: "1.4s" }}
                cx="978"
                cy="309"
                rx="12"
                ry="3"
              />
              <ellipse
                className="ns-ripple"
                style={{ animationDelay: "2.8s" }}
                cx="978"
                cy="309"
                rx="12"
                ry="3"
              />
              <ellipse
                className="ns-ripple"
                style={{ animationDelay: "0.9s", animationDuration: "5.6s" }}
                cx="953"
                cy="313"
                rx="22"
                ry="4.5"
                opacity="0.8"
              />
            </g>
          </g>
          {/* 반영 */}
          <g transform="translate(0, 626) scale(1, -1)" opacity="0.2" filter="url(#ns-reflectblur)">
            <path d="M905 296c14 12 76 12 92-2l14-4c-4 12-26 22-60 22s-52-8-58-18z" fill="#c9a554" />
            <path d="M952 270c2.6 0 4.6 2 4.6 4.6 0 1.4-.6 2.6-1.6 3.6 3 1.4 5 3.8 5.6 7.4l1 8.4h-18l1.6-8.8c.6-3.2 2.4-5.6 5-6.9-1-.9-1.6-2.2-1.6-3.7 0-2.6 2-4.6 4.4-4.6z" fill="#c9a554" />
          </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
