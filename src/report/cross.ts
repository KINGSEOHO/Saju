/**
 * 교차 검증 — 사주 원국 · 대운/세운 · 띠 · MBTI · 직업이 같은 방향을 가리키는 특성을 찾는다.
 *
 * 원칙
 *  - 각 특성(테마)마다 체계별로 "그렇다/아니다"를 따로 판정하고, 일치한 개수를 그대로 보여 준다.
 *  - 체계가 말할 수 없는 테마(예: 직업으로 감정 표현을 판단)는 계산에서 뺀다. 억지로 일치시키지 않는다.
 *  - 사주는 기본 체계라, 사주가 동의하지 않는 테마는 다른 체계가 모두 동의해도 상위에 두지 않는다.
 */
import { ELEMENT_KO, STEMS, pillarHanja, type SajuAnalysis, type TenGodGroup } from '../engine/index.ts';
import { josa } from '../engine/josa.ts';
import { groupOf } from '../engine/tenGods.ts';
import type { Report } from './generate.ts';
import { analyzeJob, type JobAnalysis } from './job.ts';
import { readLuck } from './luckReading.ts';
import { mbtiCross, parseMbti, MBTI_PROFILE, type MbtiCross } from './mbti.ts';
import { plainStatement, wealthCapacity } from './metrics.ts';
import { DECADE_THEME } from './storyKb.ts';
import { ttiOf, type ThemeKey, type TtiInfo } from './tti.ts';

export type SystemId = 'saju' | 'luck' | 'tti' | 'mbti' | 'job';
export const SYSTEM_LABEL: Record<SystemId, string> = { saju: '사주 원국', luck: '대운·세운', tti: '띠', mbti: 'MBTI', job: '직업' };

export interface Evidence {
  system: SystemId;
  agree: boolean;
  text: string;
}

export interface ThemeResult {
  id: string;
  title: string;
  agree: number;
  total: number;
  ratio: number;
  sajuAgree: boolean;
  challenge: boolean;
  evidence: Evidence[];
  text: string;
}

interface Ctx {
  a: SajuAnalysis;
  who: string;
  gp: Record<TenGodGroup, number>;
  el: Record<string, number>;
  tgc: Record<string, number>;
  type: string | null;
  job: JobAnalysis | null;
  dg: TenGodGroup | null;
  dTone: 'good' | 'neutral' | 'bad';
  yg: TenGodGroup | null;
  tti: TtiInfo;
}

type Check = (c: Ctx) => Evidence | null;
const p0 = (n: number) => `${n.toFixed(0)}%`;
const has = (t: string | null, ch: string) => !!t && t.includes(ch);

interface ThemeDef {
  id: string;
  title: string;
  short: string;
  engine: string;
  glance: string;
  challenge?: boolean;
  checks: Partial<Record<SystemId, Check>>;
  text: (c: Ctx) => string;
}

