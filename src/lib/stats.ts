/**
 * 관리자 통계 계산 (스프레드시트 원본 → 통계)
 * server/index.mjs 의 stats() 와 같은 지표·같은 유료 전환 게이트를 쓴다.
 */
type Meta = Record<string, string | number | boolean>;
export interface RawData {
  feedback: { created_at: string; section: string; rating: number; comment: string; meta: Meta }[];
  reviews: {
    created_at: string; overall: number; accuracy: number; detail: number | ''; text: string;
    price: string; features: string; compare: string; is_public: number; meta: Meta;
  }[];
  events: { created_at: string; session_id: string; type: string; meta: Meta }[];
}

export interface Bucket {
  key: string;
  n: number;
  avg?: number | null;
}
export interface Stats {
  totals: { analyses: number; feedback: number; reviews: number; sessions: number };
  overall: { n: number; avgOverall: number | null; avgAccuracy: number | null; avgDetail: number | null };
  sections: { section: string; n: number; avg: number | null; dist: number[] }[];
  price: Bucket[];
  features: Bucket[];
  compare: Bucket[];
  byStrength: Bucket[];
  byDayStem: Bucket[];
  byConfidence: Bucket[];
  byTimeKnown: Bucket[];
  daily: { day: string; analyses: number; reviews: number }[];
  recentReviews: { created_at: string; overall: number; accuracy: number; text: string | null; price: string | null; meta: Meta }[];
  recentComments: { created_at: string; section: string; rating: number; comment: string }[];
  decision: { ready: boolean; notes: string[]; wtpPaidShare: number | null; medianPrice: string | null };
}

const SECTIONS = ['summary', 'personality', 'love', 'career', 'wealth', 'health', 'gaeun', 'webtoon'];
const PRICE_ORDER = ['free_only', 'p2900', 'p4900', 'p9900', 'p19900', 'p29900'];

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const count = (keys: string[]): Bucket[] => {
  const m = new Map<string, number>();
  for (const k of keys) if (k) m.set(k, (m.get(k) ?? 0) + 1);
  return [...m].map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n);
};
const fmtTime = (s: string) => (s ? s.replace('T', ' ').slice(0, 19) : '');

