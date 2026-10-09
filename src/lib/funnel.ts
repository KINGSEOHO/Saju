/**
 * 단계별 측정 — 사이트에 들어온 사람이 결제까지 단계마다 몇 명 남는지 센다.
 *   접속 → 결과 봄 → 고민 리포트 펼침 → 상세나 가격 화면까지 봄 → 결제 버튼 → 결제 완료
 *
 * 보내는 것: 단계 이름 · 어느 고민인지(item) · 고른 선택지(offer) · 금액(amount) · 이 기기의 무작위 번호(sessionId)뿐.
 * 이름·생년월일·출생 시각·상대 정보는 보내지 않는다.
 * 같은 단계·같은 항목은 한 번 방문(탭)에 한 번만 센다 — 펼쳤다 접었다 해도 한 번.
 * 시안(PAYWALL_DEMO)에서는 어디에도 보내지 않고, 이 기기 안에만 남겨 시안 상자에서 확인한다.
 */
import { PAYWALL_DEMO } from '../config/plans.ts';
import { send, sessionId } from './api.ts';
import { sourceMeta } from './source.ts';

export type Step = 'visit' | 'analyze' | 'concern_open' | 'match_result' | 'detail_view' | 'lock_view' | 'pay_click' | 'paid';
/** 서버·시트가 받는 이벤트 종류 (docs/google-apps-script.gs, server/index.mjs와 같게) */
export const FUNNEL_EVENTS: Step[] = ['visit', 'analyze', 'concern_open', 'match_result', 'detail_view', 'lock_view', 'pay_click', 'paid'];

export type FunnelMeta = Record<string, string | number | boolean>;

export interface FunnelLogItem {
  step: Step;
  meta: FunnelMeta;
  at: number;
}

const SENT_KEY = 'mg_funnel_sent';
const LOG_KEY = 'mg_funnel_log';

// 저장이 안 되는 환경(사생활 보호 창 등)에서도 이번 화면 안에서는 한 번만 세도록
const memory = new Set<string>();
/** 시안에서 저장이 안 될 때 쓰는 기록 */
const memLog: FunnelLogItem[] = [];

function seen(key: string): boolean {
  if (memory.has(key)) return true;
  try {
    const list = JSON.parse(sessionStorage.getItem(SENT_KEY) ?? '[]') as string[];
    if (list.includes(key)) {
      memory.add(key);
      return true;
    }
    sessionStorage.setItem(SENT_KEY, JSON.stringify([...list, key].slice(-200)));
  } catch {
    /* 이번 화면에서만 */
  }
  memory.add(key);
  return false;
}

/**
 * 한 단계를 남긴다. once = false면 같은 단계라도 매번 남긴다 (결과 봄 · 결제 완료).
 * 실패해도 화면에는 아무 영향이 없다.
 */
export function track(step: Step, meta: FunnelMeta = {}, once = true): void {
  const key = [step, meta.item, meta.offer].filter((x) => x !== undefined && x !== '').join(':');
  if (once && seen(key)) return;
  if (PAYWALL_DEMO) {
    const item = { step, meta, at: Date.now() };
    memLog.push(item);
    try {
      sessionStorage.setItem(LOG_KEY, JSON.stringify([...funnelLog(), item].slice(-60)));
    } catch {
      /* 이번 화면에서만 (memLog) */
    }
    window.dispatchEvent(new Event('mg-funnel'));
    return;
  }
  void send('events', { sessionId: sessionId(), type: step, meta: { ...meta, ...sourceMeta() } });
}

/** 시안 전용 — 이 기기에서 남긴 단계 (보내지 않은 것) */
export function funnelLog(): FunnelLogItem[] {
  try {
    const raw = sessionStorage.getItem(LOG_KEY);
    return raw ? (JSON.parse(raw) as FunnelLogItem[]) : [];
  } catch {
    return [...memLog];
  }
}

/** 시안 전용 — 처음 들어온 사람처럼 다시 세기 */
export function clearFunnel(): void {
  memory.clear();
  memLog.length = 0;
  try {
    sessionStorage.removeItem(SENT_KEY);
    sessionStorage.removeItem(LOG_KEY);
  } catch {
    /* noop */
  }
  window.dispatchEvent(new Event('mg-funnel'));
}

/** 화면·관리 화면에 쓰는 이름 */
export const STEP_LABEL: Record<Step, string> = {
  visit: '사이트 접속',
  analyze: '결과 봄',
  concern_open: '고민 리포트 펼침',
  match_result: '궁합·재회 결과 봄',
  detail_view: '상세까지 봄',
  lock_view: '가격 화면 봄',
  pay_click: '결제 버튼 누름',
  paid: '결제 완료',
};

export const ITEM_LABEL: Record<string, string> = {
  career: '이직·진로',
  love: '연애·결혼',
  money: '돈',
  exam: '시험·합격',
  year: '신년운세',
  match: '궁합·재회',
  compat: '궁합',
  reunion: '재회',
};