const THEMES: ThemeDef[] = [
  {
    id: 'mind',
    title: '지혜·분석·전문성이 삶의 엔진이다',
    short: '지혜',
    engine: '머리와 지식',
    glance: '머리로 승부하는 지식형 인재',
    checks: {
      saju: (c) => ({ system: 'saju', agree: c.gp['인성'] >= 22 || c.tgc['편인'] + c.tgc['정인'] >= 2 || c.el.water >= 25, text: `인성 ${p0(c.gp['인성'])} · 편인·정인 ${c.tgc['편인'] + c.tgc['정인']}개 · 수 기운 ${p0(c.el.water)} — 배우고 이해하는 힘` }),
      mbti: (c) => (c.type ? { system: 'mbti', agree: has(c.type, 'N') && has(c.type, 'T'), text: `${c.type} — ${has(c.type, 'N') ? '직관(N)' : '감각(S)'}·${has(c.type, 'T') ? '사고(T)' : '감정(F)'}` } : null),
      job: (c) => (c.job ? { system: 'job', agree: ['it', 'edu', 'medical', 'finance', 'public', 'care', 'student'].includes(c.job.category.id), text: `${c.job.category.label} — ${['it', 'edu', 'medical', 'finance', 'public', 'care', 'student'].includes(c.job.category.id) ? '지식과 전문성으로 승부하는 일' : '지식보다 다른 힘을 더 쓰는 일'}` } : null),
      luck: (c) => (c.dg ? { system: 'luck', agree: c.dg === '인성' || c.yg === '인성', text: `지금 대운 ${c.dg}${c.yg ? ` · 올해 ${c.yg}` : ''} — ${c.dg === '인성' || c.yg === '인성' ? '배움의 흐름' : '배움보다 다른 흐름'}` } : null),
    },
    text: (c) =>
      `${c.who}의 가장 강력한 자원은 두뇌예요. 몸으로 버는 것보다 머리로 버는 구조, 즉 기획·분석·전문 지식이 재물과 커리어의 통로가 돼요. 실생활에서는 “아이디어와 판단은 빠른데 실행이 느리다”는 말을 듣기 쉬워요. 이 강점을 살리려면 머릿속의 생각을 문서·발표·결과물로 꺼내는 습관이 꼭 필요해요.`,
  },
  {
    id: 'order',
    title: '원칙·책임·체계를 중시한다',
    short: '원칙',
    engine: '원칙과 책임감',
    glance: '원칙과 책임으로 신뢰를 얻는 사람',
    checks: {
      saju: (c) => ({ system: 'saju', agree: c.gp['관성'] >= 22 || (c.tgc['정관'] >= 1 && c.el.earth + c.el.metal >= 40), text: `관성 ${p0(c.gp['관성'])} · 정관 ${c.tgc['정관']}개 — 규칙과 책임의 기운` }),
      mbti: (c) => (c.type ? { system: 'mbti', agree: has(c.type, 'J'), text: `${c.type} — ${has(c.type, 'J') ? '계획(J)형' : '즉흥(P)형'}` } : null),
      job: (c) => (c.job ? { system: 'job', agree: ['public', 'office', 'finance', 'tech', 'medical'].includes(c.job.category.id), text: `${c.job.category.label} — ${['public', 'office', 'finance', 'tech', 'medical'].includes(c.job.category.id) ? '규칙과 절차가 분명한 일' : '규칙보다 자율이 큰 일'}` } : null),
      luck: (c) => (c.dg ? { system: 'luck', agree: c.dg === '관성' || c.yg === '관성', text: `지금 대운 ${c.dg}${c.yg ? ` · 올해 ${c.yg}` : ''} — ${c.dg === '관성' || c.yg === '관성' ? '책임과 자리의 흐름' : '다른 흐름'}` } : null),
    },
    text: (c) =>
      `${c.who}은 어떤 상황에서도 규칙과 품격을 먼저 챙겨요. 이 기질이 장점이 되면 신뢰받는 전문가가 되지만, 지나치면 완벽주의와 자기 비판으로 이어져요. 실생활에서는 “믿을 수 있는 사람”이라는 평가와 “왜 그렇게 스스로에게 가혹하냐”는 말을 함께 듣기 쉬워요. 하루에 한 가지씩 “오늘 충분히 잘한 것”을 적는 습관이 자기 비판을 조절하는 데 효과적이에요.`,
  },
  {
    id: 'express',
    title: '재능·표현·창의로 자신을 드러낸다',
    short: '재능',
    engine: '재능과 표현력',
    glance: '재능과 표현으로 빛나는 사람',
    checks: {
      saju: (c) => ({ system: 'saju', agree: c.gp['식상'] >= 22 || c.tgc['식신'] + c.tgc['상관'] >= 2, text: `식상 ${p0(c.gp['식상'])} · 식신·상관 ${c.tgc['식신'] + c.tgc['상관']}개 — 만들고 표현하는 기운` }),
      mbti: (c) => (c.type ? { system: 'mbti', agree: has(c.type, 'N') && (has(c.type, 'P') || has(c.type, 'E')), text: `${c.type} — ${has(c.type, 'N') && (has(c.type, 'P') || has(c.type, 'E')) ? '아이디어를 밖으로 펼치는 유형' : '표현보다 다른 힘이 앞서는 유형'}` } : null),
      job: (c) => (c.job ? { system: 'job', agree: ['creative', 'sales', 'service', 'edu', 'sports'].includes(c.job.category.id), text: `${c.job.category.label} — ${['creative', 'sales', 'service', 'edu', 'sports'].includes(c.job.category.id) ? '표현과 결과물로 평가받는 일' : '표현보다 정확성이 중요한 일'}` } : null),
      luck: (c) => (c.dg ? { system: 'luck', agree: c.dg === '식상' || c.yg === '식상', text: `지금 대운 ${c.dg}${c.yg ? ` · 올해 ${c.yg}` : ''} — ${c.dg === '식상' || c.yg === '식상' ? '재능을 펼치는 흐름' : '다른 흐름'}` } : null),
    },
    text: (c) =>
      `${c.who}에게는 생각과 감각을 결과물로 만들어 내는 힘이 있어요. 말·글·디자인·기획처럼 “내가 만든 것”으로 평가받는 자리에서 가장 빛나고, 반복적인 일만 계속하면 이유 없이 지쳐요. 다만 하고 싶은 것이 많아 벌여 놓은 일이 쌓이기 쉬우니, 동시에 진행하는 일을 두세 개로 제한하는 것이 재능을 성과로 바꾸는 비결이에요.`,
  },
  {
    id: 'real',
    title: '현실 감각과 성과로 승부한다',
    short: '현실 감각',
    engine: '현실 감각',
    glance: '현실 감각으로 성과를 만드는 사람',
    checks: {
      saju: (c) => ({ system: 'saju', agree: c.gp['재성'] >= 22 || c.tgc['편재'] + c.tgc['정재'] >= 2, text: `재성 ${p0(c.gp['재성'])} · 편재·정재 ${c.tgc['편재'] + c.tgc['정재']}개 — 돈과 현실의 기운` }),
      mbti: (c) => (c.type ? { system: 'mbti', agree: has(c.type, 'S') && (has(c.type, 'T') || has(c.type, 'J')), text: `${c.type} — ${has(c.type, 'S') ? '감각(S)' : '직관(N)'} 중심` } : null),
      job: (c) => (c.job ? { system: 'job', agree: ['finance', 'sales', 'business', 'property', 'travel'].includes(c.job.category.id), text: `${c.job.category.label} — ${['finance', 'sales', 'business', 'property', 'travel'].includes(c.job.category.id) ? '숫자와 성과로 평가받는 일' : '성과보다 다른 기준이 큰 일'}` } : null),
      luck: (c) => (c.dg ? { system: 'luck', agree: c.dg === '재성' || c.yg === '재성', text: `지금 대운 ${c.dg}${c.yg ? ` · 올해 ${c.yg}` : ''} — ${c.dg === '재성' || c.yg === '재성' ? '성과를 거두는 흐름' : '다른 흐름'}` } : null),
    },
    text: (c) =>
      `${c.who}은 무엇이 실제로 이득이 되는지를 빠르게 계산해요. 막연한 이상보다 숫자와 결과를 믿고, 기회가 보이면 움직이는 편이에요. 이 감각은 사업·영업·투자에서 큰 무기가 되지만, 욕심이 앞서면 무리한 확장으로 이어지기 쉬워요. 큰돈이 걸린 결정은 하루를 두고, 손실 한도를 미리 정해 두는 습관이 이 강점을 지켜 줘요.`,
  },
  {
    id: 'self',
    title: '스스로 길을 만드는 추진력이 있다',
    short: '추진력',
    engine: '추진력과 자립심',
    glance: '스스로 길을 여는 개척형',
    checks: {
      saju: (c) => ({ system: 'saju', agree: c.gp['비겁'] >= 25 || c.a.strength.score >= 62, text: `비겁 ${p0(c.gp['비겁'])} · 신강약 ${p0(c.a.strength.score)} — 자립과 주도의 기운` }),
      mbti: (c) => (c.type ? { system: 'mbti', agree: has(c.type, 'E') && has(c.type, 'T'), text: `${c.type} — ${has(c.type, 'E') && has(c.type, 'T') ? '앞에서 이끄는 유형' : '주도보다 다른 방식이 편한 유형'}` } : null),
      job: (c) => (c.job ? { system: 'job', agree: ['business', 'sports'].includes(c.job.category.id) || c.job.freelance || c.job.category.id === 'freelance', text: `${c.job.category.label} — ${['business', 'sports'].includes(c.job.category.id) || c.job.freelance ? '내 힘으로 뛰는 일' : '조직 안에서 하는 일'}` } : null),
      luck: (c) => (c.dg ? { system: 'luck', agree: c.dg === '비겁' || c.yg === '비겁', text: `지금 대운 ${c.dg}${c.yg ? ` · 올해 ${c.yg}` : ''} — ${c.dg === '비겁' || c.yg === '비겁' ? '독립의 흐름' : '다른 흐름'}` } : null),
    },
    text: (c) =>
      `${c.who}은 남이 정해 준 길보다 스스로 정한 길에서 힘이 나요. 경쟁이 붙으면 오히려 실력이 올라가고, 어려운 상황에서도 쉽게 물러서지 않아요. 다만 고집이 세져 조언을 간섭으로 듣거나, 혼자 다 하려다 지치는 일이 반복되기 쉬워요. 믿을 만한 한두 사람에게 결정을 미리 들려주는 습관이 추진력을 지켜 줘요.`,
  },
  {
    id: 'care',
    title: '사람을 돌보고 마음을 읽는다',
    short: '따뜻함',
    engine: '사람을 향한 마음',
    glance: '사람의 마음을 얻는 공감형',
    checks: {
      saju: (c) => ({ system: 'saju', agree: c.tgc['정인'] + c.tgc['식신'] >= 2 || c.el.wood + c.el.fire >= 40, text: `정인·식신 ${c.tgc['정인'] + c.tgc['식신']}개 · 목+화 ${p0(c.el.wood + c.el.fire)} — 돌봄의 기운` }),
      mbti: (c) => (c.type ? { system: 'mbti', agree: has(c.type, 'F'), text: `${c.type} — ${has(c.type, 'F') ? '감정(F)' : '사고(T)'} 판단` } : null),
      job: (c) => (c.job ? { system: 'job', agree: ['medical', 'edu', 'care', 'service', 'home'].includes(c.job.category.id), text: `${c.job.category.label} — ${['medical', 'edu', 'care', 'service', 'home'].includes(c.job.category.id) ? '사람을 돌보는 일' : '사람보다 일 자체에 집중하는 일'}` } : null),
    },
    text: (c) =>
      `${c.who}은 사람의 표정과 분위기를 먼저 읽어요. 곁에 있으면 편하다는 말을 자주 듣고, 누군가 힘들어하면 그냥 지나치지 못해요. 이 따뜻함은 사람을 얻는 가장 큰 힘이지만, 남의 감정을 떠안아 정작 자신이 지치는 일이 잦아요. 도와줄 수 있는 선을 미리 정해 두는 것이 오래 따뜻할 수 있는 방법이에요.`,
  },
  {
    id: 'move',
    title: '변화와 새로움을 좇는다',
    short: '변화',
    engine: '변화를 향한 호기심',
    glance: '변화 속에서 기회를 찾는 탐험형',
    checks: {
      saju: (c) => ({ system: 'saju', agree: c.a.sinsal.some((s) => s.name.includes('역마')) || c.tgc['편재'] + c.tgc['상관'] >= 2 || c.el.water >= 28, text: `역마·편재·상관·수 기운 — ${c.a.sinsal.some((s) => s.name.includes('역마')) ? '역마살이 있어 ' : ''}움직이며 기회를 찾는 기운` }),
      mbti: (c) => (c.type ? { system: 'mbti', agree: has(c.type, 'P'), text: `${c.type} — ${has(c.type, 'P') ? '즉흥(P)형' : '계획(J)형'}` } : null),
      job: (c) => (c.job ? { system: 'job', agree: ['travel', 'sales', 'creative'].includes(c.job.category.id) || c.job.freelance, text: `${c.job.category.label} — ${['travel', 'sales', 'creative'].includes(c.job.category.id) || c.job.freelance ? '변화가 많은 일' : '안정적인 일'}` } : null),
      luck: (c) => {
        const d = c.a.currentDaeun;
        if (!d) return null;
        const change = d.flags.some((f) => f.startsWith('월지충') || f.startsWith('일지충'));
        return { system: 'luck', agree: change, text: change ? '지금 대운에 충(沖) — 환경이 크게 바뀌는 흐름' : '지금 대운에 큰 충은 없음' };
      },
    },
    text: (c) =>
      `${c.who}은 같은 자리에 오래 머물면 답답함을 느껴요. 새로운 곳, 새로운 사람, 새로운 방식에서 기회를 찾는 감각이 있고, 이동과 변화가 많은 환경에서 오히려 실력이 살아나요. 다만 한곳에 뿌리내려야 쌓이는 것들(경력·인맥·자산)을 놓치기 쉬우니, 바꾸는 것과 지키는 것을 하나씩 정해 두세요.`,
  },
  {
    id: 'steady',
    title: '꾸준함과 안정으로 쌓아 간다',
    short: '꾸준함',
    engine: '꾸준함',
    glance: '꾸준히 쌓아 결국 이기는 축적형',
    checks: {
      saju: (c) => ({ system: 'saju', agree: c.el.earth >= 28 || c.tgc['정재'] + c.tgc['정인'] + c.tgc['정관'] >= 3, text: `토 기운 ${p0(c.el.earth)} · 정재·정인·정관 ${c.tgc['정재'] + c.tgc['정인'] + c.tgc['정관']}개 — 안정의 기운` }),
      mbti: (c) => (c.type ? { system: 'mbti', agree: has(c.type, 'S') && has(c.type, 'J'), text: `${c.type} — ${has(c.type, 'S') && has(c.type, 'J') ? '안정을 지키는 유형' : '변화를 즐기는 쪽'}` } : null),
      job: (c) => (c.job ? { system: 'job', agree: ['public', 'office', 'finance', 'home'].includes(c.job.category.id), text: `${c.job.category.label} — ${['public', 'office', 'finance', 'home'].includes(c.job.category.id) ? '안정적으로 쌓아 가는 일' : '변화가 큰 일'}` } : null),
    },
    text: (c) =>
      `${c.who}은 화려한 한 방보다 꾸준한 축적으로 결국 이기는 사람이에요. 약속과 루틴을 지키는 힘이 크고, 시간이 지날수록 신뢰와 자산이 쌓여요. 다만 변화가 필요한 순간에도 익숙한 방식을 고집하다 타이밍을 놓치기 쉬워요. 1년에 한 번은 “바꿔야 할 것 한 가지”를 정해 실험해 보세요.`,
  },
  {
    id: 'feel',
    title: '감정을 드러내지 않아 오해받기 쉽다',
    short: '감정 표현',
    engine: '',
    glance: '감정 표현의 부재가 관계와 건강을 흔드는 핵심 변수',
    challenge: true,
    checks: {
      saju: (c) => ({ system: 'saju', agree: c.gp['식상'] < 12 || c.el.metal + c.el.water >= 45 || c.gp['관성'] >= 35, text: `식상 ${p0(c.gp['식상'])} · 금+수 ${p0(c.el.metal + c.el.water)} · 관성 ${p0(c.gp['관성'])} — 감정을 안으로 누르는 구조` }),
      mbti: (c) => (c.type ? { system: 'mbti', agree: has(c.type, 'I') && has(c.type, 'T'), text: `${c.type} — ${has(c.type, 'I') && has(c.type, 'T') ? '감정을 밖으로 잘 꺼내지 않는 유형' : '감정 표현이 비교적 자연스러운 유형'}` } : null),
    },
    text: (c) =>
      `여러 체계가 함께 경고하는 지점이에요. 속에는 깊은 감수성과 따뜻함이 있지만, 그것이 밖으로 잘 나오지 않아 “차갑다”, “속을 모르겠다”는 인상을 줘요. 연애에서는 상대가 온도 변화를 알아차리지 못해 멀어지고, 직장에서는 신뢰는 받지만 가까이 다가오지 못하게 만들어요. ${c.who}에게는 감정이 생겼을 때 3일 이내에 글로 쓰거나 믿는 한 사람에게 말하는 습관이 필요해요. 억누른 감정은 결국 몸의 증상으로 나타나요.`,
  },
  {
    id: 'worry',
    title: '생각이 많아 실행이 늦어진다',
    short: '실행',
    engine: '',
    glance: '생각이 실행을 앞지르는 것이 가장 큰 변수',
    challenge: true,
    checks: {
      saju: (c) => ({ system: 'saju', agree: c.gp['인성'] >= 35 || c.el.water >= 32, text: `인성 ${p0(c.gp['인성'])} · 수 기운 ${p0(c.el.water)} — 생각이 깊고 많은 구조` }),
      mbti: (c) => (c.type ? { system: 'mbti', agree: has(c.type, 'I') && has(c.type, 'N'), text: `${c.type} — ${has(c.type, 'I') && has(c.type, 'N') ? '머릿속 세계가 넓은 유형' : '생각보다 행동이 빠른 편'}` } : null),
      luck: (c) => (c.dg ? { system: 'luck', agree: c.dg === '인성' && c.dTone === 'bad', text: c.dg === '인성' && c.dTone === 'bad' ? '지금 대운: 생각만 많고 실행이 막히는 흐름' : '지금 대운은 실행을 막지 않음' } : null),
    },
    text: (c) =>
      `${c.who}은 시작하기 전에 충분히 알아보고 준비하는 사람이에요. 그 신중함이 큰 실수를 막아 주지만, “조금만 더 준비하고”가 반복되면 기회가 지나가요. 준비가 70% 됐을 때 일단 시작하고, 나머지는 하면서 채운다는 원칙을 세워 두세요.`,
  },
  {
    id: 'spend',
    title: '돈이 새는 구조를 조심해야 한다',
    short: '재물 관리',
    engine: '',
    glance: '들어온 돈을 지키는 구조가 재물운을 가르는 변수',
    challenge: true,
    checks: {
      saju: (c) => {
        const cap = wealthCapacity(c.a);
        return { system: 'saju', agree: cap === '작음' || cap === '부담' || c.gp['비겁'] >= 30, text: `재물 그릇 ‘${cap}’ · 비겁 ${p0(c.gp['비겁'])} — ${cap === '작음' ? '돈을 붙잡는 힘이 약한 구조' : cap === '부담' ? '돈이 내 힘보다 큰 구조' : '나눠 갖는 사람이 많은 구조'}` };
      },
      mbti: (c) => (c.type ? { system: 'mbti', agree: has(c.type, 'P') && (has(c.type, 'S') || has(c.type, 'F')), text: `${c.type} — ${has(c.type, 'P') ? '즉흥적인 지출이 생기기 쉬운 유형' : '계획적으로 쓰는 유형'}` } : null),
      luck: (c) => {
        if (!c.dg) return null;
        const bad = (c.dg === '비겁' || c.dg === '재성') && c.dTone === 'bad';
        return { system: 'luck', agree: bad, text: bad ? '지금 대운: 지출과 손재를 조심할 흐름' : '지금 대운에 큰 손재 신호는 없음' };
      },
    },
    text: (c) =>
      `${c.who}의 재물은 “버는 힘”보다 “지키는 구조”에서 갈려요. 수입이 늘어도 사람·기분·충동으로 새는 돈이 많아 손에 남는 것이 적어지기 쉬워요. 월급날 저축과 고정 지출이 자동으로 빠져나가게 만들고, 돈거래와 보증은 원칙적으로 하지 않는 것이 가장 확실한 방어예요.`,
  },
];

