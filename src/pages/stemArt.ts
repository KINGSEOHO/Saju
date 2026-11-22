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

const far = (d: string, o = 0.16) => `<path d="${d}" fill="${C}" opacity="${o}" ${S}/>`;
const birds = (x: number, y: number) =>
  `<path d="M${x} ${y} q4 -4 8 0 q4 -4 8 0 M${x + 20} ${y - 8} q3 -3 6 0 q3 -3 6 0" stroke="${C}" stroke-width="1" fill="none" stroke-linecap="round" opacity="0.5"/>`;

const ART: string[] = [
  // 갑 — 하늘로 곧게 뻗는 큰 나무 (굵은 줄기, 겹겹이 얹힌 잎 무리, 드러난 뿌리)
  `${far('M0 92 Q30 70 60 84 Q100 66 160 90 L160 100 L0 100Z', 0.12)}
   <path d="M70 93 Q76 72 74 52 Q73 36 77 22 L85 22 Q87 38 87 54 Q87 74 94 93 Z" fill="${C}" opacity="0.78" ${B}/>
   <path d="M70 93 Q60 92 52 96 M94 93 Q104 92 112 96 M82 93 Q82 96 80 99" stroke="${C}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity="0.65" ${B}/>
   <path d="M76 58 Q62 50 46 46 M86 50 Q102 44 118 36 M78 38 Q66 30 58 22 M85 34 Q96 26 104 16" stroke="${C}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.72" ${B}/>
   ${[
     [44, 42, 20, 10, 0.3],
     [118, 32, 22, 11, 0.32],
     [58, 20, 18, 9, 0.36],
     [104, 14, 18, 8, 0.36],
     [80, 12, 24, 10, 0.42],
   ]
     .map(([x, y, rx, ry, o]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${C}" opacity="${o}" ${S}/>`)
     .join('')}
   ${[
     [40, 40],
     [52, 46],
     [112, 30],
     [126, 34],
     [60, 16],
     [100, 12],
     [80, 8],
     [72, 14],
     [90, 16],
   ]
     .map(([x, y]) => `<path d="M${x} ${y} q5 -5 10 0 q-5 3 -10 0Z" fill="${C}" opacity="0.6" ${B}/>`)
     .join('')}
   ${seal(142, 60)}`,
  // 을 — 휘어도 꺾이지 않는 덩굴 (기댈 대나무 지지대와 꽃 한 송이)
  `<path d="M118 96 L126 6" stroke="${C}" stroke-width="2" stroke-linecap="round" opacity="0.3" ${B}/>
   <path d="M20 92 Q38 64 60 72 Q86 82 92 56 Q96 34 118 40 Q136 44 130 22 Q128 16 134 12" stroke="${C}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.78" ${B}/>
   ${[
     [36, 70, -40],
     [54, 72, 150],
     [74, 76, 10],
     [90, 62, -60],
     [98, 42, 160],
     [116, 40, -20],
     [132, 28, 60],
     [130, 14, -70],
   ]
     .map(([x, y, r]) => `<path d="M${x} ${y} q9 -11 18 -2 q-8 9 -18 2Z" fill="${C}" opacity="0.55" transform="rotate(${r} ${x} ${y})" ${B}/>`)
     .join('')}
   <path d="M60 72 q-8 -10 -2 -18 q4 -5 8 0 M118 40 q10 6 8 16" stroke="${C}" stroke-width="1" fill="none" opacity="0.45"/>
   <circle cx="138" cy="11" r="4.5" stroke="${C}" stroke-width="1.6" fill="none" opacity="0.7" ${B}/><circle cx="138" cy="11" r="1.4" fill="${C}" opacity="0.7"/>
   ${ground}${seal(12, 8)}`,
  // 병 — 온 세상을 비추는 해 (겹겹의 산 위로 떠오른다)
  `<circle cx="92" cy="34" r="30" fill="${C}" opacity="0.1" ${W}/><circle cx="92" cy="34" r="21" stroke="${C}" stroke-width="3.2" fill="none" opacity="0.78" ${B}/>
   ${far('M0 78 Q24 52 44 64 Q62 44 80 60 Q100 50 118 62 Q138 48 160 70 L160 84 L0 84Z', 0.2)}
   <path d="M0 96 Q20 66 40 80 Q58 62 78 82 Q98 70 116 84 Q136 72 160 94 L160 100 L0 100Z" fill="${C}" opacity="0.5" ${S}/>
   ${birds(22, 30)}
   ${seal(142, 8)}`,
  // 정 — 가까운 곳을 밝히는 등불 (촛대 위의 작은 불)
  `<circle cx="80" cy="36" r="32" fill="${C}" opacity="0.1" ${W}/><circle cx="80" cy="36" r="18" fill="${C}" opacity="0.08" ${W}/>
   <path d="M80 16 Q91 32 80 44 Q69 32 80 16Z" fill="${C}" opacity="0.82" ${B}/>
   <path d="M80 44 L80 50" stroke="${C}" stroke-width="1.4" opacity="0.7"/>
   <path d="M73 50 L87 50 L86 68 L74 68 Z" fill="${C}" opacity="0.32" ${S}/><path d="M73 50 L87 50 L86 68 L74 68 Z" stroke="${C}" stroke-width="1.6" fill="none" opacity="0.7" ${B}/>
   <path d="M62 69 Q80 76 98 69" stroke="${C}" stroke-width="2.6" fill="none" stroke-linecap="round" opacity="0.75" ${B}/>
   <path d="M80 73 L80 86 M68 90 Q80 84 92 90" stroke="${C}" stroke-width="2.6" fill="none" stroke-linecap="round" opacity="0.7" ${B}/>
   <path d="M30 94 Q80 90 130 94" stroke="${C}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.4"/>
   <path d="M118 30 q4 -6 2 -12 M126 40 q6 -4 8 -10" stroke="${C}" stroke-width="0.9" fill="none" opacity="0.3"/>
   ${seal(12, 8)}`,
  // 무 — 묵직하게 자리를 지키는 큰 산 (뒤의 먼 산, 허리에 걸친 안개)
  `${far('M0 86 Q30 50 54 62 Q70 44 90 58 L90 90 L0 90Z', 0.16)}
   <path d="M18 92 Q54 44 72 48 Q88 8 106 40 Q124 36 156 92 Z" fill="${C}" opacity="0.55" ${S}/>
   <path d="M72 48 Q80 62 76 80 M106 40 Q102 58 112 76 M88 22 Q92 34 90 46" stroke="${C}" stroke-width="1.3" fill="none" opacity="0.45" ${B}/>
   <path d="M30 70 Q60 62 96 70 Q124 76 150 68" stroke="var(--c-paper, #f5f1e9)" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.85" ${W}/>
   <circle cx="34" cy="20" r="7" stroke="${C}" stroke-width="1.2" fill="none" opacity="0.45" ${B}/>
   ${seal(142, 8)}`,
  // 기 — 씨앗을 품어 기르는 논밭 (멀리 모이는 이랑과 돋아난 싹, 뒤의 낮은 언덕)
  `${far('M0 44 Q40 26 80 38 Q116 26 160 42 L160 52 L0 52Z', 0.2)}
   <circle cx="124" cy="16" r="8" fill="${C}" opacity="0.14" ${W}/>
   <path d="M0 52 L160 52" stroke="${C}" stroke-width="1.4" opacity="0.5" ${B}/>
   ${[-70, -34, -10, 10, 34, 70].map((dx) => `<path d="M${80 + dx * 0.25} 52 Q${80 + dx * 0.7} 74 ${80 + dx * 1.3} 98" stroke="${C}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.5" ${B}/>`).join('')}
   ${[
     [52, 64, 0.8],
     [80, 62, 0.8],
     [106, 64, 0.8],
     [38, 78, 1.1],
     [68, 78, 1.1],
     [94, 78, 1.1],
     [124, 78, 1.1],
     [24, 93, 1.4],
     [58, 94, 1.4],
     [102, 94, 1.4],
     [140, 93, 1.4],
   ]
     .map(
       ([x, y, k]) =>
         `<path d="M${x} ${y} l0 ${-6 * k} M${x} ${y - 2 * k} q${-4 * k} ${-3 * k} ${-5 * k} ${-7 * k} M${x} ${y - 2 * k} q${4 * k} ${-3 * k} ${5 * k} ${-7 * k}" stroke="${C}" stroke-width="${1.2 * k}" fill="none" stroke-linecap="round" opacity="0.75" ${B}/>`,
     )
     .join('')}
   ${seal(12, 8)}`,
  // 경 — 단련될수록 단단해지는 바위 (큰 바위와 곁의 작은 돌, 틈에 난 풀)
  `<path d="M34 90 L46 46 L74 26 L104 38 L122 68 L118 90 Z" fill="${C}" opacity="0.34" ${S}/>
   <path d="M34 90 L46 46 L74 26 L104 38 L122 68 L118 90" stroke="${C}" stroke-width="3" fill="none" stroke-linejoin="round" opacity="0.78" ${B}/>
   <path d="M74 26 L70 56 L46 46 M70 56 L94 68 L104 38 M94 68 L90 90 M70 56 L62 90" stroke="${C}" stroke-width="1.2" fill="none" opacity="0.5" ${B}/>
   <path d="M122 90 L128 74 L142 70 L150 90" fill="${C}" opacity="0.3" ${S}/><path d="M122 90 L128 74 L142 70 L150 90" stroke="${C}" stroke-width="2" fill="none" stroke-linejoin="round" opacity="0.7" ${B}/>
   <path d="M20 90 q-3 -10 -6 -14 M22 90 q0 -10 2 -16 M24 90 q4 -8 8 -11 M106 38 q2 -8 6 -10 M108 39 q5 -4 9 -4" stroke="${C}" stroke-width="1.1" fill="none" stroke-linecap="round" opacity="0.55"/>
   ${ground}${seal(142, 8)}`,
  // 신 — 다듬어져 빛나는 보석 (비단 위의 옥 가락지 한 쌍)
  `<ellipse cx="80" cy="56" rx="60" ry="26" fill="${C}" opacity="0.08" ${W}/>
   <ellipse cx="66" cy="50" rx="24" ry="17" stroke="${C}" stroke-width="6.5" fill="none" opacity="0.72" ${B}/>
   <ellipse cx="96" cy="58" rx="24" ry="17" stroke="${C}" stroke-width="6.5" fill="none" opacity="0.5" ${B}/>
   <path d="M48 42 q8 -8 20 -8 M80 48 q8 -6 18 -6" stroke="var(--c-paper, #f5f1e9)" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="0.9"/>
   <path d="M16 88 Q48 76 80 86 Q112 96 146 84" stroke="${C}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.45" ${B}/>
   <path d="M26 94 Q60 86 90 93" stroke="${C}" stroke-width="1" fill="none" opacity="0.3"/>
   <path d="M126 22 l0 10 M121 27 l10 0 M30 26 l0 7 M26.5 29.5 l7 0" stroke="${C}" stroke-width="1.1" stroke-linecap="round" opacity="0.45"/>
   ${seal(142, 60)}`,
  // 임 — 쉬지 않고 흐르는 큰 물 (넓은 물결과 작은 배 한 척)
  `${far('M0 30 Q40 18 80 26 Q120 16 160 28 L160 36 L0 36Z', 0.14)}
   ${[44, 58, 72, 86].map((y, i) => `<path d="M-4 ${y} Q16 ${y - 11} 36 ${y} T76 ${y} T116 ${y} T164 ${y}" stroke="${C}" stroke-width="${3.2 - i * 0.6}" fill="none" stroke-linecap="round" opacity="${0.78 - i * 0.14}" ${B}/>`).join('')}
   <path d="M0 98 L160 98 L160 76 Q120 88 80 78 Q40 68 0 82 Z" fill="${C}" opacity="0.14" ${S}/>
   <path d="M98 34 Q110 40 124 34 L120 38 Q110 42 102 38Z" fill="${C}" opacity="0.8" ${B}/><path d="M111 34 L111 20 L120 32" stroke="${C}" stroke-width="1.2" fill="none" opacity="0.7"/>
   <circle cx="30" cy="16" r="7" stroke="${C}" stroke-width="1.2" fill="none" opacity="0.45" ${B}/>
   ${seal(142, 8)}`,
  // 계 — 만물을 적시는 비 (구름 아래 빗줄기와 비를 맞는 풀잎)
  `<path d="M26 28 Q30 12 50 16 Q60 4 80 12 Q100 4 110 20 Q132 18 132 32 Q120 40 80 38 Q40 42 26 28Z" fill="${C}" opacity="0.42" ${S}/>
   ${[36, 50, 64, 78, 92, 106, 120].map((x, i) => `<path d="M${x} ${44 + (i % 2) * 6} l-5 15 M${x - 5} ${66 + (i % 3) * 4} l-3 10" stroke="${C}" stroke-width="1.4" stroke-linecap="round" opacity="0.55" ${B}/>`).join('')}
   ${[
     [30, 94],
     [58, 95],
     [88, 94],
     [116, 95],
     [138, 94],
   ]
     .map(([x, y]) => `<path d="M${x} ${y} q-6 -8 -10 -10 M${x} ${y} q0 -10 2 -14 M${x} ${y} q6 -6 11 -8" stroke="${C}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.7" ${B}/>`)
     .join('')}
   <path d="M10 96 Q80 92 150 96" stroke="${C}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.4"/>
   ${seal(142, 8)}`,
];

/** 일간 번호(0 갑 ~ 9 계)의 그림 — label은 화면 낭독기용 설명 */
export function stemArt(i: number, label: string): string {
  return `<svg viewBox="0 0 160 100" class="w-full text-ink" role="img" aria-label="${label}" fill="none">${DEFS}${ART[i]}</svg>`;
}
