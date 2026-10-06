/**
 * 리포트 생성기
 *
 * 모든 문장은 { text, evidence, tone } 으로 만들어 “왜 그렇게 해석했는지”를 함께 보여준다.
 * tone: positive(강점) / negative(약점·리스크) / caution(조건부 주의) / neutral(설명)
 */
import {
  BRANCHES, ELEMENT_HANJA, ELEMENT_KO, ELEMENTS, STEMS, mainStemOf, pillarHanja, pillarKo,
  type Element, type SajuAnalysis, type Seun, type TenGod, type TenGodGroup,
} from '../engine/index.ts';
import { josa } from '../engine/josa.ts';
import { twelveSinsal } from '../engine/sinsal.ts';
import { elementOfGroup, groupOf, groupOfElement } from '../engine/tenGods.ts';
import {
  DAY_MASTER, ELEMENT_JOBS, ELEMENT_ORGAN, GROUP_JOBS, GROUP_MISSING, SPOUSE_PALACE, STAGE_ON_DAY, TEN_GOD_TRAIT,
} from './kb.ts';

export type Tone = 'positive' | 'negative' | 'neutral' | 'caution';
export interface Statement {
  text: string;
  evidence?: string;
  tone: Tone;
  /** 종합 요약 선별 가중치 (원국 구조에서 도출된 개인화 해석일수록 높음) */
  weight?: number;
  /** 중복 제거용 주제 키 */
  topic?: string;
}
export interface ReportBlock {
  heading: string;
  items: Statement[];
}
export interface YearSignal {
  year: number;
  pillar: string;
  score: number;
  verdict: string;
  tone: Tone;
  notes: string[];
}
export type SectionId = 'summary' | 'personality' | 'love' | 'career' | 'wealth' | 'health';
export interface ReportSection {
  id: SectionId;
  title: string;
  headline: string;
  blocks: ReportBlock[];
  timeline?: { title: string; items: YearSignal[] };
}
export interface Report {
  sections: ReportSection[];
  confidenceNotes: string[];
}

const S = (text: string, tone: Tone, evidence?: string, weight = 1, topic?: string): Statement => ({ text, tone, evidence, weight, topic });

const GROUP_LUCK_THEME: Record<TenGodGroup, string> = {
  비겁: '자기 주도·독립·경쟁의 흐름. 동료·형제·경쟁자 문제와 지출이 늘기 쉬움',
  식상: '표현·생산·변화의 흐름. 새로운 일과 창작, 이직 욕구가 커짐',
  재성: '재물·현실·활동의 흐름. 돈의 규모와 활동 반경이 커짐',
  관성: '책임·직위·압박의 흐름. 승진·조직 이슈와 스트레스가 함께 옴',
  인성: '학습·문서·보호의 흐름. 자격·계약·부동산·윗사람 도움, 대신 실행이 느려짐',
};

const ELEMENT_TEMPER: Record<Element, { excess: string; lack: string }> = {
  wood: { excess: '목(木)이 강해 고집과 추진력이 세고, 화가 나면 참지 못하는 면이 있습니다.', lack: '목(木)이 없어 계획을 세우고 꾸준히 성장시키는 힘, 시작하는 용기가 약할 수 있습니다.' },
  fire: { excess: '화(火)가 강해 성급하고 감정 기복이 크며, 말과 행동이 앞서기 쉽습니다.', lack: '화(火)가 없어 표현과 열정이 부족하고, 무기력이나 우울감에 빠지기 쉽습니다.' },
  earth: { excess: '토(土)가 강해 보수적이고 고집스러우며, 걱정과 생각이 많아 행동이 늦습니다.', lack: '토(土)가 없어 중심을 잡는 힘과 신용 관리가 약하고, 관심사가 자주 바뀌기 쉽습니다.' },
  metal: { excess: '금(金)이 강해 냉정하고 비판적이며, 옳고 그름에 집착해 관계가 날카로워지기 쉽습니다.', lack: '금(金)이 없어 결단력과 마무리가 약하고, 정리·정돈·거절에 서툽니다.' },
  water: { excess: '수(水)가 강해 생각이 지나치게 많고 감정이 깊어 우울하거나 방황하기 쉽습니다.', lack: '수(水)가 없어 융통성과 휴식이 부족하고, 조급하게 결론을 내리는 경향이 있습니다.' },
};

// 오행의 묘고(墓庫): 목→未, 화→戌, 토→戌, 금→丑, 수→辰
const TOMB: Record<Element, number> = { wood: 7, fire: 10, earth: 10, metal: 1, water: 4 };

function posKo(list: string[]): string {
  const m: Record<string, string> = { year: '년주', month: '월주', day: '일주', hour: '시주', daeun: '대운', seun: '세운', wolun: '월운' };
  return list.map((p) => m[p] ?? p).join('·');
}

function fmtPct(n: number): string {
  return `${n.toFixed(0)}%`;
}

