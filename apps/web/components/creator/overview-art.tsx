import styles from '@/components/demo/demo-dashboard.module.css';

export function HeroArt() {
  return (
    <svg className={styles.heroArt} viewBox="0 0 520 280" aria-hidden="true">
      <ellipse cx="360" cy="230" rx="170" ry="56" fill="#10261c" />
      <path
        fill="#1f8f5a"
        d="M250 46c62-28 150-18 188 28 34 42 28 96-8 128-40 36-112 48-176 28-58-18-108-62-112-112-4-46 42-52 108-72z"
      />
      <path
        fill="#3ddc97"
        opacity="0.85"
        d="M292 78c40-16 92-6 112 24 16 24 8 54-18 70-32 20-84 16-112-10-24-22-22-64 18-84z"
      />

      <g transform="translate(196 62) rotate(-7)">
        <rect width="176" height="108" rx="16" fill="#242220" />
        <rect x="18" y="22" width="78" height="8" rx="4" fill="#fff" opacity="0.28" />
        <rect x="18" y="40" width="112" height="6" rx="3" fill="#fff" opacity="0.14" />
        <rect x="18" y="62" width="140" height="28" rx="8" fill="#fff" opacity="0.06" />
      </g>

      <g>
        <rect x="168" y="92" width="236" height="142" rx="20" fill="#fff" />
        <circle cx="198" cy="124" r="14" fill="#e8f8ef" />
        <path
          d="M198 116.5a4.2 4.2 0 1 1 0 8.4 4.2 4.2 0 0 1 0-8.4zm-7 14.2c1.2-2.4 3.6-3.6 7-3.6s5.8 1.2 7 3.6"
          fill="none"
          stroke="#059669"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <rect x="222" y="114" width="92" height="8" rx="4" fill="#171717" />
        <rect x="222" y="128" width="64" height="6" rx="3" fill="#d4d4d8" />
        <rect x="352" y="112" width="36" height="18" rx="9" fill="#e8f8ef" />
        <circle cx="364" cy="121" r="3" fill="#059669" />

        <rect x="184" y="156" width="204" height="60" rx="14" fill="#f6f7f9" />
        <rect x="200" y="170" width="78" height="7" rx="3.5" fill="#171717" />
        <rect x="200" y="184" width="52" height="6" rx="3" fill="#a1a1aa" />
        <rect x="312" y="174" width="58" height="22" rx="11" fill="#1a1816" />
        <rect x="324" y="182" width="34" height="6" rx="3" fill="#fff" />
      </g>

      <g transform="translate(418 48)">
        <circle r="26" fill="#1e54e6" />
        <path
          d="M0-10c6 0 10 5 10 11v5h-20v-5c0-6 4-11 10-11z"
          fill="#fff"
        />
        <rect x="-12" y="7" width="24" height="3" rx="1.5" fill="#fff" />
        <circle cy="14" r="2.4" fill="#fff" />
        <circle cx="12" cy="-12" r="6" fill="#fb7185" />
      </g>
    </svg>
  );
}

export function NotifyArt() {
  return (
    <svg className={styles.notifyArt} viewBox="0 0 360 200" aria-hidden="true">
      <rect x="8" y="8" width="344" height="184" rx="28" fill="#eef3ff" />
      <circle cx="292" cy="36" r="34" fill="#dbe6ff" />

      <g transform="translate(248 18)">
        <circle r="22" fill="#1a1816" />
        <path d="M0-8c5 0 8 4 8 9v4h-16v-4c0-5 3-9 8-9z" fill="#fff" />
        <rect x="-10" y="6" width="20" height="2.5" rx="1.2" fill="#fff" />
        <circle cy="12" r="2" fill="#fff" />
        <circle cx="10" cy="-10" r="5" fill="#fb7185" />
      </g>

      <g>
        <rect x="36" y="36" width="250" height="44" rx="14" fill="#fff" />
        <circle cx="62" cy="58" r="12" fill="#e8f8ef" />
        <rect x="58" y="52" width="8" height="8" rx="2" fill="none" stroke="#059669" strokeWidth="1.6" />
        <path d="M60 60h4" stroke="#059669" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="84" y="50" width="96" height="7" rx="3.5" fill="#171717" />
        <rect x="84" y="62" width="64" height="5" rx="2.5" fill="#d4d4d8" />
        <circle cx="258" cy="58" r="4" fill="#3ddc97" />
      </g>

      <g>
        <rect x="52" y="90" width="250" height="44" rx="14" fill="#fff" />
        <circle cx="78" cy="112" r="12" fill="#e8efff" />
        <rect x="72" y="108" width="12" height="8" rx="2" fill="#1e54e6" />
        <rect x="100" y="104" width="110" height="7" rx="3.5" fill="#171717" />
        <rect x="100" y="116" width="72" height="5" rx="2.5" fill="#d4d4d8" />
      </g>

      <g>
        <rect x="36" y="144" width="250" height="44" rx="14" fill="#fff" />
        <circle cx="62" cy="166" r="12" fill="#fff1e6" />
        <path d="M58 162h8l-1 8h-6z" fill="#ea580c" />
        <rect x="84" y="158" width="88" height="7" rx="3.5" fill="#171717" />
        <rect x="84" y="170" width="56" height="5" rx="2.5" fill="#d4d4d8" />
        <rect x="230" y="158" width="36" height="16" rx="8" fill="#fff1e6" />
      </g>
    </svg>
  );
}
