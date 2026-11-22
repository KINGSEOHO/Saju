/**
 * 일간 열 개의 수묵화 (viewBox 0 0 160 100) — 검색용 일간별 운세 페이지 위쪽에 둔다.
 * 각 일간을 빗대는 사물 그대로: 갑 큰 나무 · 을 덩굴 · 병 해 · 정 등불 · 무 큰 산 · 기 논밭 · 경 바위 · 신 보석 · 임 큰 물 · 계 비.
 * 먹색은 글자색(currentColor)을 따라가 밝은·어두운 화면 모두에서 보이고, 붉은색은 낙관에만 쓴다 (ui/DetailCards.tsx의 그림과 같은 붓 효과).
 */
const DEFS = `<defs>
  <filter id="sa-brush" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.2"/></filter>
  <filter id="sa-wash" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4"/></filter>
  <filter id="sa-soft" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="8" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="6" result="d"/><feGaussianBlur in="d" stdDeviation="1.6"/></filter>
</defs>`;
const B = 'filter="url(#sa-brush)"';
const W = 'filter="url(#sa-wash)"';
const S = 'filter="url(#sa-soft)"';
const C = 'currentColor';
const seal = (x: number, y: number) => `<rect x="${x}" y="${y}" width="9" height="9" rx="1" fill="#a8392c" opacity="0.85" ${B}/>`;
const ground = `<path d="M8 92 Q60 88 152 92" stroke="${C}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.5" ${B}/>`;