const OUTER: Record<string, string> = {
  비견: '당당하고 자기 기준이 분명한 외면',
  겁재: '활달하고 승부욕이 보이는 외면',
  식신: '여유롭고 편안한 외면',
  상관: '재치 있고 말 잘하는 외면',
  편재: '시원시원하고 사교적인 외면',
  정재: '꼼꼼하고 성실한 외면',
  편관: '강단 있고 카리스마 있는 외면',
  정관: '반듯하고 신뢰감 있는 외면',
  편인: '독특하고 생각이 깊어 보이는 외면',
  정인: '온화하고 점잖은 외면',
};
const INNER: Record<string, string> = {
  비견: '고집과 자존심이 강한 내면',
  겁재: '누구에게도 지기 싫은 내면',
  식신: '편안함과 즐거움을 원하는 내면',
  상관: '예민하고 인정받고 싶은 내면',
  편재: '자유롭고 욕심 많은 내면',
  정재: '안정과 확실함을 원하는 내면',
  편관: '스스로를 몰아붙이는 내면',
  정관: '바르게 살고 싶은 내면',
  편인: '예민하고 혼자만의 생각이 많은 내면',
  정인: '기대고 싶고 인정을 갈망하는 내면',
};

const DM_ONE: Record<number, string> = {
  0: '곧게 뻗어 길을 여는 사람',
  1: '유연하게 휘어 결국 닿는 사람',
  2: '숨김없이 밝게 비추는 사람',
  3: '가까운 사람을 깊이 비추는 사람',
  4: '흔들림 없이 버티는 사람',
  5: '사람을 길러 내는 사람',
  6: '단련될수록 강해지는 사람',
  7: '디테일로 빛나는 사람',
  8: '크게 흐르며 넓히는 사람',
  9: '조용히 스며들어 꿰뚫는 사람',
};

