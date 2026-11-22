/**
 * 첫 화면의 예시 결과 — 지어낸 인물 '김명경'의 사주를 실제 엔진으로 계산해 그대로 보여 준다 (꾸며 낸 문장 없음).
 * 계산 엔진·웹툰을 함께 쓰는 덩어리라 첫 화면과 따로 불러온다.
 */
import { useMemo } from 'react';
import { analyze, pillarHanja, type BirthInput } from '../engine/index.ts';
import { PanelArt } from '../comic/art.tsx';
import { episodes } from '../comic/episodes.ts';
import { isText, type Panel } from '../comic/types.ts';
import { crossReport } from '../report/cross.ts';
import { generateReport } from '../report/generate.ts';
import { DAY_MASTER } from '../report/kb.ts';

const SAMPLE: BirthInput = { name: '김명경', gender: 'female', calendar: 'solar', year: 1995, month: 12, day: 25, hour: 3, minute: 10, longitude: 126.978, timeZone: 'Asia/Seoul', placeName: '서울' };

export default function HomeSample() {
  const s = useMemo(() => {
    const a = analyze(SAMPLE);
    const cross = crossReport(a, generateReport(a));
    const ep = episodes(a, cross)[0];
    const cut = ep?.beats.filter((b): b is Panel => !isText(b)).find((b) => !b.cover && b.talk.length > 0) ?? null;
    const p = a.pillars;
    return { a, card: cross.card, cut, dm: DAY_MASTER[p.day.stem], pillars: [p.hour, p.day, p.month, p.year] };
  }, []);
  return (
    <div>
      <div className="rounded-2xl border border-paper-edge bg-paper px-5 py-8 text-center">
        <p className="hanja text-title3 tracking-[0.3em] text-sub" aria-label="사주 여덟 글자">
          {s.pillars.map((x) => (x ? pillarHanja(x) : '')).join(' ')}
        </p>
        <p className="hanja mt-4 text-display text-ink">{s.card.headline}</p>
        <p className="mx-auto mt-3 max-w-[30em] font-serif text-read text-sub">{s.card.subline}</p>
        <dl className="mt-6 grid grid-cols-2 border-t border-paper-edge text-left">
          <div className="border-r border-paper-edge pt-4 pr-3">
            <dt className="text-cap font-semibold text-sub">겉으로는</dt>
            <dd className="mt-1 text-ui font-bold text-ink">{s.card.outer}</dd>
          </div>
          <div className="pt-4 pl-4">
            <dt className="text-cap font-semibold text-sub">속으로는</dt>
            <dd className="mt-1 text-ui font-bold text-ink">{s.card.inner}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
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
      <p className="mt-2 text-center text-cap text-sub">좋은 말만 하지 않아요. 강점 옆에 약점을 나란히 적어요.</p>

      {s.cut && (
        <figure className="mt-6">
          <div className="overflow-hidden rounded-2xl border border-line">
            <PanelArt p={s.cut} label="예시 웹툰 한 컷" />
          </div>
          <figcaption className="mt-2 text-center text-cap text-sub">내 사주로 그린 웹툰도 4화까지 나와요.</figcaption>
        </figure>
      )}
    </div>
  );
}
