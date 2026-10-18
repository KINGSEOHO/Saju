/**
 * 세부 풀이 카드 — 처음에는 모두 뒷면(한지에 구름 무늬와 明鏡 낙관)으로 놓여 있고,
 * 누르면 뒤집혀 앞면(수묵 그림 · 이름 · 내 사주로 쓴 한 줄)이 나온다. 앞면을 누르면 아래에서 풀이 창이 올라온다.
 * 카드는 한 줄로 놓여 옆으로 넘기고(다음 카드가 살짝 보이게), 아래 화살표로도 넘긴다.
 * 그림은 붓 자국·먹 번짐·여백으로만 그린 수묵화 풍. 카드는 종이라서 어두운 화면에서도 한지 색을 쓴다(조금 낮춘 밝기).
 */
import { useRef, useState, type ReactNode } from 'react';
import { scrollMotion } from './common.tsx';

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

/** 카드마다의 수묵화 (viewBox 0 0 160 100) — 그 칸이 하는 일을 떠올리게 하는 사물로 */
const PAPER = { fill: 'var(--card-face)' };
const ART: Record<string, ReactNode> = {
  // 풀이 리포트 — 나를 비추는 청동 거울(명경), 거울 속에 산과 달
  report: (
    <>
      <circle cx="80" cy="42" r="30" fill={INK} opacity="0.07" filter="url(#mg-wash)" />
      <circle cx="80" cy="42" r="30" stroke={INK} strokeWidth="3.2" fill="none" opacity="0.75" filter="url(#mg-brush)" />
      <circle cx="80" cy="42" r="24" stroke={INK} strokeWidth="0.8" fill="none" opacity="0.35" />
      <circle cx="91" cy="31" r="4" fill={INK} opacity="0.16" filter="url(#mg-wash)" />
      <path d="M60 54 Q68 42 75 50 Q83 36 92 48 Q98 44 102 52" stroke={INK} strokeWidth="1.5" fill="none" opacity="0.5" filter="url(#mg-brush)" />
      <path d="M64 96 L80 72 L96 96" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" filter="url(#mg-brush)" />
      <path d="M52 97 L108 97" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M80 72 q-3 6 0 12" stroke="#a8392c" strokeWidth="1.6" fill="none" opacity="0.8" />
      <Seal x={142} y={8} />
    </>
  ),
  // 운의 흐름 — 차오르는 달 넷과 물결 (달마다·해마다 바뀌는 운)
  luck: (
    <>
      {[
        [28, 58, 8],
        [58, 44, 5],
        [90, 34, 2.5],
      ].map(([x, y, d]) => (
        <g key={x}>
          <circle cx={x} cy={y} r="9" fill={INK} opacity="0.6" filter="url(#mg-brush)" />
          <circle cx={x - d} cy={y - 1} r="9" style={PAPER} />
        </g>
      ))}
      <circle cx="122" cy="28" r="10" fill={INK} opacity="0.12" filter="url(#mg-wash)" />
      <circle cx="122" cy="28" r="10" stroke={INK} strokeWidth="1.4" fill="none" opacity="0.55" filter="url(#mg-brush)" />
      {[78, 88].map((y, i) => (
        <path key={y} d={`M-4 ${y} Q20 ${y - 8} 40 ${y} T80 ${y} T120 ${y} T164 ${y}`} stroke={INK} strokeWidth={2.2 - i * 0.8} fill="none" strokeLinecap="round" opacity={0.6 - i * 0.2} filter="url(#mg-brush)" />
      ))}
      <Seal x={142} y={60} />
    </>
  ),
  // 교차 검증 — 방향을 가리키는 패철(나침반): 여러 체계가 한쪽을 가리키는지
  cross: (
    <>
      <circle cx="80" cy="50" r="38" fill={INK} opacity="0.06" filter="url(#mg-wash)" />
      <circle cx="80" cy="50" r="38" stroke={INK} strokeWidth="2.6" fill="none" opacity="0.7" filter="url(#mg-brush)" />
      <circle cx="80" cy="50" r="28" stroke={INK} strokeWidth="0.8" fill="none" opacity="0.4" />
      <circle cx="80" cy="50" r="18" stroke={INK} strokeWidth="0.8" fill="none" opacity="0.4" />
      {Array.from({ length: 24 }, (_, i) => i * 15).map((deg) => (
        <path key={deg} d="M80 14 L80 19" stroke={INK} strokeWidth={deg % 90 ? 0.8 : 1.6} opacity="0.55" transform={`rotate(${deg} 80 50)`} />
      ))}
      <g transform="rotate(35 80 50)">
        <path d="M80 26 L84 50 L76 50 Z" fill="#a8392c" opacity="0.85" />
        <path d="M80 74 L84 50 L76 50 Z" fill={INK} opacity="0.75" />
      </g>
      <circle cx="80" cy="50" r="2.4" fill={INK} />
      <Seal x={142} y={8} />
    </>
  ),
  // MBTI × 사주 — 물 위의 산과 물에 비친 산 (겉으로 보이는 나와 속의 나)
  mbti: (
    <>
      <path d="M14 56 Q32 30 50 42 Q62 18 82 36 Q98 26 114 42 Q130 34 148 56 Z" fill={INK} opacity="0.5" filter="url(#mg-soft)" />
      <path d="M14 60 Q32 86 50 74 Q62 98 82 80 Q98 90 114 74 Q130 82 148 60 Z" fill={INK} opacity="0.14" filter="url(#mg-soft)" />
      <path d="M6 58 L154 58" stroke={INK} strokeWidth="1.6" opacity="0.6" filter="url(#mg-brush)" />
      {[66, 74, 82].map((y, i) => (
        <path key={y} d={`M${30 + i * 18} ${y} q10 -2 20 0`} stroke={INK} strokeWidth="0.9" fill="none" opacity="0.35" />
      ))}
      <Seal x={142} y={8} />
    </>
  ),
  // 지금 하는 일과 나 — 벼루 위에 놓인 붓 (지금 손에 쥔 일)
  job: (
    <>
      <path d="M26 70 Q26 62 36 62 L100 62 Q110 62 110 70 L110 84 Q110 92 100 92 L36 92 Q26 92 26 84 Z" fill={INK} opacity="0.28" filter="url(#mg-soft)" />
      <ellipse cx="48" cy="76" rx="13" ry="7" fill={INK} opacity="0.85" filter="url(#mg-brush)" />
      <path d="M44 30 L124 54" stroke="#5c4a36" strokeWidth="4" strokeLinecap="round" opacity="0.85" filter="url(#mg-brush)" />
      <path d="M44 30 L38 28" stroke="#a8392c" strokeWidth="2" strokeLinecap="round" />
      <path d="M122 50 Q138 54 150 66 Q136 64 120 58 Z" fill={INK} opacity="0.9" filter="url(#mg-brush)" />
      <path d="M118 82 q10 -8 22 -2" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" filter="url(#mg-brush)" />
      <Seal x={142} y={8} />
    </>
  ),
  // 인생 웹툰 — 네 칸으로 나뉜 두루마리 (네 편의 이야기)
  webtoon: (
    <>
      <rect x="18" y="26" width="124" height="48" fill="#fbf8f1" stroke={INK} strokeOpacity="0.3" strokeWidth="0.8" />
      {[49, 80, 111].map((x) => (
        <path key={x} d={`M${x} 30 L${x} 70`} stroke={INK} strokeWidth="0.8" opacity="0.35" />
      ))}
      <circle cx="33" cy="42" r="5" fill={INK} opacity="0.2" filter="url(#mg-wash)" />
      <path d="M22 66 Q30 54 38 62 Q42 58 46 64" stroke={INK} strokeWidth="1.4" fill="none" opacity="0.6" filter="url(#mg-brush)" />
      <path d="M58 64 L66 46 L74 64" stroke={INK} strokeWidth="1.6" fill="none" opacity="0.6" filter="url(#mg-brush)" />
      <path d="M86 56 q6 -6 12 0 t12 0" stroke={INK} strokeWidth="1.4" fill="none" opacity="0.6" filter="url(#mg-brush)" />
      <circle cx="126" cy="50" r="7" fill="#a8392c" opacity="0.55" filter="url(#mg-wash)" />
      {[12, 142].map((x) => (
        <rect key={x} x={x} y="20" width="6" height="60" rx="3" fill={INK} opacity="0.7" filter="url(#mg-brush)" />
      ))}
      <Seal x={142} y={86} s={8} />
    </>
  ),
  // 만세력 — 펼친 책력, 간지가 세로로 적힌 장
  chart: (
    <>
      <path d="M80 20 Q56 14 24 20 L24 86 Q56 80 80 86 Z" fill="#fbf8f1" stroke={INK} strokeOpacity="0.45" strokeWidth="1" />
      <path d="M80 20 Q104 14 136 20 L136 86 Q104 80 80 86 Z" fill="#fbf8f1" stroke={INK} strokeOpacity="0.45" strokeWidth="1" />
      <path d="M80 20 L80 86" stroke={INK} strokeWidth="1.4" opacity="0.6" />
      {['甲子', '乙丑', '丙寅'].map((t, i) => (
        <text key={t} x={66 - i * 16} y={34} fontSize="9" fill={INK} opacity="0.75" style={{ fontFamily: 'var(--font-hanja)', writingMode: 'vertical-rl' }}>
          {t}
        </text>
      ))}
      {['丁卯', '戊辰', '己巳'].map((t, i) => (
        <text key={t} x={126 - i * 16} y={34} fontSize="9" fill={INK} opacity="0.75" style={{ fontFamily: 'var(--font-hanja)', writingMode: 'vertical-rl' }}>
          {t}
        </text>
      ))}
      <rect x="112" y="68" width="10" height="10" rx="1" fill="#a8392c" opacity="0.8" filter="url(#mg-brush)" />
    </>
  ),
  // 전문 분석 — 다섯 기운: 나무 · 불 · 흙 · 쇠(엽전) · 물이 한 바퀴로 이어진다
  detail: (
    <>
      <circle cx="80" cy="52" r="32" stroke={INK} strokeWidth="0.8" fill="none" opacity="0.3" strokeDasharray="3 4" />
      {/* 나무 */}
      <g transform="translate(80 20)" opacity="0.8" filter="url(#mg-brush)">
        <path d="M0 10 L0 -8 M0 -2 L-6 -8 M0 2 L6 -5" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
      </g>
      {/* 불 */}
      <path d="M112 50 Q104 40 112 28 Q114 36 120 38 Q124 46 118 52 Q114 54 112 50 Z" fill="#a8392c" opacity="0.7" filter="url(#mg-brush)" />
      {/* 흙 — 산 */}
      <path d="M90 90 L100 74 L110 90 Z" fill={INK} opacity="0.55" filter="url(#mg-soft)" />
      {/* 쇠 — 엽전 */}
      <g transform="translate(58 82)">
        <circle r="8" stroke={INK} strokeWidth="2" fill="none" opacity="0.7" filter="url(#mg-brush)" />
        <rect x="-2.5" y="-2.5" width="5" height="5" fill="none" stroke={INK} strokeWidth="1.2" opacity="0.7" />
      </g>
      {/* 물 — 물방울 */}
      <path d="M46 34 Q40 44 40 48 Q40 54 46 54 Q52 54 52 48 Q52 44 46 34 Z" fill={INK} opacity="0.35" filter="url(#mg-soft)" />
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
      <span className="relative mt-1 text-micro" style={{ color: '#4d483f' }}>
        눌러서 뒤집기
      </span>
    </div>
  );
}

export function DetailCards({ items, onOpen }: { items: CardItem[]; onOpen: (id: string) => void }) {
  const [shown, setShown] = useState<Set<string>>(() => new Set());
  const [at, setAt] = useState(0);
  /** ‘모두 뒤집기’를 눌렀을 때만 보이는 카드부터 차례로 뒤집는다 */
  const [cascade, setCascade] = useState(false);
  const rail = useRef<HTMLUListElement>(null);
  const flip = (id: string) => setShown((s) => new Set(s).add(id));
  const all = items.every((x) => shown.has(x.id));
  /** 카드 한 장(+간격)의 폭 */
  const step = () => {
    const el = rail.current;
    const li = el?.children[1] as HTMLElement | undefined;
    const first = el?.children[0] as HTMLElement | undefined;
    return li && first ? li.offsetLeft - first.offsetLeft : (el?.clientWidth ?? 1);
  };
  const go = (n: number) => {
    const i = Math.max(0, Math.min(items.length - 1, n));
    rail.current?.scrollTo({ left: i * step(), behavior: scrollMotion() });
  };
  return (
    <div>
      <InkDefs />
      <ul
        ref={rail}
        data-cards
        className="no-scrollbar -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1"
        onScroll={(e) => setAt(Math.round(e.currentTarget.scrollLeft / step()))}
        aria-label="세부 풀이 카드 — 옆으로 넘겨 보세요"
      >
        {items.map((x, i) => {
          const up = shown.has(x.id);
          return (
            <li key={x.id} className="aspect-[3/4] w-[70%] max-w-[270px] shrink-0 snap-start" style={{ perspective: '1000px' }} aria-label={`${i + 1} / ${items.length}`}>
              <div
                className="relative h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
                style={{ transformStyle: 'preserve-3d', transform: up ? 'rotateY(180deg)' : 'none', transitionDelay: cascade ? `${Math.min(i, 3) * 60}ms` : undefined }}
              >
                <button type="button" className="absolute inset-0 rounded-2xl" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }} onClick={() => flip(x.id)} aria-label={`${x.title} 카드 뒤집기`} tabIndex={up ? -1 : 0} aria-hidden={up}>
                  <Back title={x.title} />
                </button>
                <button
                  type="button"
                  tabIndex={up ? 0 : -1}
                  aria-hidden={!up}
                  onClick={() => onOpen(x.id)}
                  aria-label={`${x.title} 풀이 보기`}
                  className="absolute inset-0 flex flex-col items-center overflow-hidden rounded-2xl border text-center"
                  style={{ background: 'var(--card-face)', borderColor: 'var(--card-edge)', transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                >
                  <svg viewBox="0 0 160 100" className="w-full shrink-0" role="img" aria-label={`${x.title} 그림`}>
                    {ART[x.id]}
                  </svg>
                  <span className="flex min-h-0 flex-1 flex-col items-center px-4 pt-1 pb-4">
                    <span className="text-title3 font-bold" style={{ color: INK }}>
                      {x.title}
                    </span>
                    <span className="mt-1.5 line-clamp-3 text-label leading-snug" style={{ color: '#4a463e' }}>
                      {x.line}
                    </span>
                    <span className="mt-auto inline-flex items-center gap-2 text-label font-semibold" style={{ color: INK }}>
                      풀이 보기
                      <span className="flex size-7 items-center justify-center rounded-full" style={{ background: INK, color: '#f4efe4' }} aria-hidden>
                        <svg viewBox="0 0 12 12" className="size-3">
                          <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </span>
                    </span>
                  </span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex items-center justify-center gap-4">
        <Arrow dir={-1} disabled={at <= 0} onClick={() => go(at - 1)} />
        <span className="w-12 text-center text-cap text-sub tabular-nums" aria-live="polite">
          {Math.min(at, items.length - 1) + 1} / {items.length}
        </span>
        <Arrow dir={1} disabled={at >= items.length - 1} onClick={() => go(at + 1)} />
      </div>
      {!all && (
        <div className="mt-3 text-center">
          <button type="button" className="link tap text-label" onClick={() => {
              setCascade(true);
              setShown(new Set(items.map((x) => x.id)));
            }}>
            카드 모두 뒤집기
          </button>
        </div>
      )}
    </div>
  );
}

function Arrow({ dir, disabled, onClick }: { dir: 1 | -1; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir < 0 ? '이전 카드' : '다음 카드'}
      className="flex size-11 items-center justify-center rounded-full bg-fill text-ink transition-[opacity,scale] duration-150 ease-out active:scale-[0.97] disabled:opacity-35 disabled:active:scale-100"
    >
      <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
        <path d={dir < 0 ? 'M7.5 2L3.5 6l4 4' : 'M4.5 2l4 4-4 4'} stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