export function computeStats(raw: RawData): Stats {
  const fb = raw.feedback ?? [];
  const rv = raw.reviews ?? [];
  const ev = raw.events ?? [];
  const analyses = ev.filter((e) => e.type === 'analyze');

  const sections = SECTIONS.map((s) => {
    const rs = fb.filter((f) => f.section === s).map((f) => Number(f.rating));
    return { section: s, n: rs.length, avg: avg(rs), dist: [1, 2, 3, 4, 5].map((k) => rs.filter((r) => r === k).length) };
  });
  const price = count(rv.map((r) => r.price)).sort((a, b) => PRICE_ORDER.indexOf(a.key) - PRICE_ORDER.indexOf(b.key));
  const features = count(rv.flatMap((r) => String(r.features || '').split(',').filter(Boolean)));
  const compare = count(rv.map((r) => r.compare));
  const byMeta = (field: string): Bucket[] => {
    const m = new Map<string, number[]>();
    for (const r of rv) {
      const v = r.meta?.[field];
      if (v === undefined || v === '') continue;
      const key = typeof v === 'boolean' ? (v ? '1' : '0') : String(v).toUpperCase() === 'TRUE' ? '1' : String(v).toUpperCase() === 'FALSE' ? '0' : String(v);
      m.set(key, [...(m.get(key) ?? []), Number(r.accuracy)]);
    }
    return [...m].map(([key, xs]) => ({ key, n: xs.length, avg: avg(xs) })).sort((a, b) => b.n - a.n);
  };
  const dayMap = new Map<string, { analyses: number; reviews: number }>();
  for (const e of analyses) {
    const d = fmtTime(e.created_at).slice(0, 10);
    const cur = dayMap.get(d) ?? { analyses: 0, reviews: 0 };
    cur.analyses++;
    dayMap.set(d, cur);
  }
  for (const r of rv) {
    const d = fmtTime(r.created_at).slice(0, 10);
    const cur = dayMap.get(d) ?? { analyses: 0, reviews: 0 };
    cur.reviews++;
    dayMap.set(d, cur);
  }
  const daily = [...dayMap].map(([day, v]) => ({ day, ...v })).sort((a, b) => b.day.localeCompare(a.day)).slice(0, 30);

  const accuracy = avg(rv.map((r) => Number(r.accuracy)));
  const priced = price.reduce((a, p) => a + p.n, 0);
  const paidRows = price.filter((p) => p.key !== 'free_only');
  const paid = paidRows.reduce((a, p) => a + p.n, 0);
  const wtpPaidShare = priced ? paid / priced : null;
  let medianPrice: string | null = null;
  let acc = 0;
  for (const p of paidRows) {
    acc += p.n;
    if (acc >= paid / 2) {
      medianPrice = p.key;
      break;
    }
  }
  const notes: string[] = [];
  const minReviews = 100;
  if (rv.length < minReviews) notes.push(`리뷰 ${rv.length}/${minReviews}건 — 통계적으로 의미 있는 표본까지 수집을 계속하세요.`);
  if (accuracy !== null && accuracy < 3.8) notes.push(`평균 정확도 ${accuracy.toFixed(2)} < 3.8 — 과금보다 해석 엔진 개선이 먼저입니다.`);
  if (wtpPaidShare !== null && wtpPaidShare < 0.25) notes.push(`유료 의향 ${Math.round(wtpPaidShare * 100)}% < 25% — 가격 제시 전에 가치 증명이 더 필요합니다.`);
  const weak = sections.filter((s) => s.n >= 20 && s.avg !== null && s.avg < 3.5).map((s) => s.section);
  if (weak.length) notes.push(`정확도가 낮은 섹션(${weak.join(', ')})은 유료 후보에서 제외하고 개선하세요.`);
  const strong = sections.filter((s) => s.n >= 20 && s.avg !== null && s.avg >= 4).map((s) => s.section);
  if (strong.length) notes.push(`정확도 4.0 이상 섹션(${strong.join(', ')})은 유료 상세 리포트의 1순위 후보입니다.`);
  const ready = rv.length >= minReviews && accuracy !== null && accuracy >= 3.8 && wtpPaidShare !== null && wtpPaidShare >= 0.25;
  if (ready) notes.push('게이트 통과: 상위 수요 기능을 묶어 유료 상품 A/B 테스트를 시작할 수 있습니다.');

  return {
    totals: { analyses: analyses.length, feedback: fb.length, reviews: rv.length, sessions: new Set(analyses.map((e) => e.session_id)).size },
    overall: { n: rv.length, avgOverall: avg(rv.map((r) => Number(r.overall))), avgAccuracy: accuracy, avgDetail: avg(rv.filter((r) => r.detail !== '').map((r) => Number(r.detail))) },
    sections,
    price,
    features,
    compare,
    byStrength: byMeta('strength'),
    byDayStem: byMeta('dayStem'),
    byConfidence: byMeta('confidence'),
    byTimeKnown: byMeta('timeKnown'),
    daily,
    recentReviews: [...rv].reverse().slice(0, 30).map((r) => ({
      created_at: fmtTime(r.created_at), overall: Number(r.overall), accuracy: Number(r.accuracy), text: r.text || null, price: r.price || null, meta: r.meta ?? {},
    })),
    recentComments: [...fb].reverse().filter((f) => f.comment).slice(0, 30).map((f) => ({ created_at: fmtTime(f.created_at), section: f.section, rating: Number(f.rating), comment: String(f.comment) })),
    decision: { ready, notes, wtpPaidShare, medianPrice },
  };
}
