/**
 * 입력을 마치고 결과로 넘어갈 때 잠깐 보여 주는 '계산하는 중' 화면.
 * 계산은 브라우저에서 한순간에 끝나지만, 무엇을 계산했는지를 이 사람의 실제 값으로 한 줄씩 보여 준다.
 * 지어낸 숫자('5만 가지 분석' 같은)는 쓰지 않는다. 입력 화면에서 막 넘어왔을 때만 보이고(lib/freshResult.ts),
 * 누르면 건너뛴다. 움직임 줄이기 설정이면 짧게 끝낸다.
 */
import { useEffect, useState } from 'react';
import { ELEMENTS } from '../engine/constants.ts';
import { pillarHanja, type SajuAnalysis } from '../engine/index.ts';
import { elWord } from '../report/plain.ts';

export function analyzingSteps(a: SajuAnalysis): string[] {
  const p = a.pillars;
  const top = [...ELEMENTS].sort((x, y) => a.elements.percent[y] - a.elements.percent[x])[0];
  const fix = Math.round(p.longitudeCorrectionMinutes + p.equationOfTimeMinutes);
  return [
    `태어난 순간의 태양 위치 계산 — 황경 ${p.sunLongitude.toFixed(1)}°`,
    `절기 확인 — ${p.prevJie.name} 지나고 ${Math.floor(p.daysSincePrevJie)}일째`,
    ...(p.timeKnown && fix !== 0 ? [`태어난 곳의 경도로 시각 보정 — ${fix > 0 ? '+' : ''}${fix}분`] : []),
    `${p.hour ? '여덟' : '여섯'} 글자 세우기 — ${pillarHanja(p.day)}일주`,
    `다섯 기운의 세기 — 가장 센 기운은 ${elWord(top)} ${a.elements.percent[top].toFixed(0)}%`,
    `가장 필요한 기운 찾기 — ${elWord(a.yongsin.yongsin)}`,
    `10년 대운 ${a.daeun.list.length}개와 올해·앞으로 12달의 운 계산`,
    '내 사주에 맞는 풀이 문장 고르기',
  ];
}

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function Analyzing({ a, onDone }: { a: SajuAnalysis; onDone: () => void }) {
  const steps = analyzingSteps(a);
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((v) => v + 1), reduced() ? 80 : 340);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (n <= steps.length) return;
    const t = setTimeout(onDone, reduced() ? 0 : 260);
    return () => clearTimeout(t);
  }, [n, steps.length, onDone]);
  const ratio = Math.min(1, n / steps.length);
  return (
    <div className="wrap flex min-h-[70vh] flex-col justify-center py-12" role="status" aria-live="polite">
      <span aria-hidden className="seal mx-auto size-14 text-[17px]">
        <span>明</span>
        <span>鏡</span>
      </span>
      <h1 className="mt-5 text-center text-title2 text-ink">{a.input.name ? `${a.input.name}님의 사주를 계산하고 있어요` : '사주를 계산하고 있어요'}</h1>
      <div className="mx-auto mt-6 h-1 w-full max-w-[22rem] overflow-hidden rounded-full bg-fill" aria-hidden>
        {/* 너비 대신 transform으로 늘린다 (움직임이 매끄럽고 화면을 다시 배치하지 않는다) */}
        <div className="h-full origin-left bg-accent transition-transform duration-300 ease-out" style={{ transform: `scaleX(${ratio})` }} />
      </div>
      <ol className="mx-auto mt-6 w-full max-w-[22rem] space-y-2.5">
        {steps.map((s, i) => (
          <li key={s} className={`flex gap-2.5 text-label text-ink-2 transition-opacity duration-200 ${i < n ? 'opacity-100' : 'opacity-0'}`}>
            <span aria-hidden className="text-accent">
              ✓
            </span>
            {s}
          </li>
        ))}
      </ol>
      <button type="button" className="tap mx-auto mt-8 text-label text-sub" onClick={onDone}>
        바로 결과 보기
      </button>
    </div>
  );
}