const ART: string[] = [
  // 갑 — 하늘로 곧게 뻗는 큰 나무
  `<path d="M80 92 Q77 60 80 22" stroke="${C}" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.8" ${B}/>
   <path d="M80 62 Q64 52 54 38 M80 50 Q96 42 108 30 M80 38 Q70 30 66 20" stroke="${C}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.7" ${B}/>
   <ellipse cx="56" cy="32" rx="20" ry="13" fill="${C}" opacity="0.22" ${S}/><ellipse cx="104" cy="26" rx="22" ry="13" fill="${C}" opacity="0.26" ${S}/><ellipse cx="80" cy="16" rx="24" ry="11" fill="${C}" opacity="0.3" ${S}/>
   ${ground}${seal(142, 8)}`,
  // 을 — 휘어도 꺾이지 않는 덩굴
  `<path d="M22 90 Q40 60 62 70 Q88 82 92 52 Q96 26 122 30 Q140 34 144 16" stroke="${C}" stroke-width="2.6" fill="none" stroke-linecap="round" opacity="0.75" ${B}/>
   ${[
     [40, 66, -30],
     [66, 72, 20],
     [90, 58, -50],
     [100, 34, 30],
     [126, 30, -10],
     [142, 20, 40],
   ]
     .map(([x, y, r]) => `<path d="M${x} ${y} q8 -10 16 0 q-8 6 -16 0Z" fill="${C}" opacity="0.55" transform="rotate(${r} ${x} ${y})" ${B}/>`)
     .join('')}
   <path d="M62 70 q-6 -12 2 -18 M122 30 q8 8 4 18" stroke="${C}" stroke-width="1" fill="none" opacity="0.45"/>
   ${ground}${seal(12, 8)}`,
  // 병 — 온 세상을 비추는 해
  `<circle cx="84" cy="36" r="26" fill="${C}" opacity="0.12" ${W}/><circle cx="84" cy="36" r="20" stroke="${C}" stroke-width="3" fill="none" opacity="0.75" ${B}/>
   <path d="M4 84 Q28 58 48 72 Q66 50 88 70 Q108 58 124 72 Q140 64 158 84 Z" fill="${C}" opacity="0.4" ${S}/>
   <path d="M10 92 q20 -4 40 0 t40 0 t40 0" stroke="${C}" stroke-width="1" fill="none" opacity="0.35"/>
   ${seal(142, 8)}`,
  // 정 — 가까운 곳을 밝히는 등불
  `<circle cx="80" cy="40" r="30" fill="${C}" opacity="0.1" ${W}/>
   <path d="M80 22 Q90 36 80 46 Q70 36 80 22Z" fill="${C}" opacity="0.8" ${B}/>
   <path d="M80 46 L80 52" stroke="${C}" stroke-width="1.4" opacity="0.7"/>
   <path d="M70 52 L90 52 L88 84 L72 84 Z" fill="${C}" opacity="0.3" ${S}/><path d="M70 52 L90 52 L88 84 L72 84 Z" stroke="${C}" stroke-width="1.8" fill="none" opacity="0.7" ${B}/>
   <path d="M58 90 Q80 84 102 90" stroke="${C}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.6" ${B}/>
   ${seal(142, 8)}`,
  // 무 — 묵직하게 자리를 지키는 큰 산
  `<path d="M6 90 Q40 40 62 46 Q78 10 98 40 Q118 34 154 90 Z" fill="${C}" opacity="0.5" ${S}/>
   <path d="M62 46 Q72 60 68 78 M98 40 Q94 58 104 74" stroke="${C}" stroke-width="1.2" fill="none" opacity="0.4" ${B}/>
   <path d="M20 62 q14 -5 28 0 M112 58 q14 -5 30 0" stroke="${C}" stroke-width="1" fill="none" opacity="0.3"/>
   <circle cx="130" cy="22" r="7" stroke="${C}" stroke-width="1.2" fill="none" opacity="0.45" ${B}/>
   ${seal(12, 8)}`,
  // 기 — 씨앗을 품어 기르는 논밭
  `${[56, 68, 80, 92].map((y, i) => `<path d="M${8 + i * 4} ${y} Q80 ${y - 6 + i} ${152 - i * 4} ${y}" stroke="${C}" stroke-width="${1.2 + i * 0.5}" fill="none" stroke-linecap="round" opacity="${0.35 + i * 0.12}" ${B}/>`).join('')}
   ${[30, 56, 82, 108, 132].map((x, i) => `<path d="M${x} ${74 - (i % 2) * 10} q-4 -9 0 -14 M${x} ${74 - (i % 2) * 10} q5 -7 3 -13" stroke="${C}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.7" ${B}/>`).join('')}
   <path d="M10 44 Q50 30 90 40 Q120 32 150 42" stroke="${C}" stroke-width="1" fill="none" opacity="0.3"/>
   <circle cx="126" cy="18" r="8" fill="${C}" opacity="0.14" ${W}/>
   ${seal(12, 8)}`,
  // 경 — 단련될수록 단단해지는 바위
  `<path d="M38 88 L50 44 L78 28 L106 40 L124 70 L118 88 Z" fill="${C}" opacity="0.32" ${S}/>
   <path d="M38 88 L50 44 L78 28 L106 40 L124 70 L118 88" stroke="${C}" stroke-width="2.8" fill="none" stroke-linejoin="round" opacity="0.75" ${B}/>
   <path d="M78 28 L72 58 L50 44 M72 58 L96 70 L106 40 M96 70 L92 88" stroke="${C}" stroke-width="1.2" fill="none" opacity="0.5" ${B}/>
   ${ground}${seal(142, 8)}`,
  // 신 — 다듬어져 빛나는 보석
  `<circle cx="80" cy="48" r="34" fill="${C}" opacity="0.08" ${W}/>
   <path d="M56 40 L68 24 L92 24 L104 40 L80 78 Z" stroke="${C}" stroke-width="2.6" fill="none" stroke-linejoin="round" opacity="0.8" ${B}/>
   <path d="M56 40 L104 40 M68 24 L74 40 L80 78 L86 40 L92 24" stroke="${C}" stroke-width="1" fill="none" opacity="0.5"/>
   <path d="M118 22 l0 10 M113 27 l10 0 M40 62 l0 8 M36 66 l8 0" stroke="${C}" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
   <path d="M52 90 Q80 84 108 90" stroke="${C}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.45" ${B}/>
   ${seal(142, 60)}`,
  // 임 — 쉬지 않고 흐르는 큰 물
  `${[34, 50, 66, 82].map((y, i) => `<path d="M-4 ${y} Q16 ${y - 12} 36 ${y} T76 ${y} T116 ${y} T164 ${y}" stroke="${C}" stroke-width="${3 - i * 0.6}" fill="none" stroke-linecap="round" opacity="${0.75 - i * 0.14}" ${B}/>`).join('')}
   <path d="M0 96 L160 96 L160 70 Q120 82 80 72 Q40 62 0 76 Z" fill="${C}" opacity="0.14" ${S}/>
   <circle cx="128" cy="16" r="8" stroke="${C}" stroke-width="1.2" fill="none" opacity="0.45" ${B}/>
   ${seal(12, 8)}`,
  // 계 — 만물을 적시는 비
  `<path d="M30 30 Q34 14 54 18 Q64 6 82 14 Q102 6 110 22 Q130 20 130 34 Q118 42 80 40 Q44 44 30 30Z" fill="${C}" opacity="0.4" ${S}/>
   ${[40, 56, 72, 88, 104, 120].map((x, i) => `<path d="M${x} ${48 + (i % 2) * 6} l-5 16 M${x - 4} ${72 + (i % 3) * 4} l-4 12" stroke="${C}" stroke-width="1.5" stroke-linecap="round" opacity="0.6" ${B}/>`).join('')}
   <path d="M24 92 q12 -4 24 0 M70 94 q14 -4 28 0 M116 92 q12 -4 24 0" stroke="${C}" stroke-width="1.2" fill="none" opacity="0.45"/>
   ${seal(142, 8)}`,
];

/** 일간 번호(0 갑 ~ 9 계)의 그림 — label은 화면 낭독기용 설명 */
export function stemArt(i: number, label: string): string {
  return `<svg viewBox="0 0 160 100" class="w-full text-ink" role="img" aria-label="${label}" fill="none">${DEFS}${ART[i]}</svg>`;
}
