/**
 * 나루터 풍경 - 히어로 배경 (수묵 레이어드 SVG).
 * 달·산 3겹·물안개·윤슬·나룻배(노 젓는 사공)·반영으로 "물 있고 산 있는 진짜 나루"를 그린다.
 * 뷰박스 1600×300은 히어로 비율(≈5.3:1)에 맞춘 값 - 와이드 크롭에도 달이 잘리지 않는다.
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
        {/* 달 원반 - 좌상단 광원의 구형 음영 */}
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
        {/* 앉은 사공을 뱃전 높이에서 자른다 - 296.6 은 뱃전 금선(두께 1.6)이 덮는 띠 안이다.
            상체가 기울어도 자르는 높이는 그대로여야 하므로, 회전하는 그룹이 아니라 바깥 그룹에 건다 */}
        <clipPath id="ns-seat">
          <rect x="940" y="270" width="30" height="26.6" />
        </clipPath>
      </defs>

      {/* 하늘 */}
      <rect width="1600" height="230" fill="url(#ns-sky)" />

      {/* 달 - 겹 달무리 + 구형 음영 원반 + 분화구 */}
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

      {/* 지형·물·배 - 300 프레임 기준으로 시프트 */}
      <g transform="translate(0,-70)">
        {/* 원경 산 - 수묵 번짐 */}
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

        {/* 윤슬 - 두 무리가 서로 다른 결로 흘러 잔잔한 물살을 만든다 */}
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

        {/* 나룻배 + 사공 - 오른쪽에서 들어와 왼쪽으로 건너간다. 끝에 닿으면 다시 오른쪽에서 새 배가 뜬다.
            왕복이 아니라 한 방향인 이유: 사공이 오른쪽(고물)을 보고 앉아 노를 젓고 물결도 +x 로 밀리니
            배는 왼쪽으로 가야 한다. 되돌아오면 노 젓는 방향과 진행 방향이 어긋난다.
            잔교보다 먼저 그려서 왼쪽 끝에서는 배가 잔교 뒤로 지나 사라진다.
            타이밍은 globals.css 의 .ns-ferry 참고 - 첫 화면에 이미 건너는 중이어야 한다 */}
        <g className="ns-ferry">
          <g className="[animation:ns-bob_7s_ease-in-out_infinite]">
          <g>
            {/* 사공(앉은 자세) - 뱃전 위로 나오는 건 상체뿐이라 다리는 그리지 않는다.
                밑단을 303.5 까지 빼고 클립으로 296.6 에서 자른다. 밑단을 직접 뱃전 높이에 맞추면
                상체가 기울 때마다 모서리가 오르내려, 한쪽 끝에서는 금선 아래로 검은 턱이 삐져나오고
                반대쪽 끝에서는 금선과 몸 사이에 틈이 뜬다. 클립은 기울기와 무관하게 같은 높이를 자른다.
                배 몸통 윤곽은 304 에서야 시작해서 그 사이를 메워 주지 않는다.
                보이는 키 20.8 · 머리 지름 6.8 - 머리가 상체의 1/3 이라 작게 줄어도 사람으로 읽힌다.
                엉덩이(950,296)를 축으로 캐치에서 숙이고 피니시에서 젖힌다 */}
            <g clipPath="url(#ns-seat)" className="ns-aboard">
              <g className="ns-torso" fill="#0b0704">
                <path d="M947.38 303.5L948 285.5C948.38 283 950.38 281.75 952.75 281.75C955.13 281.75 957.13 283 957.5 285.5L958.25 303.5Z" />
                <circle cx="953.25" cy="279.25" r="4" />
                {/* 삿갓 - 폭 10.7 은 머리 지름(8)의 1.34배. 머리보다 넓되 두 배는 넘지 않는다.
                    처마를 277.9 에 두어 머리 위쪽 1/3 만 덮는다 - 머리의 2/3 가 처마 아래로 남아야
                    "머리에 삿갓을 얹은" 것으로 읽힌다. 처마가 머리 한가운데까지 내려오면 삿갓만 보인다.
                    몸통과 같은 검정이면 실루엣에 묻혀 처마가 안 보이므로 밝은 갈색 단색으로 띄운다 */}
                <path
                  d="M953.35 273.95C950.9 274.35 949.3 275.65 948.4 277C948.05 277.5 948.35 277.9 948.95 277.9Q953.4 278.95 957.85 277.9C958.45 277.9 958.75 277.5 958.4 277C957.5 275.65 955.9 274.35 953.35 273.95Z"
                  fill="#b08a48"
                />
              </g>
            </g>

            {/* 배 몸통 */}
            <path d="M905 296c14 12 76 12 92-2l14-4c-4 12-26 22-60 22s-52-8-58-18z" fill="#0b0704" />
            <path d="M903 295c16 3 82 3 110-6" stroke="#c9a554" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.75" />

            {/* 노 + 노를 쥔 팔 - 뱃전 노받이(972,296.3)를 축으로 한 몸으로 돈다.
                팔을 따로 돌리지 않는 이유: 손잡이는 노받이 중심 원호를 그리고 손은 어깨 중심 원호를 그려
                두 궤적이 애초에 겹치지 않는다. 팔꿈치를 넣어 맞춰봐도 이 크기(화면 20px 남짓)에서는
                접힌 팔이 덩어리로 뭉쳐 보일 뿐이고, 조금만 어긋나도 손이 노에서 떨어진 게 그대로 보인다.
                한 몸으로 묶으면 손은 정의상 손잡이에 붙어 있고, 대신 팔 뿌리가 5 정도 흔들리는데
                뿌리를 가슴 높이에 두면 그 흔들림이 양 끝에서 모두 몸통 실루엣 안이라 같은 검정에 묻힌다.
                안쪽 12 : 바깥 26 지렛대라 손잡이는 3 만 움직이고 노깃은 7 을 쓸린다 - 노받이에 걸린 노의 거동이다.
                노받이를 뱃전 오른쪽으로 뺀 이유: 사공을 키우니 몸통 오른끝이 957.7 까지 나와
                손잡이가 그 안에 들어가면서 팔이 실루엣에 통째로 먹혔다. 이제 팔이 5.7~8.8 드러난다 */}
            <g className="ns-aboard">
            <g className="ns-oar" stroke="#0b0704" strokeLinecap="round" fill="none">
                <path d="M961.95 286.55L990.66 314.4" strokeWidth="2" />
                <path d="M985.64 309.53L990.66 314.4" strokeWidth="3.4" />
                <path d="M961.95 286.55L990.66 314.4" stroke="#c9a554" strokeWidth="0.7" opacity="0.5" />
                {/* 팔 - 뿌리는 몸통 안, 손끝은 손잡이 위. 노보다 나중에 그려 손이 노를 덮는다.
                    뿌리를 어깨보다 아래(가슴 높이)에 둔다: 노와 함께 돌면서 뿌리가 2.5 올라가는데
                    어깨 높이에 두면 캐치에서 머리 아래턱까지 올라와 팔이 머리에서 자라난 것처럼 보인다 */}
                <path d="M949.75 291.3L963.39 287.94" strokeWidth="3" />
              </g>
            </g>

            <g className="ns-aboard">
            {/* 노 젓는 물결 - 노깃에서 생겨 노가 미는 쪽(+x)으로 밀려 나간다.
                  닫힌 동심원은 돌을 던진 자국이지 물을 밀어낸 자국이 아니다.
                  그래서 미는 쪽으로 볼록한 열린 호를 쓰고, 퍼지면서 같은 방향으로 흘려보낸다 */}
              <g stroke="#cbb98a" strokeWidth="0.7" fill="none">
                <path className="ns-ripple" d="M984 313.2Q990.5 317 984 320.8" />
                <path className="ns-ripple" style={{ animationDelay: "1.4s" }} d="M984 313.2Q990.5 317 984 320.8" />
                <path className="ns-ripple" style={{ animationDelay: "2.8s" }} d="M984 313.2Q990.5 317 984 320.8" />
                {/* 배가 밀어내는 넓고 느린 물결 - 뱃바닥 윤곽 아래라야 배 위에 선이 얹히지 않는다 */}
                <path
                  className="ns-ripple"
                  style={{ animationDelay: "0.9s", animationDuration: "5.6s" }}
                  d="M957 315.5Q973 320 957 324.5"
                />
              </g>
            </g>
          </g>
          {/* 반영 */}
          <g transform="translate(0, 626) scale(1, -1)" opacity="0.2" filter="url(#ns-reflectblur)">
            <path d="M905 296c14 12 76 12 92-2l14-4c-4 12-26 22-60 22s-52-8-58-18z" fill="#c9a554" />
            <g className="ns-aboard">
              <path
                d="M947.62 296.6L948 285.5C948.38 283 950.38 281.75 952.75 281.75C955.13 281.75 957.13 283 957.5 285.5L957.96 296.6Z"
                fill="#c9a554"
              />
              <circle cx="953.25" cy="279.25" r="4" fill="#c9a554" />
              <path
                d="M953.35 273.95C950.9 274.35 949.3 275.65 948.4 277C948.05 277.5 948.35 277.9 948.95 277.9Q953.4 278.95 957.85 277.9C958.45 277.9 958.75 277.5 958.4 277C957.5 275.65 955.9 274.35 953.35 273.95Z"
                fill="#c9a554"
              />
            </g>
          </g>
          </g>
        </g>
        {/* 나루터 잔교 - 널 상판 + 말뚝 + 등롱 (마루가 그림 속으로 이어진다)
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
          {/* 나루에 닿은 사공 - 배에서 잔교로 뛰어올라 왼쪽으로 달려간다.
              배가 나루를 그냥 지나쳐 버리면 나루터가 배경일 뿐이라, 도착이 사건이 되게 한다.
              키 27 은 등롱 기둥(29)보다 살짝 낮다 - 사람이 등롱보다 크면 잔교가 장난감처럼 보인다.
              배 위(오른쪽 아래)에서 시작해 잔교 높이로 올라서는 게 "배에서 내려 올라탄" 동작이다.
              팔은 만세로 올린다 - 삿갓 폭(10.9)이 어깨(6.8)보다 넓어서 팔을 곧게 세우면 삿갓 뒤로 숨는다.
              그래서 위로 벌린 V 자로 두어 손끝이 삿갓 바깥에 걸리게 했다.
              다리는 서로 반대 위상, 두 팔은 좌우 대칭으로 함께 벌렸다 오므린다.
              달리기 시작하자마자 한 번 뛰어오른다 - 가로 이동(ns-runner)과 따로 떼어 ns-runjump 에 둔 이유는
              한 transform 에 섞으면 점프 구간의 완급이 가로 속도까지 흔들어 걸음이 끊기기 때문이다 */}
          <g className="ns-runner">
            <g className="ns-runjump">
              <g className="ns-runbob">
                <g stroke="#0b0704" strokeLinecap="round" fill="none">
                  <path className="ns-leg1" d="M559.7 271L556.6 281" strokeWidth="2.6" />
                  <path className="ns-leg2" d="M559.7 271L562.8 281" strokeWidth="2.6" />
                </g>
                <path
                  d="M556.3 271.5L556.9 264.6C557.2 262.7 558.3 261.7 559.7 261.7C561.1 261.7 562.2 262.7 562.5 264.6L563.1 271.5Z"
                  fill="#0b0704"
                />
                <g stroke="#0b0704" strokeLinecap="round" fill="none">
                  <path className="ns-arm1" d="M559.7 264L554.7 255.3" strokeWidth="2.3" />
                  <path className="ns-arm2" d="M559.7 264L564.7 255.3" strokeWidth="2.3" />
                </g>
                <circle cx="559.7" cy="258.4" r="4.2" fill="#0b0704" />
                <path
                  d="M559.7 252.9C557.15 253.3 555.5 254.65 554.6 256.05C554.25 256.55 554.55 256.95 555.2 256.95Q559.7 258.05 564.2 256.95C564.85 256.95 565.15 256.55 564.8 256.05C563.9 254.65 562.25 253.3 559.7 252.9Z"
                  fill="#b08a48"
                />
              </g>
            </g>
          </g>
          <g fill="#f0d894" className="[animation:ns-shimmer_5.5s_ease-in-out_infinite]">
            <rect x="527" y="298" width="44" height="1.6" opacity="0.24" />
            <rect x="535" y="308" width="30" height="1.4" opacity="0.18" />
            <rect x="521" y="320" width="56" height="1.7" opacity="0.12" />
          </g>
        </g>

      </g>
    </svg>
  );
}
