/**
 * 세부 풀이 카드 — 처음에는 모두 뒷면(한지에 구름 무늬와 明鏡 낙관)으로 놓여 있고,
 * 누르면 뒤집혀 앞면(수묵 그림 · 이름 · 내 사주로 쓴 한 줄)이 나온다. 앞면의 '풀이 보기'를 누르면 아래에 세부 풀이가 펼쳐진다.
 * 그림은 붓 자국·먹 번짐·여백으로만 그린 수묵화 풍. 카드는 종이라서 어두운 화면에서도 한지 색을 쓴다(조금 낮춘 밝기).
 */
import { useState, type ReactNode } from 'react';

export interface CardItem {
  id: string;
  title: string;
  /** 앞면의 한 줄 — 내 사주로 쓴 문장 */
  line: string;
}

const INK = '#24221e';

/** 붓 자국(가장자리 거칠게)·먹 번짐·종이 결 — 페이지에 한 번만 둔다 */
function InkDefs() {
  return (
    <svg width="0" height="0" aria-hidden className="absolute">
      <defs>
        <filter id="mg-brush" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
        </filter>
        <filter id="mg-wash" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
        <filter id="mg-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="8" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="6" result="d" />
          <feGaussianBlur in="d" stdDeviation="1.6" />
        </filter>
      </defs>
    </svg>
  );
}

/** 붉은 낙관 — 그림 귀퉁이에 작게 */
const Seal = ({ x, y, s = 9 }: { x: number; y: number; s?: number }) => <rect x={x} y={y} width={s} height={s} rx="1" fill="#a8392c" opacity="0.85" filter="url(#mg-brush)" />;

