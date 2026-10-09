/**
 * 리뷰·피드백 API 클라이언트
 * - Google 스프레드시트(SHEET_URL) 또는 자체 서버(/api)로 전송
 * - 전송 실패 시 브라우저 localStorage 에 보관했다가 다음 방문 때 재전송
 */
import { SHEET_URL } from '../config/backend.ts';
import type { SajuAnalysis } from '../engine/index.ts';
import { matchJob } from '../report/job.ts';
import { parseMbti } from '../report/mbti.ts';
import { sourceMeta } from './source.ts';
import { computeFunnel, computeStats, type RawData, type Stats } from './stats.ts';

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
    // 지인 리뷰 링크로 들어온 기기면 표시 (관리 화면에서 따로 본다)
    ...sourceMeta(),
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
      // 스크립트가 { ok: true }로 확인해 줄 때만 저장된 것으로 본다.
      // 형식 오류(invalid…)는 다시 보내도 소용없고, 그 밖의 오류나 엉뚱한 응답은 나중에 다시 보낸다.
      const out = (await r.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (out?.ok) return 'ok';
      return out?.error && /^(invalid|unknown kind)/.test(out.error) ? 'rejected' : 'retry';
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

let flushing: Promise<number> | null = null;

/** 보내지 못하고 이 기기에 남아 있는 리뷰·평가를 다시 보낸다. 남은 개수를 돌려준다. (동시에 두 번 보내지 않는다) */
export function flushQueue(): Promise<number> {
  flushing ??= doFlush().finally(() => {
    flushing = null;
  });
  return flushing;
}

async function doFlush(): Promise<number> {
  let q: { kind: Kind; body: unknown }[] = [];
  try {
    q = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
  } catch {
    return 0;
  }
  if (!q.length) return 0;
  const rest: typeof q = [];
  for (const item of q) if ((await post(item.kind, item.body)) === 'retry') rest.push(item);
  try {
    // 보내는 사이 새로 쌓인 것은 지우지 않는다
    const now = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as typeof q;
    localStorage.setItem(QUEUE_KEY, JSON.stringify([...rest, ...now.slice(q.length)]));
  } catch {
    /* noop */
  }
  return rest.length;
}

/** 이 기기에 보내지 못하고 남아 있는 개수 */
export function pendingCount(): number {
  try {
    return (JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as unknown[]).length;
  } catch {
    return 0;
  }
}

/** 시트 연결 확인 — 토큰 없이 열어 보면 정상 배포는 {"error":"unauthorized"}를 돌려준다 */
export async function checkConnection(): Promise<{ ok: boolean; target: string; message: string }> {
  const target = SHEET_URL || '/api';
  try {
    if (SHEET_URL) {
      const r = await fetch(SHEET_URL);
      const out = (await r.json().catch(() => null)) as { error?: string } | null;
      if (out?.error === 'unauthorized') return { ok: true, target, message: '연결돼 있어요. 리뷰와 평가가 이 주소로 저장돼요.' };
      return { ok: false, target, message: `주소는 열리지만 예상과 다른 응답이에요(${r.status}). 최신 코드로 다시 배포했는지 확인해 주세요.` };
    }
    const r = await fetch('/api/health');
    return r.ok ? { ok: true, target, message: '자체 서버에 연결돼 있어요.' } : { ok: false, target, message: `자체 서버가 응답하지 않아요(${r.status}).` };
  } catch {
    return {
      ok: false,
      target,
      message: SHEET_URL
        ? '연결할 수 없어요. 주소가 바뀌었거나, 배포가 보관됐거나, 액세스 권한이 ‘모든 사용자’가 아니에요.'
        : '자체 서버에 연결할 수 없어요.',
    };
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
    if (raw.error) throw new Error(raw.error === 'unauthorized' ? '관리자 토큰이 올바르지 않아요.' : raw.error);
    return computeStats(raw);
  }
  const r = await fetch('/api/stats', { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(r.status === 401 ? '관리자 토큰이 올바르지 않아요.' : `서버 오류 (${r.status})`);
  // 자체 서버는 단계별 측정의 원본(최근 90일)만 넘기고, 계산은 시트와 같은 함수로 한다
  const { funnelEvents, ...rest } = (await r.json()) as Omit<Stats, 'funnel'> & { funnelEvents?: RawData['events'] };
  return { ...rest, funnel: computeFunnel(funnelEvents ?? []) };
}
