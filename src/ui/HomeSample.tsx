/**
 * 첫 화면의 예시 결과 — 지어낸 인물 '김명경'의 사주를 실제 엔진으로 계산해 그대로 보여 준다 (꾸며 낸 문장 없음).
 * 강점 칸마다 한 조각씩 쓴다: card(결론과 강점·약점) · toon(웹툰 한 컷) · mbti(MBTI와 사주 비교).
 * 계산 엔진·웹툰을 함께 쓰는 덩어리라 첫 화면과 따로 불러온다.
 */
import { analyze, pillarHanja, type BirthInput } from '../engine/index.ts';
import { PanelArt } from '../comic/art.tsx';
import { episodes } from '../comic/episodes.ts';
import { isText, type Panel } from '../comic/types.ts';
import { crossReport } from '../report/cross.ts';
import { generateReport } from '../report/generate.ts';
import { DAY_MASTER } from '../report/kb.ts';

const SAMPLE: BirthInput = {
  name: '김명경',
  gender: 'female',
  calendar: 'solar',
  year: 1995,
  month: 12,
  day: 25,
  hour: 3,
  minute: 10,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
  placeName: '서울',
  mbti: 'ENFJ',
};

function build() {
  const a = analyze(SAMPLE);
  const cross = crossReport(a, generateReport(a));
  const cut =
    episodes(a, cross)[0]
      ?.beats.filter((b): b is Panel => !isText(b))
      .find((b) => !b.cover && b.talk.length > 0) ?? null;
  const p = a.pillars;
  return { card: cross.card, cut, mbti: cross.mbti, dm: DAY_MASTER[p.day.stem], pillars: [p.hour, p.day, p.month, p.year] };
}
let cache: ReturnType<typeof build> | null = null;

const VERDICT = { agree: ['같아요', 'tag-pos'], differ: ['달라요', 'tag-neg'], neutral: ['반반', 'tag-mute'] } as const;

export default function HomeSample({ part }: { part: 'card' | 'toon' | 'mbti' }) {
  const s = (cache ??= build());
  if (part === 'toon')
    return s.cut ? (
      <div className="overflow-hidden rounded-2xl border border-line">
        <PanelArt p={s.cut} label="예시 웹툰 한 컷" />
      </div>
    ) : null;
  if (part === 'mbti')
    return s.mbti ? (
      <div className="rounded-2xl border border-paper-edge bg-paper px-4 py-2">
        <div className="grid grid-cols-[1fr_3.5rem_4.5rem_3.5rem] items-center gap-x-2 border-b border-paper-edge py-2 text-cap font-semibold text-sub">
          <span />
          <span className="text-center">MBTI</span>
          <span className="text-center">사주</span>
          <span />
        </div>
        {s.mbti.axes.map((x) => (
          <div key={x.axis} className="grid grid-cols-[1fr_3.5rem_4.5rem_3.5rem] items-center gap-x-2 border-b border-paper-edge py-3 last:border-b-0">
            <span className="text-label text-ink-2">{x.info.name}</span>
            <span className="text-center text-title3 font-bold text-ink">{x.user}</span>
            <span className={`text-center text-title3 font-bold ${x.saju.lean ? 'text-ink' : 'text-faint'}`}>{x.saju.lean ?? `${x.info.a}·${x.info.b}`}</span>
            <span className={`${VERDICT[x.verdict][1]} justify-self-end`}>{VERDICT[x.verdict][0]}</span>
          </div>
        ))}
      </div>
    ) : null;
  return (
    <div>
      <div className="rounded-2xl border border-paper-edge bg-paper px-5 py-8 text-center">
        <p className="hanja text-title3 tracking-[0.3em] text-sub" aria-label="사주 여덟 글자">
          {s.pillars.map((x) => (x ? pillarHanja(x) : '')).join(' ')}
        </p>
        <p className="hanja mt-4 text-display text-ink">{s.card.headline}</p>
        <p className="mx-auto mt-3 max-w-[30em] font-serif text-read text-sub">{s.card.subline}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-accent-tint p-4">
          <p className="text-label font-bold text-accent-strong">강점</p>
          <ul className="mt-2 space-y-2 text-label text-ink">
            {s.dm.strengths.slice(0, 2).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-ink p-4">
          <p className="text-label font-bold text-bg">약점</p>
          <ul className="mt-2 space-y-2 text-label text-bg">
            {s.dm.weaknesses.slice(0, 2).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
