import { useMemo, useState } from 'react';
import { BETA_FREE, PREMIUM_SECTIONS } from '../config/plans.ts';
import type { SajuAnalysis } from '../engine/index.ts';
import type { ConcernId } from '../report/concernList.ts';
import { generateReport, type ReportSection, type SectionId, type Statement } from '../report/generate.ts';
import type { StoryPara } from '../report/story.ts';
import { DivergingBars } from './Charts.tsx';
import { ConcernBridge } from './ConcernBridge.tsx';
import { Gloss, Lead, SectionTitle, TONE_STYLE } from './common.tsx';
import { SectionRating } from './Feedback.tsx';

const TAB_ORDER: SectionId[] = ['summary', 'personality', 'love', 'career', 'wealth', 'health'];

/** 풀이를 다 읽은 뒤 '그래서 언제, 어떻게?'로 이어 갈 고민 */
const NEXT: Record<SectionId, { id: ConcernId; lead: string; peek?: false }> = {
  summary: { id: 'year', lead: '그럼 올해는 어떻게 보내면 좋을까요?' },
  personality: { id: 'exam', lead: '내 성향에 맞는 공부법은 뭘까요?', peek: false },
  love: { id: 'love', lead: '그래서 인연은 언제 올까요?' },
  career: { id: 'career', lead: '그래서 지금 옮겨도 될까요?' },
  wealth: { id: 'money', lead: '그래서 돈은 언제 모일까요?' },
  health: { id: 'year', lead: '올해 건강은 언제 특히 조심해야 할까요?', peek: false },
};

function Evidence({ text, show }: { text?: string; show: boolean }) {
  if (!show || !text) return null;
  return (
    <p className="mt-2 text-cap text-sub">
      <Gloss text={`근거 · ${text}`} />
    </p>
  );
}

function StatementItem({ s, showEvidence }: { s: Statement; showEvidence: boolean }) {
  const t = TONE_STYLE[s.tone];
  return (
    <li className="border-b border-line py-5">
      {s.tone !== 'neutral' && <span className={t.tag}>{t.label}</span>}
      <p className={`read ${s.tone !== 'neutral' ? 'mt-2' : ''}`}>
        <Lead text={s.text} />
      </p>
      <Evidence text={s.evidence} show={showEvidence} />
    </li>
  );
}

const WHEN: Record<'past' | 'now' | 'future', { label: string; tag: string; dot: string }> = {
  past: { label: '지나온 시간', tag: 'tag-mute', dot: 'bg-bg border-faint' },
  now: {
    label: '지금',
    tag: 'tag bg-accent text-on-accent',
    dot: 'bg-accent border-accent',
  },
  future: { label: '다가올 시간', tag: 'tag-pos', dot: 'bg-bg border-accent' },
};

function StoryView({ story, showEvidence }: { story: StoryPara[]; showEvidence: boolean }) {
  const firstWhen = story.findIndex((x) => x.when);
  return (
    <article>
      {story.map((p, i) => {
        if (!p.when) {
          return (
            <section key={i} className="mb-10">
              <h3 className="text-title3 text-ink">{p.title}</h3>
              <p className="read mt-3">
                <Lead text={p.text} />
              </p>
              <Evidence text={p.basis} show={showEvidence} />
            </section>
          );
        }
        const w = WHEN[p.when];
        return (
          <section key={i} className="relative pb-8 pl-7">
            {i === firstWhen && <h3 className="-ml-7 mb-5 text-title3 text-ink">인생 연대기</h3>}
            <div className="relative">
              <span aria-hidden className="absolute top-2 -bottom-8 -left-7 ml-[5px] w-px bg-line" />
              <span aria-hidden className={`absolute top-[7px] -left-7 size-[11px] rounded-full border-2 ${w.dot}`} />
              <div className="flex flex-wrap items-center gap-2">
                <h4 className={`font-serif text-[17px] font-bold ${p.when === 'past' ? 'text-sub' : 'text-ink'}`}>{p.title}</h4>
                <span className={w.tag}>{w.label}</span>
              </div>
              <p className={`read mt-2 ${p.when === 'past' ? 'text-sub' : ''}`}>
                <Lead text={p.text} />
              </p>
              <Evidence text={p.basis} show={showEvidence} />
            </div>
          </section>
        );
      })}
    </article>
  );
}