const ARCHETYPE: Record<string, string> = { mind: '전문가형', order: '원칙형', express: '표현형', real: '실리형', self: '개척형', care: '공감형', move: '탐험형', steady: '축적형' };
const TEMPERAMENT = (t: string) => (t[1] === 'N' ? (t[2] === 'T' ? '지략가' : '이상가') : t[3] === 'J' ? '관리자' : '모험가');
const GROUP_PERSONA: Record<TenGodGroup, string> = { 비겁: '개척자', 식상: '창작가', 재성: '사업가', 관성: '리더', 인성: '학자' };
const GROUP_WORD: Record<TenGodGroup, string> = { 비겁: '독립', 식상: '표현', 재성: '수확', 관성: '도약', 인성: '축적' };
const CHALLENGE_TAG: Record<string, string> = { feel: '#감정언어화과제', worry: '#생각보다실행', spend: '#새는돈막기' };
const CHALLENGE_PHRASE: Record<string, string> = { feel: '감정을 꺼내는 것', worry: '생각을 행동으로 옮기는 것', spend: '들어온 돈을 지키는 것' };

export interface IdentityCard {
  headline: string;
  subline: string;
  outer: string;
  inner: string;
  tags: string[];
  cards: { icon: string; system: string; line: string }[];
  consensus: string;
}

