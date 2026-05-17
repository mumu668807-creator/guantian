export function InkLandscape() {
  return (
    <svg className="ink-landscape" viewBox="0 0 1200 760" aria-hidden="true">
      <defs>
        <linearGradient id="skyWash" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#aeb8b8" />
          <stop offset="62%" stopColor="#d4d1bf" />
          <stop offset="100%" stopColor="#9eaa8c" />
        </linearGradient>
        <linearGradient id="streamWash" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#6f8b92" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#d7dfd7" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <rect width="1200" height="760" fill="url(#skyWash)" />
      <path d="M0 315 C170 270 250 295 365 245 C455 205 555 270 640 230 C755 176 835 278 955 220 C1040 183 1120 218 1200 190 L1200 760 L0 760 Z" fill="#748079" opacity="0.52" />
      <path d="M0 360 C155 320 285 345 420 300 C540 260 660 330 785 285 C930 235 1030 310 1200 250 L1200 760 L0 760 Z" fill="#8b9587" opacity="0.36" />
      <path d="M-40 536 C190 505 305 540 470 510 C640 480 820 520 1240 485 L1240 760 L-40 760 Z" fill="#657452" opacity="0.7" />
      <path className="ink-stream" d="M862 760 C820 650 860 585 935 510 C1008 438 980 370 1110 296 L1200 285 L1200 760 Z" fill="url(#streamWash)" />
      <path d="M70 492 C170 470 250 474 360 488" stroke="#d9dccb" strokeWidth="18" strokeLinecap="round" opacity="0.16" />
      <path d="M500 355 C620 340 705 345 820 362" stroke="#eef0e0" strokeWidth="22" strokeLinecap="round" opacity="0.18" />
    </svg>
  )
}