function SectionBody({ a, sec, showEvidence }: { a: SajuAnalysis; sec: ReportSection; showEvidence: boolean }) {
  const locked = !BETA_FREE && PREMIUM_SECTIONS.includes(sec.id);
  const [mode, setMode] = useState<'story' | 'cards'>('story');
  const thisYear = new Date(a.now).getUTCFullYear();
  return (
    <div>
      <p className="kicker">{sec.title} 한 줄 요약</p>
      <p className="mt-2 font-serif text-title2 font-bold text-ink">
        <Gloss text={sec.headline} />
      </p>
      <div className="mt-10">
        {!locked && (
          <div className="mb-8 flex items-center justify-between gap-3">
            <div className="seg w-full max-w-[17rem]" role="tablist" aria-label="보기 방식">
              {(
                [
                  ['story', '이야기로 읽기'],
                  ['cards', '핵심만 보기'],
                ] as const
              ).map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => setMode(id)} className={`seg-item ${mode === id ? 'seg-on' : ''}`}>
                  {label}
                </button>
              ))}
            </div>
            {mode === 'story' && sec.readMinutes && <span className="shrink-0 text-cap text-sub">약 {sec.readMinutes}분</span>}
          </div>
        )}
        {locked ? (
          <p className="panel text-center text-ui text-sub">이 부분은 상세 리포트에 들어 있어요.</p>
        ) : (
          <div className="space-y-12">
            {mode === 'story' && sec.story && <StoryView story={sec.story} showEvidence={showEvidence} />}
            {mode === 'cards' &&
              sec.blocks.map((b) => (
                <div key={b.heading}>
                  <h3 className="text-title3 text-ink">{b.heading}</h3>
                  <ul className="mt-2 border-t border-line">
                    {b.items.map((s, i) => (
                      <StatementItem key={i} s={s} showEvidence={showEvidence} />
                    ))}
                  </ul>
                </div>
              ))}
            {sec.timeline && (
              <div>
                <h3 className="mb-5 text-title3 text-ink">{sec.timeline.title}</h3>
                <DivergingBars
                  ariaLabel={sec.timeline.title}
                  data={sec.timeline.items.map((t) => ({
                    key: t.year,
                    label: String(t.year).slice(2),
                    sub: t.verdict.length <= 4 ? t.verdict : t.verdict.slice(0, 4),
                    score: t.score,
                    highlight: t.year === thisYear,
                    tooltip: `${t.year}년 ${t.pillar} · ${t.verdict}${t.notes.length ? '\n' + t.notes.join('\n') : ''}`,
                  }))}
                />
                <ul className="mt-6 border-t border-line">
                  {sec.timeline.items.map((t) => (
                    <li key={t.year} className="grid grid-cols-[4.75rem_1fr] gap-3 border-b border-line py-3.5">
                      <span className={`text-label font-semibold tabular-nums ${t.year === thisYear ? 'text-accent' : 'text-ink'}`}>
                        {t.year} <span className="font-serif text-cap font-normal text-sub">{t.pillar}</span>
                      </span>
                      <div className="min-w-0">
                        <span className={t.tone === 'positive' ? 'tag-pos' : t.tone === 'negative' ? 'tag-neg' : 'tag-mute'}>{t.verdict}</span>
                        <p className="mt-1.5 text-label text-ink-2">{t.notes.length ? <Gloss text={t.notes.join(' · ')} /> : '특별한 신호 없음'}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
      <SectionRating key={sec.id} a={a} section={sec.id} />
    </div>
  );
}

/** 고민 리포트를 보고 돌아와 다시 펼쳐도 읽던 탭이 그대로 열리게 (페이지를 새로 열면 처음부터) */
let lastTab: SectionId = 'summary';

/** onConcern — 있으면 탭 끝에 고민 리포트로 가는 카드를 붙인다 */
export function ReportView({ a, onConcern }: { a: SajuAnalysis; onConcern?: (id: ConcernId) => void }) {
  const report = useMemo(() => generateReport(a), [a]);
  const [tab, setTabState] = useState<SectionId>(() => lastTab);
  const setTab = (id: SectionId) => {
    lastTab = id;
    setTabState(id);
  };
  const [showEvidence, setShowEvidence] = useState(true);
  const sec = report.sections.find((s) => s.id === tab)!;
  return (
    <section>
      <SectionTitle
        id="report"
        kicker="풀이 리포트"
        title="사실 그대로의 해석"
        desc="좋은 말만 하지 않아요. 이야기로 읽으며 내 삶의 장면과 비교해 보시고, 왜 그렇게 보는지는 문단 아래 ‘근거’에서 확인하세요."
      />
      {report.confidenceNotes.length > 0 && (
        <div className="mb-8 border-l-2 border-line-strong pl-4">
          <p className="text-label font-semibold text-ink">먼저 알아 두세요</p>
          <ul className="mt-1 space-y-1 text-label text-ink-2">
            {report.confidenceNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="tabs" role="tablist" aria-label="풀이 주제">
        {TAB_ORDER.map((id) => {
          const s = report.sections.find((x) => x.id === id)!;
          return (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`tab ${tab === id ? 'tab-on' : ''}`}>
              {s.title}
            </button>
          );
        })}
      </div>
      <label className="mt-4 flex w-fit cursor-pointer items-center gap-2 text-label text-sub">
        <input type="checkbox" className="size-4 accent-accent" checked={showEvidence} onChange={(e) => setShowEvidence(e.target.checked)} />
        근거 함께 보기
      </label>
      <div className="mt-8">
        <SectionBody a={a} sec={sec} showEvidence={showEvidence} />
        {onConcern && <ConcernBridge key={tab} a={a} report={report} {...NEXT[tab]} onGo={onConcern} />}
      </div>
    </section>
  );
}