export function generateReport(a: SajuAnalysis): Report {
  const ds = a.pillars.day.stem;
  const dayEl = STEMS[ds].element;
  const dm = DAY_MASTER[ds];
  const gp = a.elements.groupPercent;
  const tgc = a.elements.tenGodCount;
  const tgh = a.elements.tenGodHidden;
  const strong = a.strength.score >= 48;
  const male = a.input.gender === 'male';
  const roles = a.yongsin.roles;
  const pos = (p: string) => a.positions.find((x) => x.pos === p);
  const dayInfo = pos('day')!;
  const monthInfo = pos('month')!;
  const hasSinsal = (name: string) => a.sinsal.find((s) => s.name === name || s.name.startsWith(name));
  const dayBranch = a.pillars.day.branch;
  const groupCount = (g: TenGodGroup) =>
    (Object.keys(tgc) as TenGod[]).filter((t) => groupOf(t) === g).reduce((acc, t) => acc + tgc[t], 0);
  const elKo = (e: Element) => ELEMENT_KO[e];
  const confidenceNotes: string[] = [];

  if (!a.pillars.timeKnown) confidenceNotes.push('출생 시간 미상: 시주를 제외해 자녀·말년·성향 일부의 신뢰도가 낮습니다.');
  for (const w of a.warnings) if (w.kind !== 'unknownTime') confidenceNotes.push(w.message);
  if (a.yongsin.confidence === '낮음')
    confidenceNotes.push('용신 판단의 확실성이 낮은 명식입니다(중화 또는 억부·조후 충돌). 운의 길흉 점수는 참고용으로 보세요.');

  // -------------------------------------------------------------------------
  // 연도별 신호
  // -------------------------------------------------------------------------
  const yb = a.pillars.year.branch;
  const seunList = a.seun.filter((s) => s.year >= new Date(a.now).getUTCFullYear()).slice(0, 10);
  const spouseGroup: TenGodGroup = male ? '재성' : '관성';
  const hasNatalJeonggwan = tgc['정관'] > 0;

  function yearTags(s: Seun) {
    const groups = [groupOf(s.stemTenGod), groupOf(s.branchTenGod)];
    const ss = [twelveSinsal(yb, s.pillar.branch), twelveSinsal(dayBranch, s.pillar.branch)];
    return {
      groups,
      spouse: groups.includes(spouseGroup),
      dohwa: ss.includes('연살'),
      yeokma: ss.includes('역마살'),
      dayHap: s.flags.some((f) => f.startsWith('일지합')) || s.flags.some((f) => f.startsWith('일간합')),
      dayChung: s.flags.some((f) => f.startsWith('일지충')),
      monthChung: s.flags.some((f) => f.startsWith('월지충')),
      samhyeong: s.flags.some((f) => f.includes('삼형')),
      hyeong: s.flags.some((f) => f.includes(' 형:')),
      sanggwan: s.stemTenGod === '상관' || s.branchTenGod === '상관',
      gwan: groups.includes('관성'),
      siksang: groups.includes('식상'),
      jae: groups.includes('재성'),
      bigeop: groups.includes('비겁'),
      insung: groups.includes('인성'),
      gisinStem: a.yongsin.roles[STEMS[s.pillar.stem].element] === '기신',
      gisinBranch: a.yongsin.roles[STEMS[mainStemOf(s.pillar.branch)].element] === '기신',
    };
  }

  // -------------------------------------------------------------------------
  // 1. 성향
  // -------------------------------------------------------------------------
  const personality: ReportSection = {
    id: 'personality',
    title: '성향',
    headline: `${dm.image} · ${a.strength.level}(${fmtPct(a.strength.score)})`,
    blocks: [],
  };
  {
    const items: Statement[] = [S(dm.core, 'neutral', `일간 ${STEMS[ds].hanja}`)];
    for (const t of dm.strengths) items.push(S(t, 'positive', `일간 ${STEMS[ds].hanja}의 본성`));
    for (const t of dm.weaknesses) items.push(S(t, 'negative', `일간 ${STEMS[ds].hanja}의 본성`));
    items.push(
      S(strong ? dm.whenStrong : dm.whenWeak, 'caution', `${a.strength.level} — 일간 포함 아군 세력 ${fmtPct(a.strength.score)}`),
    );
    personality.blocks.push({ heading: '타고난 기질', items });
  }
  {
    const items: Statement[] = [];
    const mStem = monthInfo.stemTenGod as TenGod;
    const mBranch = monthInfo.branchTenGod;
    const dBranch = dayInfo.branchTenGod;
    items.push(
      S(
        `사회에서 보이는 모습: ${TEN_GOD_TRAIT[mStem].keyword} — ${TEN_GOD_TRAIT[mStem].good}`,
        'neutral',
        `월간 ${STEMS[a.pillars.month.stem].hanja}(${mStem})`,
      ),
    );
    if (mBranch !== mStem)
      items.push(
        S(
          `사회적 환경·직업의 바탕: ${TEN_GOD_TRAIT[mBranch].keyword} 성향이 깔려 있습니다. ${TEN_GOD_TRAIT[mBranch].good}`,
          'neutral',
          `월지 ${BRANCHES[a.pillars.month.branch].hanja}(${mBranch})`,
        ),
      );
    items.push(
      S(
        `가까운 관계·사생활에서의 모습: ${TEN_GOD_TRAIT[dBranch].keyword} — 겉으로 보이는 모습과 ${dBranch === mStem ? '크게 다르지 않습니다' : '다른 면이 있어, 친해진 뒤 “의외”라는 말을 듣기 쉽습니다'}.`,
        'neutral',
        `일지 ${BRANCHES[dayBranch].hanja}(${dBranch})`,
      ),
    );
    personality.blocks.push({ heading: '겉모습과 속마음', items });
  }
  {
    const items: Statement[] = [];
    const groups: TenGodGroup[] = ['비겁', '식상', '재성', '관성', '인성'];
    for (const g of groups) {
      if (gp[g] >= 30) {
        const members = (Object.keys(tgc) as TenGod[]).filter((t) => groupOf(t) === g);
        const dominant = members.sort((x, y) => tgc[y] + tgh[y] * 0.3 - (tgc[x] + tgh[x] * 0.3))[0];
        items.push(S(`${dominant} 기운이 강합니다(${g} ${fmtPct(gp[g])}). ${TEN_GOD_TRAIT[dominant].good}`, 'positive', `${g} 세력 ${fmtPct(gp[g])}`, 3, `excess-${g}`));
        items.push(S(`그러나 과하면: ${TEN_GOD_TRAIT[dominant].excess}`, 'negative', `${g} 세력 ${fmtPct(gp[g])} (30% 이상)`, 3, `excess-${g}`));
      }
    }
    for (const g of groups) {
      if (groupCount(g) === 0 && gp[g] < 8) {
        items.push(S(GROUP_MISSING[g].general, 'negative', `${g}이 천간·지지 본기에 없음 (지장간 포함 ${fmtPct(gp[g])})`, 2.5, `missing-${g}`));
      }
    }
    // 특수 조합
    if (tgc['정관'] > 0 && tgc['편관'] > 0 && gp['관성'] >= 20)
      items.push(S('정관과 편관이 섞여(관살혼잡) 원칙과 반항, 안정 욕구와 도전 욕구가 충돌합니다. 진로·이성 문제에서 우유부단해지기 쉽습니다.', 'negative', `정관 ${tgc['정관']}·편관 ${tgc['편관']}`, 3, 'gwansal'));
    if (tgc['상관'] > 0 && tgc['정관'] > 0)
      items.push(S('상관과 정관이 함께 있어(상관견관) 윗사람·규칙에 대한 반감이 말로 드러나기 쉽습니다. 옳은 말을 해도 방식 때문에 손해를 봅니다.', 'negative', `상관 ${tgc['상관']}·정관 ${tgc['정관']}`, 3, 'sanggwan'));
    if (tgc['편인'] > 0 && tgc['식신'] > 0 && gp['인성'] >= 20)
      items.push(S('편인이 식신을 누르는 구조(도식)입니다. 생각이 실행을 막아, 시작해 놓고 접는 일이 반복되기 쉽습니다.', 'negative', `편인 ${tgc['편인']}·식신 ${tgc['식신']}`, 3, 'dosik'));
    if (gp['식상'] >= 15 && gp['재성'] >= 15)
      items.push(S('식상이 재성을 생하는 구조(식상생재)로, 재능과 아이디어를 현실의 결과물로 바꾸는 감각이 있습니다.', 'positive', `식상 ${fmtPct(gp['식상'])}·재성 ${fmtPct(gp['재성'])}`, 3, 'siksaeng'));
    if (gp['관성'] >= 15 && gp['인성'] >= 15)
      items.push(S('관성이 인성을 생하는 구조(관인상생)로, 조직과 윗사람에게 인정받으며 단계적으로 올라가는 힘이 있습니다.', 'positive', `관성 ${fmtPct(gp['관성'])}·인성 ${fmtPct(gp['인성'])}`, 3, 'gwanin'));
    if (items.length) personality.blocks.push({ heading: '두드러진 기운과 빈자리 (십성)', items });
  }
  {
    const items: Statement[] = [];
    for (const e of a.elements.excessive)
      items.push(S(ELEMENT_TEMPER[e].excess, 'caution', `${elKo(e)} ${fmtPct(a.elements.percent[e])}, ${a.elements.count[e]}글자`));
    for (const e of a.elements.missing) items.push(S(ELEMENT_TEMPER[e].lack, 'negative', `${elKo(e)} 0글자 (지장간 포함 ${fmtPct(a.elements.percent[e])})`));
    if (!items.length) items.push(S('오행이 비교적 고르게 분포해 극단적인 기질 편향은 적습니다. 대신 “확실한 무기”가 무엇인지 스스로 정의해야 존재감이 생깁니다.', 'neutral', '오행 분포'));
    personality.blocks.push({ heading: '오행 편중이 만드는 기질', items });
  }
  {
    const items: Statement[] = [];
    const sinsalTemper: Record<string, [string, Tone]> = {
      괴강살: ['극단적일 만큼 강한 결단력과 카리스마가 있습니다. 대신 기복이 크고, 지는 것을 견디지 못해 관계에서 주도권 다툼이 잦습니다.', 'caution'],
      양인살: ['승부욕과 추진력이 매우 강합니다. 통제하지 못하면 다툼·과격한 결정으로 이어지므로 운동·경쟁처럼 에너지를 쓸 출구가 필요합니다.', 'caution'],
      백호대살: ['한 번 꽂히면 무섭게 몰입하는 강한 기운이 있습니다. 반면 급변·사고·수술 같은 “피를 보는 일”에 노출되기 쉬워 안전 관리가 필요합니다.', 'caution'],
      화개살: ['혼자만의 시간, 예술·종교·학문적 깊이를 추구합니다. 사람 속에 있어도 외로움을 느끼기 쉽습니다.', 'neutral'],
      현침살: ['관찰력이 날카롭고 말이 정확합니다. 그 정확함이 칼이 되어 상대에게 상처를 주기 쉽습니다.', 'caution'],
      천을귀인: ['결정적인 순간에 도와주는 사람이 나타나는 구조입니다. 다만 귀인은 먼저 손을 내미는 사람에게 옵니다.', 'positive'],
      문창귀인: ['배우고 정리하는 머리가 좋아 시험·문서·글에서 성과를 냅니다.', 'positive'],
    };
    for (const [name, [text, tone]] of Object.entries(sinsalTemper)) {
      const h = hasSinsal(name);
      if (h) items.push(S(text, tone, `${h.name} (${posKo(h.positions)})`));
    }
    const gm = a.interactions.find((i) => i.kind === '귀문');
    if (gm) items.push(S('귀문(鬼門) 관계가 있어 직관과 감수성이 예민합니다. 컨디션이 나쁘면 불안·불면·신경과민으로 나타나기 쉽습니다.', 'caution', `${gm.chars} 귀문`));
    const wj = a.interactions.find((i) => i.kind === '원진');
    if (wj) items.push(S('원진(怨嗔) 관계가 있어 가까운 사람에게 이유 없는 서운함·애증을 느끼기 쉽습니다.', 'caution', `${wj.chars} 원진`));
    items.push(S(dm.stress, 'negative', `일간 ${STEMS[ds].hanja}의 스트레스 반응`));
    personality.blocks.push({ heading: '신살과 스트레스 반응', items });
  }

  // -------------------------------------------------------------------------
  // 2. 연애·결혼
  // -------------------------------------------------------------------------
  const spouseStar: TenGod = male ? '정재' : '정관';
  const loverStar: TenGod = male ? '편재' : '편관';
  const spouseVisible = tgc[spouseStar] + tgc[loverStar];
  const spouseHidden = tgh[spouseStar] + tgh[loverStar];
  const love: ReportSection = {
    id: 'love',
    title: '연애·결혼',
    headline: '',
    blocks: [],
  };
  {
    const items: Statement[] = [S(dm.love, 'neutral', `일간 ${STEMS[ds].hanja}`)];
    items.push(S(STAGE_ON_DAY[dayInfo.stage], 'neutral', `일간이 일지 ${BRANCHES[dayBranch].hanja}에서 ${dayInfo.stage}`));
    const dohwa = hasSinsal('도화살');
    const hongyeom = hasSinsal('홍염살');
    if (dohwa) items.push(S('도화(桃花)가 있어 이성에게 매력이 잘 드러나고 연애 기회가 많습니다. 반대로 관계가 가볍게 시작되거나 구설이 따르기 쉽습니다.', 'caution', `도화살(${posKo(dohwa.positions)})`));
    if (hongyeom) items.push(S('홍염(紅艶)이 있어 분위기·스타일로 이성을 끕니다. 감정 소모가 큰 연애에 빠지기 쉽습니다.', 'caution', '홍염살'));
    if (!dohwa && !hongyeom) items.push(S('도화·홍염 같은 “끌림의 별”이 없어 첫인상으로 어필하기보다 오래 봐야 진가가 드러나는 타입입니다. 소개·직장·모임처럼 반복 노출되는 환경이 유리합니다.', 'neutral', '원국에 도화·홍염 없음'));
    love.blocks.push({ heading: '연애 스타일', items });
  }
  {
    const items: Statement[] = [S(SPOUSE_PALACE[dayInfo.branchTenGod], 'neutral', `일지(배우자궁) ${BRANCHES[dayBranch].hanja} = ${dayInfo.branchTenGod}`)];
    for (const it of a.interactions.filter((i) => i.positions.includes('day'))) {
      if (it.kind === '육충')
        items.push(S('배우자궁이 충(沖)을 받아 연애·결혼 생활에 변동이 많습니다. 주말부부·잦은 이사·관계의 굴곡으로 나타나기 쉬우며, 이른 결혼일수록 흔들림이 큽니다.', 'negative', `${it.chars} 충 (${posKo(it.positions)})`));
      else if (it.kind === '원진')
        items.push(S('배우자궁에 원진이 걸려 사랑하면서도 미운 감정이 반복되기 쉽습니다. 사소한 말투가 큰 싸움이 되는 패턴을 조심하세요.', 'negative', `${it.chars} 원진`));
      else if (it.kind === '형' || it.kind === '삼형' || it.kind === '자형')
        items.push(S('배우자궁에 형(刑)이 있어 관계에서 마찰과 조정이 많습니다. 서로 “고쳐 쓰려는” 태도가 갈등의 핵심입니다.', 'negative', `${it.chars} ${it.kind}`));
      else if (it.kind === '육합')
        items.push(S('배우자궁이 합(合)으로 묶여 인연이 쉽게 맺어지고 정이 깊습니다. 단, 합이 많으면 우유부단하게 관계를 정리하지 못할 수 있습니다.', 'positive', `${it.chars} 합`));
      else if (it.kind === '귀문')
        items.push(S('배우자궁에 귀문이 있어 연인의 말과 행동에 예민하게 반응합니다. 확인·의심이 반복되지 않도록 주의가 필요합니다.', 'caution', `${it.chars} 귀문`));
    }
    const gm = hasSinsal('공망');
    if (gm && gm.positions.includes('day')) items.push(S('배우자궁이 공망이라 배우자에 대한 기대와 현실의 차이가 큽니다.', 'caution', '일지 공망'));
    love.blocks.push({ heading: '배우자 자리(일지) 분석', items });
  }
  {
    const items: Statement[] = [];
    const who = male ? '아내·여성' : '남편·남성';
    const sg = gp[spouseGroup];
    if (spouseVisible === 0 && spouseHidden === 0) {
      items.push(S(`원국에 배우자를 뜻하는 ${spouseGroup}이 전혀 없습니다. 연애·결혼에 대한 관심이 늦게 생기거나 인연이 늦게 오는 경향이 뚜렷합니다. 운에서 ${spouseGroup}이 들어오는 해가 실질적인 인연 시기입니다.`, 'negative', `${spouseGroup} 0개`));
    } else if (spouseVisible === 0) {
      items.push(S(`${spouseGroup}이 지장간에만 숨어 있습니다. 인연은 있지만 드러나지 않거나 늦게 확정되는 편이며, 본인도 이성에 대한 감정을 잘 드러내지 않습니다.`, 'caution', `${spouseGroup} 지장간에만 ${spouseHidden}개`));
    } else if (sg >= 32) {
      items.push(
        S(
          male
            ? `재성이 과다합니다(${fmtPct(sg)}). 이성 인연이 많아 관계가 복잡해지거나, 이성·연애 때문에 돈과 에너지가 새기 쉽습니다.${!strong ? ' 신약해 감당이 어려우니 관계를 단순하게 유지하는 것이 핵심입니다.' : ''}`
            : `관성이 과다합니다(${fmtPct(sg)}). 남성 인연이 많거나 관계에서 압박을 크게 느낍니다.${!strong ? ' 신약해 강한 상대에게 끌려가기 쉬우니 주도권을 잃지 않는 것이 핵심입니다.' : ''}`,
          'negative',
          `${spouseGroup} ${fmtPct(sg)}`,
        ),
      );
    } else {
      items.push(S(`배우자를 뜻하는 ${spouseGroup}이 적절히 있어(${fmtPct(sg)}) 결혼 인연 자체는 무난한 편입니다.`, 'positive', `${spouseGroup} ${spouseVisible}개, ${fmtPct(sg)}`));
    }
    if (tgc[spouseStar] > 0 && tgc[loverStar] > 0)
      items.push(
        S(
          male
            ? '정재와 편재가 함께 드러나 있어(정편재 혼잡) 안정적인 상대와 자극적인 상대 사이에서 갈등하기 쉽습니다.'
            : '정관과 편관이 함께 드러나 있어(관살혼잡) 이성 관계가 복잡해지거나, 결혼 후에도 다른 이성의 존재로 흔들릴 수 있습니다.',
          'negative',
          `${spouseStar} ${tgc[spouseStar]}·${loverStar} ${tgc[loverStar]}`,
        ),
      );
    if (gp['비겁'] >= 30)
      items.push(
        S(
          male
            ? '비겁이 강해 재성(여성)을 두고 경쟁하는 구조(군겁쟁재)입니다. 연애에서 경쟁자가 생기거나, 결혼 후 배우자와 재정 문제로 다투기 쉽습니다.'
            : '비겁이 강해 독립심이 크고, 배우자에게 기대기보다 대등한 관계를 원합니다. 남편 자리를 두고 경쟁자가 생기는 형상도 있어 관계의 경계를 분명히 해야 합니다.',
          'negative',
          `비겁 ${fmtPct(gp['비겁'])}`,
        ),
      );
    if (!male && tgc['상관'] > 0 && gp['식상'] >= 22 && gp['관성'] > 5)
      items.push(S('상관이 강해 남편(관성)을 치는 구조입니다. 상대의 부족한 점을 지적하는 말이 관계를 크게 흔듭니다. 결혼 후 “말”이 가장 큰 리스크입니다.', 'negative', `상관 ${tgc['상관']}개, 식상 ${fmtPct(gp['식상'])}`));
    if (male && gp['인성'] >= 30 && gp['재성'] >= 10)
      items.push(S('인성(어머니)이 강하고 재성(아내)도 있어 어머니와 배우자 사이에서 입장이 난처해지기 쉽습니다. 결혼 후 경계를 분명히 해야 합니다.', 'caution', `인성 ${fmtPct(gp['인성'])}`));
    for (const n of ['고신살', '과숙살', '고란살', '음양차착살']) {
      const h = hasSinsal(n);
      if (h) items.push(S(h.meaning, 'caution', h.name));
    }
    love.blocks.push({ heading: `배우자 인연(${who}을 뜻하는 ${spouseGroup})`, items });
    love.headline =
      spouseVisible === 0
        ? `배우자성이 약해 인연이 늦거나 운에 따라 오는 구조 — 배우자궁 ${dayInfo.branchTenGod}`
        : `배우자궁 ${dayInfo.branchTenGod} · ${spouseGroup} ${fmtPct(gp[spouseGroup])}`;
  }
  {
    const tl: YearSignal[] = seunList.map((s) => {
      const t = yearTags(s);
      const notes: string[] = [];
      let sc = s.combined;
      if (t.spouse) {
        notes.push(`${spouseGroup} 운(${male ? '이성·아내' : '이성·남편'} 인연)`);
        sc += 8;
      }
      if (t.dayHap) {
        notes.push('배우자궁 합: 관계가 맺어지는 신호');
        sc += 8;
      }
      if (t.dohwa) {
        notes.push('도화운: 이성 관심·만남 증가');
        sc += 4;
      }
      if (t.dayChung) {
        notes.push('배우자궁 충: 관계 변동(시작 또는 이별)');
        sc -= 6;
      }
      if (!male && t.sanggwan && gp['관성'] > 5) notes.push('상관운: 연인과 말다툼 주의');
      if (male && t.bigeop && gp['재성'] > 5) notes.push('비겁운: 경쟁자·지출로 인한 갈등 주의');
      sc = Math.max(5, Math.min(95, Math.round(sc)));
      const strongSignal = t.spouse || t.dayHap;
      const verdict = strongSignal && sc >= 55 ? '인연 강함' : t.dayChung ? '변동 주의' : sc >= 60 ? '무난·호감' : sc < 40 ? '갈등 주의' : '평이';
      const tone: Tone = verdict === '인연 강함' || verdict === '무난·호감' ? 'positive' : verdict === '평이' ? 'neutral' : 'negative';
      return { year: s.year, pillar: pillarHanja(s.pillar), score: sc, verdict, tone, notes };
    });
    love.timeline = { title: '연도별 연애·결혼 신호', items: tl };
    const best = tl.filter((x) => x.verdict === '인연 강함').map((x) => x.year);
    love.blocks.push({
      heading: '시기',
      items: [
        best.length
          ? S(`향후 10년 중 인연 신호가 가장 강한 해: ${best.join(', ')}년. 미혼이라면 이 시기의 만남을 진지하게 보세요. 기혼이라면 관계가 깊어지거나 가족이 느는 계기가 되기 쉽습니다.`, 'positive', `${spouseGroup}운·배우자궁 합`)
          : S('향후 10년 안에 배우자성과 배우자궁 합이 동시에 강하게 들어오는 해가 뚜렷하지 않습니다. 운을 기다리기보다 환경(모임·소개)을 의도적으로 만드는 편이 현실적입니다.', 'caution', '세운 분석'),
      ],
    });
  }

  // -------------------------------------------------------------------------
  // 3. 직업·이직
  // -------------------------------------------------------------------------
  const career: ReportSection = { id: 'career', title: '직업·이직', headline: '', blocks: [] };
  const orgScore = gp['관성'] + gp['인성'] + tgc['정관'] * 4 + tgc['정인'] * 2;
  const indScore = gp['식상'] + gp['비겁'] + tgc['편재'] * 4 + tgc['상관'] * 3;
  const orgRatio = Math.round((orgScore / (orgScore + indScore)) * 100);
  {
    const items: Statement[] = [];
    items.push(S(`${a.gyeokguk.name}: ${a.gyeokguk.description}`, 'neutral', `월지 ${BRANCHES[a.pillars.month.branch].hanja}에서 ${STEMS[a.gyeokguk.stem].hanja}(${a.gyeokguk.tenGod}) ${a.gyeokguk.transparent ? '투출' : '본기'}`));
    const topGroup = (['비겁', '식상', '재성', '관성', '인성'] as TenGodGroup[]).sort((x, y) => gp[y] - gp[x])[0];
    items.push(S(`가장 강한 기운은 ${topGroup}(${fmtPct(gp[topGroup])})으로, ${GROUP_JOBS[topGroup]}에서 힘을 씁니다.`, 'positive', `${topGroup} ${fmtPct(gp[topGroup])}`, 2, `excess-${topGroup}`));
    const ys = a.yongsin.yongsin;
    items.push(
      S(
        `용신 ${elKo(ys)}에 해당하는 분야(${ELEMENT_JOBS[ys].join(', ')})는 일하면서 운이 보강되는 쪽입니다. 같은 직무라도 이 업종에서 일하면 체감 만족도가 높습니다.`,
        'positive',
        `용신 ${elKo(ys)}(${a.yongsin.method})`,
      ),
    );
    const gisin = a.yongsin.gisin;
    items.push(S(`반대로 기신 ${elKo(gisin)} 성격의 업종(${ELEMENT_JOBS[gisin].slice(0, 3).join(', ')} 등)은 성과 대비 소모가 큰 편입니다.`, 'caution', `기신 ${elKo(gisin)}`));
    items.push(S(dm.work, 'neutral', `일간 ${STEMS[ds].hanja}`));
    career.blocks.push({ heading: '적성과 맞는 분야', items });
  }
  {
    const items: Statement[] = [];
    items.push(
      S(
        orgRatio >= 58
          ? `조직형 ${orgRatio}% : 독립형 ${100 - orgRatio}%. 시스템과 직급 안에서 인정받을 때 안정적으로 성장합니다. 무리한 창업보다 조직 내 전문가·관리자 루트가 유리합니다.`
          : orgRatio <= 42
            ? `조직형 ${orgRatio}% : 독립형 ${100 - orgRatio}%. 정해진 틀 안에서는 답답함을 크게 느낍니다. 장기적으로 전문 프리랜서·창업·성과급 구조가 맞지만, 준비 없는 독립은 실패 확률이 높습니다.`
            : `조직형 ${orgRatio}% : 독립형 ${100 - orgRatio}%. 양쪽 성향이 섞여 있어 “조직 안의 독립적 역할”(전문직·사내 신사업·프로젝트 리더)이 가장 맞습니다.`,
        'neutral',
        `관성·인성 ${fmtPct(gp['관성'] + gp['인성'])} vs 식상·비겁 ${fmtPct(gp['식상'] + gp['비겁'])}`,
      ),
    );
    for (const g of ['비겁', '식상', '재성', '관성', '인성'] as TenGodGroup[]) {
      if (gp[g] >= 30) {
        const members = (Object.keys(tgc) as TenGod[]).filter((t) => groupOf(t) === g);
        const dominant = members.sort((x, y) => tgc[y] - tgc[x])[0];
        items.push(S(TEN_GOD_TRAIT[dominant].workExcess, 'caution', `${dominant} 우세 (${g} ${fmtPct(gp[g])})`));
      }
      if (groupCount(g) === 0 && gp[g] < 8) items.push(S(GROUP_MISSING[g].career, 'negative', `${g} 부재`, 1.5, `missing-${g}`));
    }
    if (tgc['상관'] > 0 && tgc['정관'] > 0)
      items.push(S('상관견관: 상사·규정과 부딪히는 일이 반복됩니다. 같은 이유로 퇴사한 경험이 있다면 이 구조 때문일 가능성이 큽니다. 문제 제기는 문서와 데이터로 하세요.', 'negative', `상관 ${tgc['상관']}·정관 ${tgc['정관']}`, 2, 'sanggwan'));
    if (tgc['정관'] > 0 && tgc['편관'] > 0)
      items.push(S('관살혼잡: 진로를 여러 번 바꾸거나 상사가 자주 바뀌는 등 직업적 혼선을 겪기 쉽습니다. 한 분야의 경력을 쌓는 것이 최우선 과제입니다.', 'negative', `정관 ${tgc['정관']}·편관 ${tgc['편관']}`, 2, 'gwansal'));
    if (hasSinsal('역마살')) items.push(S('역마가 있어 출장·해외·이동이 많은 직무가 맞고, 한곳에 오래 있으면 정체감을 크게 느낍니다.', 'neutral', '역마살'));
    const monthChung = a.interactions.find((i) => i.kind === '육충' && i.positions.includes('month'));
    if (monthChung) items.push(S('사회궁(월지)이 충을 받아 직장·직업 환경의 변동이 잦은 편입니다. 이직이 많은 것이 흠이 되지 않도록 “경력의 일관된 이야기”를 만들어 두세요.', 'caution', `${monthChung.chars} 충`));
    career.blocks.push({ heading: '일하는 방식과 직장 리스크', items });
  }
  {
    const tl: YearSignal[] = seunList.map((s) => {
      const t = yearTags(s);
      const notes: string[] = [];
      let change = 0;
      if (t.monthChung) {
        notes.push('월지충: 직장 환경 변화');
        change += 2;
      }
      if (t.yeokma) {
        notes.push('역마: 이동·출장·전근');
        change += 1;
      }
      if (t.siksang) {
        notes.push(t.sanggwan ? '상관운: 이직·독립 욕구, 상사와 충돌' : '식신운: 새 일·전문성 확장');
        change += t.sanggwan ? 2 : 1;
      }
      if (t.gwan) notes.push('관성운: 승진·입사·책임 증가(압박도 함께)');
      if (t.insung) notes.push('인성운: 자격·학위·계약, 윗사람 도움');
      if (t.sanggwan && hasNatalJeonggwan) notes.push('상관견관: 감정적 퇴사 주의');
      const fav = s.combined;
      let verdict: string;
      let tone: Tone;
      if (change >= 2 && fav >= 58) {
        verdict = '이직 적기';
        tone = 'positive';
      } else if (change >= 2 && fav < 45) {
        verdict = '충동 이직 주의';
        tone = 'negative';
      } else if (t.gwan && fav >= 55) {
        verdict = '승진·인정';
        tone = 'positive';
      } else if (fav >= 60) {
        verdict = '성과 유리';
        tone = 'positive';
      } else if (fav < 40) {
        verdict = '버티며 준비';
        tone = 'negative';
      } else {
        verdict = change >= 2 ? '변화 탐색' : '유지';
        tone = 'neutral';
      }
      return { year: s.year, pillar: pillarHanja(s.pillar), score: fav, verdict, tone, notes };
    });
    career.timeline = { title: '연도별 이직·커리어 신호', items: tl };
    const good = tl.filter((x) => x.verdict === '이직 적기').map((x) => x.year);
    const bad = tl.filter((x) => x.verdict === '충동 이직 주의').map((x) => x.year);
    const items: Statement[] = [];
    if (good.length) items.push(S(`이직·전환에 유리한 해: ${good.join(', ')}년. 변화 신호와 운의 지원이 함께 들어옵니다.`, 'positive', '세운의 월지충·식상·역마 + 종합 운 점수'));
    else items.push(S('향후 10년 중 “변화 신호 + 좋은 운”이 겹치는 해가 뚜렷하지 않습니다. 이직은 운보다 조건(연봉·직무·사람)을 기준으로 판단하는 것이 맞습니다.', 'neutral', '세운 분석'));
    if (bad.length) items.push(S(`이직 욕구는 커지지만 운의 뒷받침이 약한 해: ${bad.join(', ')}년. 이때의 퇴사 결정은 후회로 남기 쉬우니, 다음 자리를 확정하기 전에는 움직이지 마세요.`, 'negative', '변화 신호 + 낮은 운 점수'));
    if (a.currentDaeun) {
      const d = a.currentDaeun;
      const g = groupOf(d.stemTenGod);
      const fav = d.score >= 58 ? '유리하게' : d.score < 42 ? '부담스럽게' : '중립적으로';
      items.push(S(`현재 대운 ${pillarKo(d.pillar)}(${d.startYear}~${d.endYear}): ${GROUP_LUCK_THEME[g]}. 이 흐름이 당신에게는 ${fav} 작용합니다.`, d.score >= 58 ? 'positive' : d.score < 42 ? 'negative' : 'neutral', `대운 천간 ${d.stemTenGod}·지지 ${d.branchTenGod}, 점수 ${d.score}`));
    }
    career.blocks.push({ heading: '이직 타이밍', items });
  }
  career.headline = `${a.gyeokguk.name} · 조직형 ${orgRatio}% · 용신 업종 ${ELEMENT_JOBS[a.yongsin.yongsin][0]} 외`;

  // -------------------------------------------------------------------------
  // 4. 재물
  // -------------------------------------------------------------------------
  const wealth: ReportSection = { id: 'wealth', title: '재물', headline: '', blocks: [] };
  const jae = gp['재성'];
  const jaeEl = elementOfGroup(dayEl, '재성');
  {
    const items: Statement[] = [];
    let capacity: string;
    if (strong && jae >= 15) {
      capacity = '큼';
      items.push(S(`일간이 힘이 있고(${a.strength.level}) 재성도 갖춰져(${fmtPct(jae)}) 돈을 벌고 지키는 힘이 함께 있습니다(신왕재왕 경향). 기회가 왔을 때 규모를 키울 수 있는 구조입니다.`, 'positive', `${a.strength.level}, 재성 ${fmtPct(jae)}`, 3, 'jae'));
    } else if (!strong && jae >= 28) {
      capacity = '부담';
      items.push(S(`재성은 많은데 일간이 약해(재다신약) 돈이 눈앞에 보여도 내 것으로 만들기 어렵고, 돈 때문에 몸과 마음이 고생하기 쉽습니다. 큰돈보다 감당 가능한 규모를 꾸준히 지키는 것이 오히려 부자가 되는 길입니다.`, 'negative', `${a.strength.level}, 재성 ${fmtPct(jae)}`, 3, 'jae'));
    } else if (jae < 8) {
      capacity = '작음';
      items.push(S(`재성이 약해(${fmtPct(jae)}) 돈에 대한 감각과 모으는 힘이 약한 편입니다. 수입보다 “새지 않게 하는 구조”(자동 저축·위탁 관리)가 재산을 결정합니다.`, 'negative', `재성 ${fmtPct(jae)}`, 2.5, 'missing-재성'));
    } else {
      capacity = '보통';
      items.push(S(`재물 그릇은 보통 수준입니다(재성 ${fmtPct(jae)}, ${a.strength.level}). 한 번에 크게 버는 구조보다 꾸준히 쌓는 구조에서 성과가 납니다.`, 'neutral', `재성 ${fmtPct(jae)}`));
    }
    if (gp['식상'] >= 15 && jae >= 12) items.push(S('식상생재: 기술·재능·콘텐츠를 돈으로 바꾸는 흐름이 있습니다. 내 능력을 상품화할수록 수입이 늘어납니다.', 'positive', `식상 ${fmtPct(gp['식상'])} → 재성 ${fmtPct(jae)}`));
    if (jae >= 10 && a.positions.some((p) => p.pillar.branch === TOMB[jaeEl]))
      items.push(S(`재물 창고(재고, ${BRANCHES[TOMB[jaeEl]].hanja})가 원국에 있어 모아 두는 힘이 있습니다. 부동산·적립식 자산처럼 “묶어 두는” 재테크가 맞습니다.`, 'positive', `재성 ${elKo(jaeEl)}의 묘고 ${BRANCHES[TOMB[jaeEl]].hanja}`));
    const roleOfJae = roles[jaeEl];
    items.push(
      S(
        roleOfJae === '용신' || roleOfJae === '희신'
          ? `재성(${elKo(jaeEl)})이 용·희신이라 돈을 버는 활동 자체가 운을 좋게 만듭니다. 재물 활동에 적극적이어도 좋습니다.`
          : roleOfJae === '기신' || roleOfJae === '구신'
            ? `재성(${elKo(jaeEl)})이 ${roleOfJae}이라 돈을 좇을수록 건강·관계가 소모되는 구조입니다. 돈은 목표가 아니라 결과로 따라오게 해야 합니다.`
            : `재성(${elKo(jaeEl)})은 한신으로, 재물 활동이 운에 큰 영향을 주지 않습니다.`,
        roleOfJae === '용신' || roleOfJae === '희신' ? 'positive' : roleOfJae === '한신' ? 'neutral' : 'negative',
        `재성 ${elKo(jaeEl)} = ${roleOfJae}`,
      ),
    );
    wealth.blocks.push({ heading: '재물 그릇', items });
    wealth.headline = `재물 그릇 ${capacity} · 재성 ${fmtPct(jae)} · ${tgc['편재'] > tgc['정재'] ? '활동·사업형' : tgc['정재'] > 0 ? '축적·월급형' : '구조로 지켜야 하는 형'}`;
  }
  {
    const items: Statement[] = [];
    const route = (['식상', '관성', '인성', '비겁'] as TenGodGroup[]).sort((x, y) => gp[y] - gp[x])[0];
    const ROUTE_TEXT: Record<string, string> = {
      식상: '기술·콘텐츠·서비스처럼 “내가 만들어 내는 것”의 대가로 돈이 들어오는 구조입니다. 결과물을 상품화하고 가격을 매기는 연습이 수입을 키웁니다.',
      관성: '직장·직위·조직이 주는 급여와 성과급이 주 수입원인 구조입니다. 몸값(연봉 협상·승진)을 관리하는 것이 곧 재테크입니다.',
      인성: '자격·전문 지식·문서(계약·임대·저작권)를 통해 돈이 들어오는 구조입니다. 공부와 자격이 수입의 상한선을 정합니다.',
      비겁: '자기 힘으로 뛰는 영업·자영업·프리랜스 성과로 돈을 버는 구조입니다. 버는 만큼 나가는 돈(경쟁·인맥 비용)도 커서 관리가 핵심입니다.',
    };
    items.push(S(`주 수입 경로: ${ROUTE_TEXT[route]}`, 'neutral', `${route} ${fmtPct(gp[route])} (재성 외 최대 세력)`));
    if (tgc['편재'] + tgc['정재'] === 0 && tgh['편재'] + tgh['정재'] > 0)
      items.push(S('재성이 지장간에만 있어 드러나지 않는 부수입·숨은 재물(가족 지원, 뒤늦은 정산 등)이 있는 편입니다. 다만 본인이 돈을 직접 좇으면 오히려 잘 잡히지 않습니다.', 'neutral', '재성 지장간에만 존재'));
    if (tgc['편재'] > tgc['정재'])
      items.push(S('편재 우세: 고정 급여보다 사업·영업·투자·부업처럼 흐름을 타는 수입에 강합니다. 수입의 기복이 크므로 좋은 해의 수익을 반드시 떼어 두어야 합니다.', 'neutral', `편재 ${tgc['편재']}·정재 ${tgc['정재']}`));
    else if (tgc['정재'] > 0)
      items.push(S('정재 우세: 월급·임대료·이자처럼 예측 가능한 수입을 차곡차곡 쌓는 방식이 가장 확실합니다. 큰 한 방을 노리는 투자는 성향과 맞지 않습니다.', 'neutral', `정재 ${tgc['정재']}·편재 ${tgc['편재']}`));
    if (gp['관성'] >= 18 && gp['인성'] >= 15) items.push(S('관인상생 구조라 직위·자격이 곧 수입이 됩니다. 승진·자격 취득이 가장 확실한 재테크입니다.', 'positive', '관성·인성 균형'));
    wealth.blocks.push({ heading: '돈이 들어오는 방식', items });
  }
  {
    const items: Statement[] = [];
    if (gp['비겁'] >= 28) items.push(S(`비겁이 강해(${fmtPct(gp['비겁'])}) 돈이 사람을 통해 샙니다(탈재). 보증·동업·지인 간 돈거래는 원칙적으로 하지 마세요. 이 원국에서 가장 확실한 손재 경로입니다.`, 'negative', `비겁 ${fmtPct(gp['비겁'])}`, 3, 'talje'));
    if (tgc['겁재'] > 0 && tgc['편재'] > 0) items.push(S('겁재와 편재가 함께 있어 투기·한탕 심리가 발동하기 쉽습니다. 레버리지 투자, 단기 매매에서 큰 손실을 볼 위험이 높습니다.', 'negative', `겁재 ${tgc['겁재']}·편재 ${tgc['편재']}`, 2.5, 'tugi'));
    if (gp['재성'] >= 30 && tgc['편재'] >= 2) items.push(S('편재가 많아 씀씀이가 큽니다. 버는 만큼 쓰는 패턴을 끊지 않으면 고소득이어도 자산이 남지 않습니다.', 'negative', `편재 ${tgc['편재']}개`));
    if (gp['인성'] >= 35) items.push(S('인성이 과해 돈에 대한 실행력이 약하고, 계약·문서에 의존하다 기회를 놓치기 쉽습니다.', 'caution', `인성 ${fmtPct(gp['인성'])}`));
    const gmHit = hasSinsal('공망');
    if (gmHit) {
      const jaePos = a.positions.filter((p) => p.gongmang && groupOfElement(dayEl, STEMS[mainStemOf(p.pillar.branch)].element) === '재성');
      if (jaePos.length) items.push(S('재성이 공망에 걸려 기대한 수익이 실속 없이 끝나는 일이 생기기 쉽습니다. 계약서·정산 확인을 철저히 하세요.', 'caution', '재성 공망'));
    }
    const risk = (strong ? 1 : 0) + (jae >= 15 ? 1 : 0) + (gp['비겁'] < 28 ? 1 : 0) - (tgc['겁재'] > 0 && tgc['편재'] > 0 ? 1 : 0);
    items.push(
      S(
        risk >= 3
          ? '공격적 투자 적합도: 높음. 단, 손절 기준과 분산은 반드시 지켜야 합니다.'
          : risk === 2
            ? '공격적 투자 적합도: 보통. 자산의 일부(20~30% 이내)만 위험 자산에 두세요.'
            : '공격적 투자 적합도: 낮음. 원금 보존형·적립식이 맞고, 남의 정보로 하는 투자는 손실로 끝나기 쉽습니다.',
        risk >= 3 ? 'positive' : risk === 2 ? 'neutral' : 'caution',
        `신강약 ${a.strength.level}, 재성 ${fmtPct(jae)}, 비겁 ${fmtPct(gp['비겁'])}`,
      ),
    );
    wealth.blocks.push({ heading: '돈이 새는 길과 투자 성향', items });
  }
  {
    const tl: YearSignal[] = seunList.map((s) => {
      const t = yearTags(s);
      const notes: string[] = [];
      let sc = s.combined;
      const jaeRole = roles[jaeEl];
      if (t.jae) {
        notes.push('재성운: 돈의 흐름 확대');
        sc += jaeRole === '용신' || jaeRole === '희신' ? 8 : strong ? 4 : -2;
      }
      if (t.siksang && gp['재성'] > 5) {
        notes.push('식상운: 능력이 수입으로 연결');
        sc += 3;
      }
      if (t.bigeop) {
        const r = roles[dayEl];
        notes.push(r === '기신' || r === '구신' ? '비겁운: 손재·지출 주의(돈거래 금지)' : '비겁운: 경쟁 속 기회, 지출 증가');
        sc += r === '기신' || r === '구신' ? -8 : -2;
      }
      sc = Math.max(5, Math.min(95, Math.round(sc)));
      const verdict = sc >= 65 ? '재물 기회' : sc >= 52 ? '무난' : sc >= 40 ? '지출 관리' : '손재 주의';
      const tone: Tone = sc >= 65 ? 'positive' : sc >= 52 ? 'neutral' : 'negative';
      return { year: s.year, pillar: pillarHanja(s.pillar), score: sc, verdict, tone, notes };
    });
    wealth.timeline = { title: '연도별 재물 흐름', items: tl };
  }

  // -------------------------------------------------------------------------
  // 5. 건강
  // -------------------------------------------------------------------------
  const health: ReportSection = { id: 'health', title: '건강', headline: '', blocks: [] };
  {
    const items: Statement[] = [];
    const sorted = [...ELEMENTS].sort((x, y) => a.elements.percent[y] - a.elements.percent[x]);
    const top = sorted[0];
    const low = sorted[4];
    if (a.elements.percent[top] >= 30)
      items.push(S(`${elKo(top)}(${ELEMENT_HANJA[top]}) 기운이 과다합니다 — 관련 계통: ${ELEMENT_ORGAN[top].organs}. ${ELEMENT_ORGAN[top].excess}`, 'negative', `${elKo(top)} ${fmtPct(a.elements.percent[top])}`, 2.5, `health-${top}`));
    if (a.elements.percent[low] < 10)
      items.push(S(`${elKo(low)}(${ELEMENT_HANJA[low]}) 기운이 부족합니다 — 관련 계통: ${ELEMENT_ORGAN[low].organs}. ${ELEMENT_ORGAN[low].lack}`, 'negative', `${elKo(low)} ${fmtPct(a.elements.percent[low])}`, 2, `health-${low}`));
    if (!items.length) items.push(S('오행이 극단적으로 치우치지 않아 타고난 체질상 큰 약점은 두드러지지 않습니다. 생활 습관이 건강을 좌우하는 비중이 큰 타입입니다.', 'positive', '오행 분포 균형'));
    items.push(S(`평소 신호: ${ELEMENT_ORGAN[a.elements.percent[top] >= 30 ? top : low].signs}. 이런 증상이 반복되면 해당 계통 검진을 우선하세요.`, 'neutral', '오행-장부 대응'));
    health.blocks.push({ heading: '체질과 취약 계통', items });
    health.headline = `${elKo(top)} 과다·${elKo(low)} 부족 계통 관리 — ${ELEMENT_ORGAN[a.elements.percent[top] >= 30 ? top : low].organs.split(',')[0]} 우선`;
  }
  {
    const items: Statement[] = [];
    const mb = a.pillars.month.branch;
    if ([11, 0, 1].includes(mb) && a.elements.percent.fire < 15)
      items.push(S('겨울 태생에 화(火)가 부족해 몸이 차가운 체질(한습)입니다. 냉증·혈액순환·관절·소화 기능 저하에 취약하며, 몸을 따뜻하게 하는 습관이 가장 효과적인 건강법입니다.', 'caution', `${BRANCHES[mb].hanja}월생, 화 ${fmtPct(a.elements.percent.fire)}`));
    if ([5, 6, 7].includes(mb) && a.elements.percent.water < 15)
      items.push(S('여름 태생에 수(水)가 부족해 열이 많고 건조한 체질(조열)입니다. 염증·피부·불면·혈압과 탈수에 취약합니다. 수분 섭취와 충분한 수면이 핵심입니다.', 'caution', `${BRANCHES[mb].hanja}월생, 수 ${fmtPct(a.elements.percent.water)}`));
    const accident: string[] = [];
    if (hasSinsal('백호대살')) accident.push('백호대살');
    if (hasSinsal('양인살')) accident.push('양인살');
    if (hasSinsal('괴강살')) accident.push('괴강살');
    const hyeong = a.interactions.filter((i) => i.kind === '삼형' || (i.kind === '형' && i.chars.length === 2 && i.adjacent));
    if (hyeong.length) accident.push(...hyeong.map((h) => `${h.chars} 형`));
    if (accident.length)
      items.push(S('사고·수술과 관련된 기운이 있습니다. 실제로는 운동 부상, 치과·외과 시술, 교통사고 등으로 나타나는 경우가 많습니다. 위험한 취미·과속을 피하고 정기 검진을 습관화하세요.', 'caution', accident.join(', ')));
    if (a.interactions.some((i) => i.kind === '귀문') || gp['인성'] >= 35 || hasSinsal('화개살'))
      items.push(S('신경이 예민해 스트레스가 수면·소화·두통으로 먼저 나타나는 체질입니다. 정신 건강 관리(수면 위생, 상담)가 신체 건강만큼 중요합니다.', 'caution', '귀문·인성 과다·화개 중 해당'));
    if (items.length) health.blocks.push({ heading: '체온·사고·정신 건강', items });
  }
  {
    const tl: YearSignal[] = seunList.map((s) => {
      const t = yearTags(s);
      const notes: string[] = [];
      let sc = s.combined;
      if (t.gisinStem || t.gisinBranch) {
        notes.push('기신운: 컨디션 저하·과로 주의');
        sc -= 6;
      }
      if (t.dayChung) {
        notes.push('일지충: 몸의 변동·이사·환경 변화');
        sc -= 6;
      }
      if (t.monthChung) {
        notes.push('월지충: 생활 리듬 변화');
        sc -= 3;
      }
      if (t.samhyeong) {
        notes.push('삼형: 수술·시술·부상 주의');
        sc -= 6;
      } else if (t.hyeong) {
        notes.push('형: 마찰·피로 누적 주의');
        sc -= 2;
      }
      const yEl = STEMS[mainStemOf(s.pillar.branch)].element;
      if (a.elements.percent[yEl] >= 30) notes.push(`${elKo(yEl)} 과다 강화: ${ELEMENT_ORGAN[yEl].organs.split(',')[0]} 관리`);
      sc = Math.max(5, Math.min(95, Math.round(sc)));
      const verdict = sc >= 60 ? '양호' : sc >= 45 ? '보통' : sc >= 32 ? '관리 필요' : '집중 관리';
      const tone: Tone = sc >= 60 ? 'positive' : sc >= 45 ? 'neutral' : 'negative';
      return { year: s.year, pillar: pillarHanja(s.pillar), score: sc, verdict, tone, notes };
    });
    health.timeline = { title: '연도별 건강 관리 신호', items: tl };
    health.blocks.push({
      heading: '주의',
      items: [S('사주의 건강 해석은 체질적 경향을 말할 뿐 의학적 진단이 아닙니다. 증상이 있다면 반드시 전문 의료기관의 진료를 받으세요.', 'neutral')],
    });
  }

  // -------------------------------------------------------------------------
  // 0. 종합
  // -------------------------------------------------------------------------
  const summary: ReportSection = { id: 'summary', title: '종합', headline: '', blocks: [] };
  {
    const items: Statement[] = [];
    items.push(
      S(
        `${pillarHanja(a.pillars.day)} 일주, ${a.gyeokguk.name}, ${a.strength.level}. 용신은 ${elKo(a.yongsin.yongsin)}(${a.yongsin.method}), 희신 ${elKo(a.yongsin.heesin)}, 기신 ${elKo(a.yongsin.gisin)}.`,
        'neutral',
        `용신 판단 확실성: ${a.yongsin.confidence}`,
      ),
    );
    const allSections = [personality, love, career, wealth, health];
    const TIMING = new Set(['시기', '이직 타이밍', '주의']);
    const collect = (tone: Tone) =>
      allSections.flatMap((s) =>
        s.blocks.filter((b) => !TIMING.has(b.heading)).flatMap((b) => b.items.filter((i) => i.tone === tone).map((i) => ({ ...i, sec: s.title }))),
      );
    const pos = collect('positive');
    const neg = collect('negative');
    summary.blocks.push({ heading: '한눈에 보기', items });
    summary.blocks.push({
      heading: '가장 큰 무기 3가지',
      items: pickDistinct(pos, 3).map((x) => S(`[${x.sec}] ${x.text}`, 'positive', x.evidence)),
    });
    summary.blocks.push({
      heading: '가장 경계할 약점 3가지',
      items: pickDistinct(neg, 3).map((x) => S(`[${x.sec}] ${x.text}`, 'negative', x.evidence)),
    });
  }
  {
    const items: Statement[] = [];
    const d = a.daeun.list;
    const best = [...d].sort((x, y) => y.score - x.score)[0];
    const worst = [...d].sort((x, y) => x.score - y.score)[0];
    items.push(S(`가장 좋은 대운: ${pillarKo(best.pillar)} 대운 (만 ${Math.floor(best.startAge)}세~, ${best.startYear}~${best.endYear}년). ${GROUP_LUCK_THEME[groupOf(best.stemTenGod)]}.`, 'positive', `대운 점수 ${best.score}`));
    items.push(S(`가장 힘든 대운: ${pillarKo(worst.pillar)} 대운 (만 ${Math.floor(worst.startAge)}세~, ${worst.startYear}~${worst.endYear}년). 이 시기에는 확장보다 방어가 원칙입니다.`, 'negative', `대운 점수 ${worst.score}`));
    if (a.currentDaeun) {
      const c = a.currentDaeun;
      items.push(S(`지금은 ${pillarKo(c.pillar)} 대운(${c.startYear}~${c.endYear}) 중입니다. ${GROUP_LUCK_THEME[groupOf(c.stemTenGod)]}. ${c.flags.length ? `원국과의 관계: ${c.flags.join(', ')}.` : ''}`, c.score >= 58 ? 'positive' : c.score < 42 ? 'negative' : 'neutral', `대운 점수 ${c.score}`));
    }
    const thisYear = a.seun.find((s) => s.year === a.currentSajuYear);
    const nextYear = a.seun.find((s) => s.year === a.currentSajuYear + 1);
    for (const y of [thisYear, nextYear]) {
      if (!y) continue;
      const g1 = groupOf(y.stemTenGod);
      const g2 = groupOf(y.branchTenGod);
      items.push(
        S(
          `${y.year}년(${pillarKo(y.pillar)}): 천간 ${y.stemTenGod}·지지 ${y.branchTenGod}. ${GROUP_LUCK_THEME[g1]}${g2 !== g1 ? ` / ${GROUP_LUCK_THEME[g2]}` : ''}. 종합 ${y.combined}점${y.flags.length ? ` — ${y.flags.join(', ')}` : ''}.`,
          y.combined >= 60 ? 'positive' : y.combined < 42 ? 'negative' : 'neutral',
          `세운 ${y.score}점 + 대운 ${y.daeun?.score ?? '-'}점`,
        ),
      );
    }
    summary.blocks.push({ heading: '인생의 흐름', items });
  }
  {
    const ys = a.yongsin.yongsin;
    const advice: Record<Element, string> = {
      wood: '새로운 것을 배우고 계획을 세우는 일, 아침 시간 활용, 동쪽 방향, 초록색·식물',
      fire: '사람을 만나고 표현하는 일, 햇빛·운동, 남쪽 방향, 붉은색 계열',
      earth: '꾸준한 루틴과 신용 관리, 중재 역할, 안정된 거주지, 황토·베이지 계열',
      metal: '정리·결단·규칙 만들기, 불필요한 관계 정리, 서쪽 방향, 흰색·금속',
      water: '충분한 휴식과 사색, 공부·정보 수집, 북쪽 방향, 검정·남색, 물가',
    };
    summary.blocks.push({
      heading: '운을 보강하는 생활 습관 (용신 활용)',
      items: [
        S(`용신 ${elKo(ys)} 보강: ${advice[ys]}.`, 'positive', `용신 ${elKo(ys)}`),
        S(`기신 ${elKo(a.yongsin.gisin)}의 과잉 피하기: ${advice[a.yongsin.gisin].split(',')[0]} 같은 활동은 과하지 않게.`, 'caution', `기신 ${elKo(a.yongsin.gisin)}`),
        S('이 습관은 “개운법”이라기보다 성향의 균형을 맞추는 행동 지침입니다. 효과는 꾸준함에 비례합니다.', 'neutral'),
      ],
    });
  }
  summary.headline = `${pillarHanja(a.pillars.day)}일주 · ${a.gyeokguk.name} · ${a.strength.level} · 용신 ${josa(elKo(a.yongsin.yongsin), '이/가')} 핵심`;

  return { sections: [summary, personality, love, career, wealth, health], confidenceNotes };
}

function pickDistinct<T extends Statement & { sec: string }>(arr: T[], n: number): T[] {
  // 가중치 높은 순(원국 구조 기반 해석 우선), 같은 주제·같은 섹션 중복 회피
  const sorted = arr.map((x, i) => ({ x, i })).sort((p, q) => (q.x.weight ?? 1) - (p.x.weight ?? 1) || p.i - q.i).map((p) => p.x);
  const out: T[] = [];
  const topics = new Set<string>();
  const secs = new Map<string, number>();
  for (const pass of [1, 2]) {
    for (const x of sorted) {
      if (out.length >= n) break;
      if (out.includes(x)) continue;
      if (x.topic && topics.has(x.topic)) continue;
      if (pass === 1 && (secs.get(x.sec) ?? 0) >= 1) continue;
      out.push(x);
      if (x.topic) topics.add(x.topic);
      secs.set(x.sec, (secs.get(x.sec) ?? 0) + 1);
    }
  }
  return out;
}