export interface CrossReport {
  systems: SystemId[];
  themes: ThemeResult[];
  card: IdentityCard;
  glance: string[];
  summary: string;
  mbti: MbtiCross | null;
  job: JobAnalysis | null;
  tti: TtiInfo;
}

function hashIdx(n: number, len: number) {
  return ((n * 2654435761) >>> 0) % len;
}

export function crossReport(a: SajuAnalysis, report: Report): CrossReport {
  const who = a.input.name ? `${a.input.name}님` : '당신';
  const type = parseMbti(a.input.mbti);
  const job = a.input.job ? analyzeJob(a, report, a.input.job) : null;
  const summarySec = report.sections.find((s) => s.id === 'summary');
  const weakItem = summarySec?.blocks.find((b) => b.heading.includes('약점'))?.items[0];
  const mainWeak = weakItem ? plainStatement(weakItem.text) : undefined;
  const mbti = type ? mbtiCross(a, type, mainWeak) : null;
  const d = a.currentDaeun;
  const year = a.seun.find((s) => s.year === a.currentSajuYear);
  const ctx: Ctx = {
    a,
    who,
    gp: a.elements.groupPercent,
    el: a.elements.percent as unknown as Record<string, number>,
    tgc: a.elements.tenGodCount as unknown as Record<string, number>,
    type,
    job,
    dg: d ? groupOf(d.stemTenGod) : null,
    dTone: d ? (d.score >= 58 ? 'good' : d.score < 42 ? 'bad' : 'neutral') : 'neutral',
    yg: year ? groupOf(year.stemTenGod) : null,
    tti: ttiOf(a),
  };
  const tti = ctx.tti;
  const systems: SystemId[] = ['saju', 'luck', 'tti', ...(type ? (['mbti'] as SystemId[]) : []), ...(job ? (['job'] as SystemId[]) : [])];
  // 띠: 분명히 가리키는 특성(yes)·분명히 아닌 특성(no)만 판정하고 나머지는 빼고 계산한다
  const ttiCheck = (id: string): Evidence | null => {
    const k = id as ThemeKey;
    if (tti.yes.includes(k)) return { system: 'tti', agree: true, text: `${tti.name}(${tti.nick}) — ${tti.keywords.join('·')}` };
    if (tti.no.includes(k)) return { system: 'tti', agree: false, text: `${tti.name}(${tti.nick}) — 이 특성과는 거리가 먼 띠` };
    return null;
  };

  const all: ThemeResult[] = THEMES.map((t) => {
    const evidence = [...(Object.keys(t.checks) as SystemId[]).map((s) => t.checks[s]!(ctx)), ttiCheck(t.id)].filter((e): e is Evidence => !!e);
    const agree = evidence.filter((e) => e.agree).length;
    const sajuAgree = evidence.find((e) => e.system === 'saju')?.agree ?? false;
    return { id: t.id, title: t.title, agree, total: evidence.length, ratio: evidence.length ? agree / evidence.length : 0, sajuAgree, challenge: !!t.challenge, evidence, text: t.text(ctx) };
  });
  const rank = (x: ThemeResult) => (x.sajuAgree ? 1 : 0) * 10 + x.ratio * 5 + x.agree;
  const positives = all.filter((t) => !t.challenge && t.sajuAgree).sort((x, y) => rank(y) - rank(x));
  const challenges = all.filter((t) => t.challenge && t.sajuAgree && t.agree >= 1).sort((x, y) => rank(y) - rank(x));
  // 사주가 동의하는 강점이 부족하면 가장 일치도가 높은 것으로 채운다
  if (positives.length < 2) positives.push(...all.filter((t) => !t.challenge && !positives.includes(t)).sort((x, y) => rank(y) - rank(x)).slice(0, 2 - positives.length));
  const themes = [...positives.slice(0, 4), ...challenges.slice(0, 2)];

  const def = (id: string) => THEMES.find((t) => t.id === id)!;
  const t1 = def(positives[0].id);
  const t2 = def(positives[1].id);
  const ch = challenges[0] ? def(challenges[0].id) : null;
  const templates = [
    `${josa(t1.short, '으로/로')} 앞서고 ${josa(t2.short, '으로/로')} 버티는 사람`,
    `${josa(t1.short, '으로/로')} 길을 열고 ${josa(t2.short, '으로/로')} 완성하는 사람`,
    `${josa(t1.short, '을/를')} 무기로 ${josa(t2.short, '을/를')} 쌓아 가는 사람`,
  ];
  const headline = templates[hashIdx(a.pillars.day.index + a.pillars.month.index, templates.length)];
  const subline = ch ? `${josa(t1.engine, '이/가')} 삶의 엔진이지만, ${CHALLENGE_PHRASE[ch.id]}이 진짜 과제` : `${josa(t1.engine, '과/와')} ${josa(t2.engine, '이/가')} 함께 움직이는 구조`;

  const monthStemTg = a.positions.find((p) => p.pos === 'month')!.stemTenGod as string;
  const dayBranchTg = a.positions.find((p) => p.pos === 'day')!.branchTenGod as string;
  const outer = OUTER[monthStemTg] ?? OUTER[a.positions.find((p) => p.pos === 'year')!.stemTenGod as string] ?? '차분한 외면';
  const inner = INNER[dayBranchTg];

  // 해시태그
  const gp = a.elements.groupPercent;
  const topGroup = (Object.keys(gp) as TenGodGroup[]).sort((x, y) => gp[y] - gp[x])[0];
  const ageNow = (a.now - a.pillars.conversion.utcMs) / (365.2422 * 86400000);
  const upcoming = a.daeun.list.filter((x) => x.startAge + 10 > ageNow);
  const pool = upcoming.length ? upcoming : a.daeun.list;
  const best = pool.reduce((m, x) => (x.score > m.score ? x : m), pool[0]);
  const decade = Math.max(10, Math.floor((best.startAge + 3) / 10) * 10);
  const tags = [
    `#${ARCHETYPE[t1.id]}${type ? TEMPERAMENT(type) : GROUP_PERSONA[topGroup]}`,
    ch ? CHALLENGE_TAG[ch.id] : '#균형이과제',
    `#${decade}대${GROUP_WORD[groupOf(best.stemTenGod)]}이승부처`,
  ];

  // 체계별 한 줄
  const yRead = year ? readLuck(a, year, '해', year.combined) : null;
  const ys = a.yongsin.yongsin;
  const cards: IdentityCard['cards'] = [
    { icon: '命', system: '사주 원국', line: `${pillarHanja(a.pillars.day)}일주 · ${DM_ONE[a.pillars.day.stem]}` },
    { icon: '氣', system: '오행·용신', line: `${ELEMENT_KO[ys]} 기운을 채울수록 풀리는 사주` },
    { icon: '運', system: '지금의 대운', line: d ? `${Math.floor(d.startAge)}세부터 ${DECADE_THEME[groupOf(d.stemTenGod)].label}의 10년` : '첫 대운을 기다리는 시기' },
    { icon: '年', system: `${a.currentSajuYear}년`, line: yRead ? yRead.headline : '올해의 흐름' },
    { icon: tti.hanja, system: '띠', line: `${tti.name} · ${tti.nick} · ${tti.thisYear.line}` },
  ];
  if (mbti) cards.push({ icon: '性', system: 'MBTI', line: `${mbti.type} ${MBTI_PROFILE[mbti.type].nick} · 사주와 ${mbti.agree}/4 일치` });
  if (job) cards.push({ icon: '業', system: '직업', line: job.fit ? `${job.category.id === 'other' ? job.input : job.category.label} · 적합도 ${job.fit.score}` : `${job.category.label} · ${job.now.title.replace(/^지금은 /, '')}` });

  const lead = all.find((t) => t.id === t1.id)!;
  const consensus = `${lead.total}개 체계 중 ${lead.agree}개가 ‘${t1.short}’을 가리켜요`.replace(`‘${t1.short}’을`, josa(`‘${t1.short}’`, '을/를'));

  const glance = [t1.glance, t2.glance, ch ? ch.glance : `지금은 ${d ? DECADE_THEME[groupOf(d.stemTenGod)].label : '준비'}의 시기 — 강점을 결과로 바꿀 때`];

  // 종합 요약
  const evid = (t: ThemeResult) =>
    t.evidence
      .filter((e) => e.agree)
      .map((e) => (e.system === 'saju' ? `사주의 ${e.text.split(' — ')[0]}` : e.system === 'mbti' ? `MBTI ${type}` : e.system === 'job' ? `직업(${job?.category.label})` : e.system === 'tti' ? tti.name : '지금의 대운'))
      .join(', ');
  const parts: string[] = [];
  parts.push(`${who}은 ${josa(t1.glance, '이에요/예요')}. ${evid(lead)}${lead.agree >= 2 ? '이 같은 방향을 가리켜요' : '에서 이 특성이 드러나요'}.`);
  const second = all.find((t) => t.id === t2.id)!;
  parts.push(`여기에 ${t2.glance.replace(/사람$|형$/, (m) => m)}의 면모가 더해져요(${second.agree}/${second.total} 일치).`);
  if (ch) {
    const chr = all.find((t) => t.id === ch.id)!;
    parts.push(`반면 ${chr.agree >= 2 ? '여러 체계가 함께' : '사주가'} 경고하는 약점이 있는데, 바로 ${josa(CHALLENGE_PHRASE[ch.id], '이에요/예요')}.`);
  }
  if (d) parts.push(`만 ${Math.floor(ageNow)}세인 지금은 ${DECADE_THEME[groupOf(d.stemTenGod)].label}의 10년(${d.startYear}~${d.endYear})을 지나고 있어요.`);
  if (job) parts.push(`직업 면에서는 ${josa(job.headline, '이에요/예요')}.`);
  if (mbti) parts.push(`MBTI(${mbti.type})와 사주는 네 가지 축 중 ${mbti.agree}개가 같은 방향이에요.`);
  parts.push(`띠로는 ${tti.name}(${tti.nick})이고, ${a.currentSajuYear}년은 ${tti.thisYear.line === '무난한 해' ? '띠로 보아 무난한 해' : `‘${tti.thisYear.line}’인 해`}예요.`);
  parts.push('강점이 뚜렷한 만큼 약점도 분명한 구조이므로, 강점을 살리는 것만큼 약점을 보완하는 것이 실제 삶의 질을 가르는 분기점이 돼요.');

  return {
    systems,
    themes,
    card: { headline, subline, outer, inner, tags, cards, consensus },
    glance,
    summary: parts.join(' '),
    mbti,
    job,
    tti,
  };
}

/** 사주 원국 일간 이름 (예: 경금) — 카드 등에서 사용 */
export function dmName(a: SajuAnalysis): string {
  const s = STEMS[a.pillars.day.stem];
  return `${s.ko}${ELEMENT_KO[s.element]}`;
}