/** 카드마다의 수묵화 (viewBox 0 0 160 100) */
const ART: Record<string, ReactNode> = {
  // 풀이 리포트 — 달 아래 겹친 산 (나를 비추는 거울, 명경지수)
  report: (
    <>
      <circle cx="116" cy="26" r="11" fill={INK} opacity="0.12" filter="url(#mg-wash)" />
      <path d="M0 78 Q22 52 40 62 Q56 40 76 58 Q92 46 108 60 Q130 50 160 70 L160 100 L0 100 Z" fill={INK} opacity="0.16" filter="url(#mg-soft)" />
      <path d="M8 86 Q30 56 48 70 Q60 50 74 66 Q84 60 96 74 L96 100 L8 100 Z" fill={INK} opacity="0.3" filter="url(#mg-soft)" />
      <path d="M44 70 Q54 56 64 66" stroke={INK} strokeWidth="1.6" fill="none" opacity="0.7" filter="url(#mg-brush)" />
      <path d="M104 88 L128 88" stroke={INK} strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
      <path d="M110 86 L116 80 L118 87" stroke={INK} strokeWidth="1" fill="none" opacity="0.5" />
      <Seal x={142} y={8} />
    </>
  ),
  // 운의 흐름 — 겹쳐 밀려오는 물결과 해
  luck: (
    <>
      <circle cx="40" cy="28" r="10" fill="#a8392c" opacity="0.55" filter="url(#mg-wash)" />
      {[54, 66, 78, 90].map((y, i) => (
        <path
          key={y}
          d={`M-4 ${y} Q20 ${y - 12} 40 ${y} T80 ${y} T120 ${y} T164 ${y}`}
          stroke={INK}
          strokeWidth={2.6 - i * 0.4}
          fill="none"
          strokeLinecap="round"
          opacity={0.75 - i * 0.14}
          filter="url(#mg-brush)"
        />
      ))}
      <path d="M96 52 q6 -10 14 -4" stroke={INK} strokeWidth="1.2" fill="none" opacity="0.6" />
      <Seal x={142} y={8} />
    </>
  ),
  // 교차 검증 — 서로 겹치는 세 원상(圓相)
  cross: (
    <>
      <circle cx="64" cy="48" r="24" stroke={INK} strokeWidth="5" fill="none" opacity="0.7" strokeDasharray="128 22" filter="url(#mg-brush)" />
      <circle cx="94" cy="48" r="24" stroke={INK} strokeWidth="3" fill="none" opacity="0.45" strokeDasharray="120 30" transform="rotate(70 94 48)" filter="url(#mg-brush)" />
      <circle cx="79" cy="70" r="22" stroke={INK} strokeWidth="2" fill="none" opacity="0.3" strokeDasharray="110 28" transform="rotate(200 79 70)" filter="url(#mg-brush)" />
      <circle cx="79" cy="56" r="5" fill="#a8392c" opacity="0.6" filter="url(#mg-wash)" />
      <Seal x={142} y={8} />
    </>
  ),
  // MBTI × 사주 — 매화 가지 (겉으로 핀 꽃과 속의 가지)
  mbti: (
    <>
      <path d="M6 96 Q34 70 52 74 Q70 78 84 56 Q96 38 128 30" stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.8" filter="url(#mg-brush)" />
      <path d="M84 56 Q100 62 116 58" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.7" filter="url(#mg-brush)" />
      <path d="M52 74 Q56 58 70 50" stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.6" filter="url(#mg-brush)" />
      {[
        [128, 30],
        [116, 57],
        [70, 49],
        [100, 41],
        [140, 24],
      ].map(([x, y], i) => (
        <g key={i} opacity={i % 2 ? 0.55 : 0.8}>
          {[0, 72, 144, 216, 288].map((r) => (
            <circle key={r} cx={x + 3.2 * Math.cos((r * Math.PI) / 180)} cy={y + 3.2 * Math.sin((r * Math.PI) / 180)} r="2.4" fill="#b0463a" opacity="0.55" />
          ))}
          <circle cx={x} cy={y} r="1" fill={INK} />
        </g>
      ))}
      <Seal x={8} y={8} />
    </>
  ),
  // 지금 하는 일과 나 — 곧게 자라는 대나무
  job: (
    <>
      {[
        [58, 0.8, 4],
        [80, 0.45, 3],
      ].map(([x, o, w]) => (
        <g key={x} opacity={o} filter="url(#mg-brush)">
          {[0, 1, 2, 3].map((k) => (
            <rect key={k} x={x - w / 2} y={6 + k * 24} width={w} height={21} rx="1.2" fill={INK} />
          ))}
        </g>
      ))}
      {[
        'M60 30 q22 -8 40 -4 q-20 6 -40 4',
        'M60 31 q18 8 34 22 q-20 -10 -34 -22',
        'M82 54 q22 -4 38 4 q-22 0 -38 -4',
        'M58 54 q-20 -6 -36 -2 q18 4 36 2',
        'M82 78 q16 6 26 18 q-16 -10 -26 -18',
      ].map((d, i) => (
        <path key={i} d={d} fill={INK} opacity={0.75 - (i % 3) * 0.15} filter="url(#mg-brush)" />
      ))}
      <Seal x={142} y={8} />
    </>
  ),
  // 인생 웹툰 — 펼친 쥘부채
  webtoon: (
    <>
      <g transform="translate(80 92)">
        {Array.from({ length: 9 }, (_, i) => -64 + i * 16).map((deg) => (
          <path key={deg} d="M0 0 L0 -74" stroke={INK} strokeWidth="1.1" opacity="0.5" transform={`rotate(${deg})`} />
        ))}
        <path d="M-66 -38 A76 76 0 0 1 66 -38 L30 -16 A36 36 0 0 0 -30 -16 Z" fill={INK} opacity="0.1" filter="url(#mg-wash)" />
        <path d="M-66 -38 A76 76 0 0 1 66 -38" stroke={INK} strokeWidth="2.4" fill="none" opacity="0.7" filter="url(#mg-brush)" />
        <path d="M-40 -50 Q-20 -64 0 -54 Q18 -46 36 -58" stroke={INK} strokeWidth="2" fill="none" opacity="0.55" filter="url(#mg-brush)" />
        <circle cx="0" cy="0" r="2.4" fill="#a8392c" />
      </g>
      <Seal x={142} y={8} />
    </>
  ),
  // 만세력 — 별자리와 해·달의 길 (천문)
  chart: (
    <>
      <circle cx="80" cy="52" r="34" stroke={INK} strokeWidth="1.2" fill="none" opacity="0.4" />
      <ellipse cx="80" cy="52" rx="44" ry="14" stroke={INK} strokeWidth="2" fill="none" opacity="0.55" transform="rotate(-18 80 52)" filter="url(#mg-brush)" />
      {Array.from({ length: 24 }, (_, i) => i * 15).map((deg) => (
        <path key={deg} d="M80 18 L80 22" stroke={INK} strokeWidth="1" opacity="0.5" transform={`rotate(${deg} 80 52)`} />
      ))}
      {[
        [60, 40],
        [70, 34],
        [84, 38],
        [96, 30],
        [104, 44],
      ].map(([x, y], i, all) => (
        <g key={i}>
          {i > 0 && <line x1={all[i - 1][0]} y1={all[i - 1][1]} x2={x} y2={y} stroke={INK} strokeWidth="0.8" opacity="0.4" />}
          <circle cx={x} cy={y} r="2" fill={INK} opacity="0.8" />
        </g>
      ))}
      <circle cx="80" cy="52" r="4" fill="#a8392c" opacity="0.7" filter="url(#mg-wash)" />
      <Seal x={142} y={8} />
    </>
  ),
  // 전문 분석 — 다섯 기운, 농담이 다른 먹점 다섯
  detail: (
    <>
      {[
        [80, 22, 0.85, 9],
        [110, 44, 0.6, 8],
        [99, 78, 0.4, 7],
        [61, 78, 0.25, 7],
        [50, 44, 0.5, 8],
      ].map(([x, y, o, r], i, all) => {
        const [nx, ny] = all[(i + 1) % 5];
        return (
          <g key={i}>
            <line x1={x} y1={y} x2={nx} y2={ny} stroke={INK} strokeWidth="0.7" opacity="0.25" />
            <circle cx={x} cy={y} r={r} fill={INK} opacity={o} filter="url(#mg-soft)" />
          </g>
        );
      })}
      <Seal x={142} y={8} />
    </>
  ),
};

/** 뒷면 — 한지 바탕에 구름 무늬 테두리와 明鏡 낙관 */
function Back({ title }: { title: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border p-3" style={{ background: 'var(--card-back)', borderColor: 'var(--card-edge)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
      <svg viewBox="0 0 100 130" className="absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)]" preserveAspectRatio="none" aria-hidden>
        <rect x="1" y="1" width="98" height="128" rx="6" fill="none" stroke={INK} strokeOpacity="0.28" strokeWidth="0.6" />
        <rect x="4" y="4" width="92" height="122" rx="4" fill="none" stroke={INK} strokeOpacity="0.16" strokeWidth="0.4" />
        {[
          [14, 14, 0],
          [86, 14, 90],
          [86, 116, 180],
          [14, 116, 270],
        ].map(([x, y, r]) => (
          <path key={r} d="M0 0 q6 -6 12 0 q-6 4 -2 8 q4 2 6 -2" stroke={INK} strokeOpacity="0.35" strokeWidth="0.7" fill="none" transform={`translate(${x} ${y}) rotate(${r})`} />
        ))}
      </svg>
      <span className="hanja relative flex size-14 flex-col items-center justify-center rounded-md text-[17px] leading-[1.05] font-bold" style={{ background: '#a8392c', color: '#f6efe2' }}>
        <span>明</span>
        <span>鏡</span>
      </span>
      <span className="relative mt-4 text-label font-semibold" style={{ color: INK }}>
        {title}
      </span>
      <span className="relative mt-1 text-micro" style={{ color: '#5f5a50' }}>
        눌러서 뒤집기
      </span>
    </div>
  );
}

export function DetailCards({ items, open, onOpen }: { items: CardItem[]; open: string | null; onOpen: (id: string) => void }) {
  const [shown, setShown] = useState<Set<string>>(() => new Set());
  const flip = (id: string) => setShown((s) => new Set(s).add(id));
  const all = items.every((x) => shown.has(x.id) || x.id === open);
  return (
    <div>
      <InkDefs />
      <ul className="grid grid-cols-2 gap-3" data-cards>
        {items.map((x) => {
          const up = shown.has(x.id) || open === x.id;
          return (
            <li key={x.id} className="aspect-[3/4.3]" style={{ perspective: '1000px' }}>
              <div className="relative h-full w-full transition-transform duration-500 motion-reduce:transition-none" style={{ transformStyle: 'preserve-3d', transform: up ? 'rotateY(180deg)' : 'none' }}>
                <button type="button" className="absolute inset-0 rounded-2xl text-left" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }} onClick={() => flip(x.id)} aria-label={`${x.title} 카드 뒤집기`} tabIndex={up ? -1 : 0} aria-hidden={up}>
                  <Back title={x.title} />
                </button>
                <div
                  className={`absolute inset-0 flex flex-col overflow-hidden rounded-2xl border ${open === x.id ? 'ring-2 ring-accent' : ''}`}
                  style={{ background: 'var(--card-face)', borderColor: 'var(--card-edge)', transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                  aria-hidden={!up}
                >
                  <svg viewBox="0 0 160 100" className="w-full shrink-0" role="img" aria-label={`${x.title} 그림`}>
                    {ART[x.id]}
                  </svg>
                  <div className="flex min-h-0 flex-1 flex-col px-3 pb-3">
                    <p className="text-ui font-bold" style={{ color: INK }}>
                      {x.title}
                    </p>
                    <p className="mt-1 line-clamp-3 text-cap leading-snug" style={{ color: '#4a463e' }}>
                      {x.line}
                    </p>
                    <button
                      type="button"
                      tabIndex={up ? 0 : -1}
                      onClick={() => onOpen(x.id)}
                      className="mt-auto h-9 rounded-lg text-label font-semibold"
                      style={{ background: open === x.id ? 'transparent' : INK, color: open === x.id ? INK : '#f4efe4', border: `1px solid ${INK}` }}
                    >
                      {open === x.id ? '아래에 펼쳤어요' : '풀이 보기'}
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {!all && (
        <button type="button" className="link mt-4 text-label" onClick={() => setShown(new Set(items.map((x) => x.id)))}>
          카드 모두 뒤집기
        </button>
      )}
    </div>
  );
}
