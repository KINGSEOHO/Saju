/**
 * 리뷰·피드백 API 클라이언트
 * 서버(/api)가 없으면(정적 호스팅) 브라우저 localStorage 에 보관했다가 다음 기회에 재전송한다.
 */
import type { SajuAnalysis } from '../engine/index.ts';

const QUEUE_KEY = 'mg_pending_v1';
const SESSION_KEY = 'mg_session_v1';

export function sessionId(): string {
  try {
    let s = localStorage.getItem(SESSION_KEY);
    if (!s) {
      s = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch {
    return 'anon';
  }
}

/** 리뷰 분석용 익명 요약 — 생년월일·시각·이름은 보내지 않는다 */
export function chartMeta(a: SajuAnalysis) {
  const ageGroup = Math.floor(a.age / 10) * 10;
  return {
    dayPillar: a.pillars.day.index,
    dayStem: a.pillars.day.stem,
    gender: a.input.gender,
    ageGroup,
    strength: a.strength.level,
    gyeokguk: a.gyeokguk.name,
    yongsin: a.yongsin.yongsin,
    yongsinMethod: a.yongsin.method,
    confidence: a.yongsin.confidence,
    timeKnown: a.pillars.timeKnown,
    calendar: a.input.calendar,
  };
}

type Kind = 'feedback' | 'reviews' | 'events';

async function post(kind: Kind, body: unknown): Promise<boolean> {
  try {
    const r = await fetch(`/api/${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return r.ok;
  } catch {
    return false;
  }
}

function enqueue(kind: Kind, body: unknown) {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as { kind: Kind; body: unknown }[];
    q.push({ kind, body });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-50)));
  } catch {
    /* 저장 불가 환경 */
  }
}

export async function flushQueue() {
  let q: { kind: Kind; body: unknown }[] = [];
  try {
    q = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
  } catch {
    return;
  }
  if (!q.length) return;
  const rest: typeof q = [];
  for (const item of q) if (!(await post(item.kind, item.body))) rest.push(item);
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(rest));
  } catch {
    /* noop */
  }
}

export async function send(kind: Kind, body: unknown): Promise<'sent' | 'queued'> {
  const ok = await post(kind, body);
  if (!ok) {
    enqueue(kind, body);
    return 'queued';
  }
  return 'sent';
}

export async function fetchStats(token: string) {
  const r = await fetch('/api/stats', { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(r.status === 401 ? '관리자 토큰이 올바르지 않습니다.' : `서버 오류 (${r.status})`);
  return r.json();
}
