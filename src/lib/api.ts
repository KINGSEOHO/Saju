/**
 * 리뷰·피드백 API 클라이언트
 * - Google 스프레드시트(SHEET_URL) 또는 자체 서버(/api)로 전송
 * - 전송 실패 시 브라우저 localStorage 에 보관했다가 다음 방문 때 재전송
 */
import { SHEET_URL } from '../config/backend.ts';
import type { SajuAnalysis } from '../engine/index.ts';
import { matchJob } from '../report/job.ts';
import { parseMbti } from '../report/mbti.ts';
import { computeStats, type RawData, type Stats } from './stats.ts';

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
    // 교차 분석 정확도를 유형별로 보기 위한 값 (직업은 분야 이름만, 입력한 직업명은 보내지 않는다)
    mbti: parseMbti(a.input.mbti) ?? '',
    jobCat: a.input.job ? matchJob(a.input.job).id : '',
  };
}

type Kind = 'feedback' | 'reviews' | 'events';

/** ok: 저장됨 · retry: 네트워크 문제(나중에 재전송) · rejected: 서버가 형식을 거부(재전송해도 소용없음) */
type PostResult = 'ok' | 'retry' | 'rejected';

async function post(kind: Kind, body: unknown): Promise<PostResult> {
  try {
    if (SHEET_URL) {
      // text/plain 으로 보내야 CORS 사전요청 없이 Apps Script 가 받는다
      const r = await fetch(SHEET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ kind, ...(body as object) }),
      });
      if (!r.ok) return 'retry';
      const out = await r.json().catch(() => ({}));
      return out.error ? 'rejected' : 'ok';
    }
    const r = await fetch(`/api/${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (r.ok) return 'ok';
    return r.status === 400 ? 'rejected' : 'retry';
  } catch {
    return 'retry';
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
  for (const item of q) if ((await post(item.kind, item.body)) === 'retry') rest.push(item);
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(rest));
  } catch {
    /* noop */
  }
}

export async function send(kind: Kind, body: unknown): Promise<'sent' | 'queued' | 'rejected'> {
  const res = await post(kind, body);
  if (res === 'retry') {
    enqueue(kind, body);
    return 'queued';
  }
  return res === 'ok' ? 'sent' : 'rejected';
}

export async function fetchStats(token: string): Promise<Stats> {
  if (SHEET_URL) {
    const r = await fetch(`${SHEET_URL}?token=${encodeURIComponent(token)}`);
    if (!r.ok) throw new Error(`스프레드시트 연결 오류 (${r.status})`);
    const raw = (await r.json()) as RawData & { error?: string };
    if (raw.error) throw new Error(raw.error === 'unauthorized' ? '관리자 토큰이 올바르지 않습니다.' : raw.error);
    return computeStats(raw);
  }
  const r = await fetch('/api/stats', { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(r.status === 401 ? '관리자 토큰이 올바르지 않습니다.' : `서버 오류 (${r.status})`);
  return r.json();
}
