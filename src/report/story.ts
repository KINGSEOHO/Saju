/**
 * 이야기형 풀이 생성기
 *
 * 리포트 카드(짧고 근거 중심)를 바탕으로, 읽는 사람이 자기 삶을 떠올려 볼 수 있는
 * 긴 문단형 이야기를 섹션마다 만든다. 모든 문단에는 사주상 근거(basis)를 붙인다.
 */
import { BRANCHES, ELEMENT_HANJA, ELEMENT_KO, ELEMENTS, STEMS, pillarHanja, pillarKo, type Element, type SajuAnalysis, type TenGod, type TenGodGroup } from '../engine/index.ts';
import { josa } from '../engine/josa.ts';
import { groupOf } from '../engine/tenGods.ts';
import { DAY_MASTER, ELEMENT_JOBS, ELEMENT_ORGAN, GROUP_JOBS } from './kb.ts';
import { readLuck } from './luckReading.ts';
import { incomeRoute, investmentRisk, isStrong, lifeShape, orgRatio, wealthCapacity, type LifeShape } from './metrics.ts';
import {
  CHILDHOOD_STORY, DECADE_THEME, DM_STORY, DOMINANT_STORY, GENDER_NOTE, INSIDE, MISSING_STORY, OUTSIDE, SPENDING_STORY, SPOUSE_STORY, SPOUSE_TIP,
  STAGE_SCENE, STRENGTH_STORY, flagText, lifeStage, toneText,
} from './storyKb.ts';
import type { ReportSection, SectionId, Statement } from './generate.ts';

export interface StoryPara {
  title: string;
  text: string;
  basis?: string;
  /** 인생 연대기의 시점 표시 */
  when?: 'past' | 'now' | 'future';
}

const GROUPS: TenGodGroup[] = ['비겁', '식상', '재성', '관성', '인성'];

const ELEMENT_STORY: Record<Element, { excess: string; lack: string }> = {
  wood: {
    excess: '목(木) 기운이 강해, 한번 마음먹은 일은 밀어붙이는 추진력과 성장 욕구가 커요. 대신 화가 나면 참기 어렵고 고집이 세지는 순간이 있어요.',
    lack: '목(木) 기운이 없어, 새로운 일을 시작하고 꾸준히 키워 가는 힘이 약할 수 있어요. 계획을 아주 작게 쪼개서 시작하는 습관이 도움이 돼요.',
  },
  fire: {
    excess: '화(火) 기운이 강해, 열정과 표현력이 크고 반응이 빨라요. 대신 성급하게 결론을 내리거나 감정의 온도가 쉽게 오르내려요.',
    lack: '화(火) 기운이 없어, 열정을 겉으로 드러내거나 분위기를 띄우는 일이 어색할 수 있어요. 의욕이 쉽게 가라앉는 시기를 조심하세요.',
  },
  earth: {
    excess: '토(土) 기운이 강해, 신중하고 묵직하며 쉽게 흔들리지 않아요. 대신 걱정과 생각이 많아 행동이 늦어지고 변화를 미루기 쉬워요.',
    lack: '토(土) 기운이 없어, 한곳에 중심을 잡고 꾸준히 버티는 힘이 약할 수 있어요. 관심사가 자주 바뀐다면 이 때문이에요.',
  },
  metal: {
    excess: '금(金) 기운이 강해, 판단이 냉철하고 기준이 분명해요. 대신 옳고 그름에 집착해 말이 날카로워지거나 관계가 딱딱해지기 쉬워요.',
    lack: '금(金) 기운이 없어, 결단하고 정리하는 일이 어려워요. 거절과 마무리를 미루다 일이 쌓이기 쉬워요.',
  },
  water: {
    excess: '수(水) 기운이 강해, 생각이 깊고 감수성이 풍부해요. 대신 생각이 꼬리를 물어 걱정이나 우울감으로 이어지기 쉬워요.',
    lack: '수(水) 기운이 없어, 쉬어 가는 여유와 융통성이 부족할 수 있어요. 조급하게 결론을 내리기 전에 한 박자 쉬어 가세요.',
  },
};

const HEALTH_SCENE: Record<Element, string> = {
  wood: '눈이 쉽게 피로하고, 어깨와 목이 뭉치고, 스트레스를 받으면 머리가 지끈거리는 날이 잦다면 이 계통이 보내는 신호예요.',
  fire: '가슴이 두근거리거나 얼굴이 화끈거리고, 피곤한데도 잠이 잘 오지 않는 밤이 잦다면 이 계통이 보내는 신호예요.',
  earth: '조금만 신경 써도 속이 더부룩하고, 단 음식이 당기고, 걱정이 많은 날 소화가 먼저 막힌다면 이 계통이 보내는 신호예요.',
  metal: '환절기마다 비염이나 기침이 도지고, 피부가 쉽게 건조해지거나 장 트러블이 잦다면 이 계통이 보내는 신호예요.',
  water: '몸이 쉽게 붓고, 허리가 뻐근하고, 손발이 차거나 귀가 먹먹한 날이 잦다면 이 계통이 보내는 신호예요.',
};

const GYEOK_STORY: Record<string, string> = {
  식신격: '식신격은 전문성과 생산, 표현으로 먹고사는 구조예요. 한 가지를 꾸준히 깊게 파고들 때 성공이 따라와요.',
  상관격: '상관격은 재능과 말, 혁신으로 승부하는 구조예요. 기존 질서에 도전하는 힘이 크지만, 조직과 부딪힐 때 구설이 생기기 쉬워요.',
  편재격: '편재격은 활동형 재물, 사업과 유통의 구조예요. 크게 벌고 크게 쓰는 흐름이 있어요.',
  정재격: '정재격은 안정적인 수입과 관리의 구조예요. 성실함이 곧 재산이 돼요.',
  '편관격(칠살격)': '편관격은 압박 속에서 성장하는 구조예요. 그 압박을 잘 다스리면 권위와 리더십이 되고, 다스리지 못하면 스트레스와 사고로 나타나요.',
  정관격: '정관격은 조직과 규범, 명예의 구조예요. 안정된 직장이나 공직과 잘 맞아요.',
  편인격: '편인격은 특수한 기술과 연구, 직관의 구조예요. 남들이 가지 않는 분야에서 강해요.',
  정인격: '정인격은 학문과 자격, 문서의 구조예요. 교육, 연구, 공공 분야와 잘 맞아요.',
  건록격: '건록격은 자기 힘으로 일어서는 자립의 구조예요. 재물과 관직의 기운을 함께 갖추면 크게 쓰여요.',
  양인격: '양인격은 강한 힘을 다스려야 빛나는 구조예요. 그 힘을 규율로 다스리면 큰일을 해내고, 그렇지 못하면 과격함과 고집으로 손해를 봐요.',
  월겁격: '월겁격은 경쟁심과 독립성이 강한 구조예요. 재물은 경쟁 속에서 얻고, 지키는 데 힘이 들어요.',
};

/** 연도별 신호 메모("월지충: 직장 환경 변화")를 자연스러운 구절로 */
function plain(note: string): string {
  return note.includes(':') ? note.split(':').slice(1).join(':').trim() : note;
}

const YONGSIN_HABIT: Record<Element, string> = {
  wood: '아침 시간을 활용해 무언가를 새로 배우고, 식물을 키우거나 숲길을 걷는 습관',
  fire: '햇빛을 충분히 쬐고, 사람을 만나 이야기하고, 몸에 열이 오를 만큼 운동하는 습관',
  earth: '같은 시간에 먹고 자는 규칙적인 생활, 그리고 약속과 신용을 지키는 습관',
  metal: '주변을 정리하고 불필요한 관계와 물건을 덜어 내며, 스스로 규칙을 세우는 습관',
  water: '충분히 자고 쉬며, 혼자 생각하고 기록하는 시간을 따로 두는 습관',
};

function bucket(score: number): keyof typeof STRENGTH_STORY {
  if (score < 29) return 'veryWeak';
  if (score < 48) return 'weak';
  if (score < 68) return 'strong';
  return 'veryStrong';
}

function itemsOf(sec: ReportSection | undefined, heading: string): Statement[] {
  return sec?.blocks.find((b) => b.heading === heading)?.items ?? [];
}

function pct(n: number) {
  return `${n.toFixed(0)}%`;
}

export function buildStories(a: SajuAnalysis, sections: ReportSection[]): Partial<Record<SectionId, StoryPara[]>> {
  const who = a.input.name ? `${a.input.name}님` : '당신';
  const W = (t: string) => t.replaceAll('{who}', who);
  const ds = a.pillars.day.stem;
  const dm = DM_STORY[ds];
  const dmKb = DAY_MASTER[ds];
  const gp = a.elements.groupPercent;
  const tgc = a.elements.tenGodCount;
  const tgh = a.elements.tenGodHidden;
  const male = a.input.gender === 'male';
  const sec = (id: SectionId) => sections.find((s) => s.id === id);
  const dayInfo = a.positions.find((p) => p.pos === 'day')!;
  const monthInfo = a.positions.find((p) => p.pos === 'month')!;
  const dmName = `${STEMS[ds].ko}${ELEMENT_KO[STEMS[ds].element]}(${STEMS[ds].hanja}${ELEMENT_HANJA[STEMS[ds].element]})`;
  const groupCount = (g: TenGodGroup) => (Object.keys(tgc) as TenGod[]).filter((t) => groupOf(t) === g).reduce((acc, t) => acc + tgc[t], 0);
  const topGroup = [...GROUPS].sort((x, y) => gp[y] - gp[x])[0];
  const dominantOf = (g: TenGodGroup) =>
    (Object.keys(tgc) as TenGod[]).filter((t) => groupOf(t) === g).sort((x, y) => tgc[y] + tgh[y] * 0.3 - (tgc[x] + tgh[x] * 0.3))[0];

  // ---------------------------------------------------------------------------
  // 성향
  // ---------------------------------------------------------------------------
  const personality: StoryPara[] = [];
  personality.push({ title: `타고난 기질 · ${dmName}`, text: W([dm.opening, ...dm.scenes].join(' ')), basis: `일간(나를 뜻하는 글자) ${STEMS[ds].hanja}` });
  personality.push({ title: '빛 뒤의 그림자', text: W(`${dm.shadow} ${dm.growth}`), basis: `일간 ${STEMS[ds].hanja}의 기질` });
  personality.push({
    title: '타고난 에너지의 크기',
    text: W(`${STRENGTH_STORY[bucket(a.strength.score)]} 실제로 이 사주에서 일간을 돕는 기운은 ${pct(a.strength.score)}로, ${a.strength.level}에 해당해요.`),
    basis: `득령 ${a.strength.deukryeong ? 'O' : 'X'} · 득지 ${a.strength.deukji ? 'O' : 'X'} · 득세 ${a.strength.deukse ? 'O' : 'X'}`,
  });
  {
    const out = monthInfo.stemTenGod === '일간' ? null : (monthInfo.stemTenGod as TenGod);
    const inn = dayInfo.branchTenGod;
    if (out) {
      const same = groupOf(out) === groupOf(inn);
      personality.push({
        title: '밖에서의 나, 안에서의 나',
        text: W(
          `${OUTSIDE[out]} ${INSIDE[inn]} ${
            same ? '겉과 속이 크게 다르지 않아서, 처음 만난 사람도 금방 {who}을 파악하는 편이에요.' : '그래서 {who}을 오래 본 사람일수록 “처음 인상과는 좀 다르다”는 말을 하곤 해요.'
          }`,
        ),
        basis: `월간 ${STEMS[a.pillars.month.stem].hanja}(${out}) · 일지 ${BRANCHES[a.pillars.day.branch].hanja}(${inn})`,
      });
    }
  }
  if (gp[topGroup] >= 28) {
    const d = dominantOf(topGroup);
    personality.push({ title: `가장 강한 기운 · ${d}`, text: W(DOMINANT_STORY[d]), basis: `${topGroup} ${pct(gp[topGroup])} (다섯 갈래 중 가장 강함)` });
  } else {
    personality.push({
      title: '고르게 나뉜 기운',
      text: W('{who}의 사주는 어느 한 기운이 지나치게 강하지 않고 비교적 고르게 나뉘어 있어요. 극단으로 치우치지 않아 상황에 따라 다양한 모습을 보여 줄 수 있는 대신, “이것만큼은 내가 최고”라는 확실한 무기가 무엇인지 스스로 정해 두어야 존재감이 생겨요.'),
      basis: `가장 강한 ${topGroup}도 ${pct(gp[topGroup])}`,
    });
  }
  const missing = GROUPS.filter((g) => groupCount(g) === 0 && gp[g] < 8);
  if (missing.length) {
    personality.push({ title: '비어 있는 자리', text: W(missing.map((g) => MISSING_STORY[g]).join(' ')), basis: missing.map((g) => `${g} ${pct(gp[g])}`).join(' · ') });
  }
  {
    const parts = [...a.elements.excessive.map((e) => ELEMENT_STORY[e].excess), ...a.elements.missing.map((e) => ELEMENT_STORY[e].lack)];
    personality.push({
      title: '오행이 만드는 온도',
      text: parts.length
        ? `다섯 가지 기운(오행)으로 보면, ${parts.join(' ')}`
        : '다섯 가지 기운(오행)이 비교적 고르게 분포해 있어 성격이 한쪽으로 극단적으로 치우치지 않아요. 상황에 맞춰 여러 얼굴을 꺼낼 수 있는 균형감이 장점이에요.',
      basis: ELEMENTS.map((e) => `${ELEMENT_KO[e]} ${pct(a.elements.percent[e])}`).join(' · '),
    });
  }
  {
    const sinsalItems = itemsOf(sec('personality'), '신살과 스트레스 반응').filter((s) => !s.evidence?.includes('스트레스 반응'));
    if (sinsalItems.length) {
      personality.push({
        title: '사주에 새겨진 특별한 표시',
        text: W(`사주에는 글자 조합에 따라 붙는 특별한 표시(신살)가 있어요. ${sinsalItems.map((s) => s.text).join(' ')}`),
        basis: sinsalItems.map((s) => s.evidence).filter(Boolean).join(' · '),
      });
    }
  }
  personality.push({
    title: '지치고 화가 날 때',
    text: W(
      `누구나 한계에 다다르는 순간이 있어요. ${dmKb.stress} 이 패턴을 알고 있으면, 같은 상황이 왔을 때 “아, 지금 그 패턴이구나” 하고 한 박자 멈출 수 있어요. 사주로 보면 {who}에게 가장 잘 맞는 회복법은 ${josa(YONGSIN_HABIT[a.yongsin.yongsin], '이에요/예요')}.`,
    ),
    basis: `일간 ${STEMS[ds].hanja}의 스트레스 반응`,
  });

  // ---------------------------------------------------------------------------
  // 연애·결혼
  // ---------------------------------------------------------------------------
  const love: StoryPara[] = [];
  const loveSec = sec('love');
  {
    const style = itemsOf(loveSec, '연애 스타일').slice(1);
    love.push({ title: '사랑을 시작하는 방식', text: W([dm.love, ...style.map((s) => s.text)].join(' ')), basis: `일간 ${STEMS[ds].hanja} · 일지 12운성 ${dayInfo.stage}` });
  }
  {
    const extra = itemsOf(loveSec, '배우자 자리(일지) 분석').slice(1);
    love.push({
      title: '배우자 자리에 앉은 기운',
      text: W([SPOUSE_STORY[dayInfo.branchTenGod], ...extra.map((s) => s.text)].join(' ')),
      basis: `일지(배우자 자리) ${BRANCHES[a.pillars.day.branch].hanja} = ${dayInfo.branchTenGod}`,
    });
  }
  {
    const spouseGroup: TenGodGroup = male ? '재성' : '관성';
    const spouseStar: TenGod = male ? '정재' : '정관';
    const loverStar: TenGod = male ? '편재' : '편관';
    const visible = tgc[spouseStar] + tgc[loverStar];
    const hidden = tgh[spouseStar] + tgh[loverStar];
    const meaning = male ? '아내·이성' : '남편·이성';
    const parts: string[] = [];
    if (visible === 0 && hidden === 0) {
      parts.push(
        `사주에서 ${meaning}을 뜻하는 기운은 ${josa(spouseGroup, '이에요/예요')}. 그런데 {who}의 사주에는 이 기운이 거의 없어요. 이런 사주는 연애나 결혼에 대한 관심이 늦게 생기거나, 인연이 운에서 들어오는 해에 비로소 시작되는 경우가 많아요. “왜 나는 연애가 잘 안 될까” 고민해 봤다면, 매력이 부족해서라기보다 인연의 타이밍이 따로 정해진 구조이기 때문일 가능성이 커요.`,
      );
    } else if (visible === 0) {
      parts.push(
        `사주에서 ${meaning}을 뜻하는 기운(${spouseGroup})은 겉으로 드러나지 않고 지장간 속에 숨어 있어요. 인연은 있지만 늦게 확정되거나, {who} 스스로 감정을 잘 드러내지 않아 관계가 천천히 진행되는 편이에요. 오래 알고 지낸 사람이 어느 날 연인이 되는 식의 인연이 이 구조와 잘 맞아요.`,
      );
    } else if (gp[spouseGroup] >= 32) {
      parts.push(
        male
          ? `사주에 ${meaning}을 뜻하는 재성이 많아요(${pct(gp[spouseGroup])}). 이성 인연이 많고 연애 기회도 잦은 편이지만, 그만큼 관계가 복잡해지거나 이성 문제로 시간과 돈이 새기 쉬워요.${!isStrong(a) ? ' 일간의 힘이 약해 이 인연들을 다 감당하기 어려우니, 관계를 단순하게 정리하는 것이 행복의 지름길이에요.' : ''}`
          : `사주에 ${meaning}을 뜻하는 관성이 많아요(${pct(gp[spouseGroup])}). 이성 인연이 많거나, 관계에서 상대에게 끌려가는 압박을 크게 느끼기 쉬워요.${!isStrong(a) ? ' 일간의 힘이 약해 강한 상대에게 휘둘리기 쉬우니, 연애에서도 나의 기준과 속도를 지키는 것이 중요해요.' : ''}`,
      );
    } else {
      parts.push(`사주에서 ${meaning}을 뜻하는 기운(${spouseGroup})이 적당히 자리 잡고 있어(${pct(gp[spouseGroup])}), 결혼 인연 자체는 무난한 편이에요. 중요한 것은 “언제, 어떤 사람과”예요.`);
    }
    if (tgc[spouseStar] > 0 && tgc[loverStar] > 0) {
      parts.push(
        male
          ? '정재와 편재가 함께 있어, 안정적인 사람과 자극적인 사람 사이에서 마음이 오가기 쉬워요. 연애할 때는 설렘을, 결혼을 생각할 때는 안정을 찾는 이중적인 끌림을 느껴 봤을 수 있어요.'
          : '정관과 편관이 함께 있어(관살혼잡), 반듯한 사람과 강렬한 사람 사이에서 마음이 흔들리기 쉬워요. 만나는 사람의 유형이 극과 극으로 바뀌었던 경험이 있다면 이 구조 때문이에요.',
      );
    }
    if (gp['비겁'] >= 30) {
      parts.push(
        male
          ? '또 비겁이 강해서 연애에서 경쟁자가 생기기 쉽고, 결혼 후에는 돈 문제로 배우자와 부딪히기 쉬워요.'
          : '또 비겁이 강해서 독립심이 크고, 기대기보다 대등한 관계를 원해요. 관계의 경계를 분명히 해 두는 것이 좋아요.',
      );
    }
    if (!male && tgc['상관'] > 0 && gp['식상'] >= 22 && gp['관성'] > 5) {
      parts.push('상관의 기운이 강해 상대의 부족한 점이 유독 잘 보이고, 그걸 말로 지적하는 순간 관계가 흔들려요. 결혼 후 가장 큰 위험 요소는 “말”이에요.');
    }
    if (male && gp['인성'] >= 30 && gp['재성'] >= 10) {
      parts.push('인성(어머니)의 기운도 강해서, 결혼 후 어머니와 배우자 사이에서 입장이 난처해지는 일이 생기기 쉬워요. 처음부터 경계를 분명히 해 두는 것이 좋아요.');
    }
    const LONELY: Record<string, string> = {
      고신살: '고신살이 있어 정서적으로 외로움을 느끼는 시간이 길어지기 쉬워요. 배우자와 떨어져 지내거나 각자의 시간이 많은 관계가 될 수 있어요.',
      과숙살: '과숙살이 있어 관계 안에서도 독립적인 편이고, 결혼이 늦어지는 경향이 있어요.',
      고란살: '고란살이 있어 배우자와 정서적 거리감을 느끼기 쉬워요. 서로 독립적인 결혼 생활이 오히려 편할 수 있어요.',
      음양차착살: '음양차착살이 있어 결혼 과정이나 양가 관계에서 일이 엇갈리고 번거로워지기 쉬워요.',
    };
    for (const s of a.sinsal) if (LONELY[s.name]) parts.push(LONELY[s.name]);
    love.push({ title: '배우자 인연의 구조', text: W(parts.join(' ')), basis: `${spouseGroup} ${pct(gp[spouseGroup])} · 겉 ${visible}개 · 지장간 ${hidden}개` });
  }
  {
    const tl = loveSec?.timeline?.items ?? [];
    const strongYears = tl.filter((t) => t.verdict === '인연 강함').map((t) => t.year);
    const shaky = tl.filter((t) => t.verdict === '변동 주의' || t.verdict === '갈등 주의').map((t) => t.year);
    const parts: string[] = [];
    if (strongYears.length) {
      parts.push(
        `앞으로 10년 중 인연의 신호가 가장 강하게 들어오는 해는 ${strongYears.join('년, ')}년이에요. 미혼이라면 이 시기에 만나는 사람을 가볍게 넘기지 마세요. 소개나 모임처럼 새로운 사람을 만날 기회를 일부러 만드는 것도 좋아요. 이미 연인이나 배우자가 있다면 관계가 한 단계 깊어지거나 가족이 늘어나는 계기가 되기 쉬워요.`,
      );
    } else {
      parts.push('앞으로 10년 안에 배우자 기운과 배우자 자리의 합이 함께 강하게 들어오는 해가 뚜렷하지 않아요. 운이 알아서 인연을 데려오기를 기다리기보다, 만남의 환경을 의도적으로 만드는 편이 현실적이에요.');
    }
    if (shaky.length) {
      parts.push(`반대로 ${shaky.join('년, ')}년에는 배우자 자리가 흔들리거나 갈등이 커지기 쉬워요. 연애 중이라면 다툼을, 결혼했다면 이사나 생활 환경의 변화를 미리 염두에 두세요.`);
    }
    love.push({ title: '인연의 시기', text: parts.join(' '), basis: '향후 10년 세운의 배우자 기운·배우자 자리 합충·도화' });
  }
  love.push({
    title: '관계를 오래 지키는 한 가지',
    text: W(`사주로 보면 {who}의 관계를 가장 크게 흔드는 것은 큰 사건보다 반복되는 작은 습관이에요. ${SPOUSE_TIP[dayInfo.branchTenGod]}`),
    basis: `일지 ${BRANCHES[a.pillars.day.branch].hanja} = ${dayInfo.branchTenGod}`,
  });

  // ---------------------------------------------------------------------------
  // 직업·이직
  // ---------------------------------------------------------------------------
  const career: StoryPara[] = [];
  const careerSec = sec('career');
  career.push({ title: '일하는 방식', text: W(dm.work), basis: `일간 ${STEMS[ds].hanja}` });
  career.push({
    title: `사주의 큰 틀 · ${a.gyeokguk.name}`,
    text: W(
      `사주 전체의 구조를 “격국”이라고 부르는데, 주로 태어난 달의 기운으로 정해요. {who}의 사주는 ${josa(a.gyeokguk.name, '이에요/예요')}. ${GYEOK_STORY[a.gyeokguk.name] ?? a.gyeokguk.description}${
        a.gyeokguk.transparent ? '' : ' 다만 이 사주는 격을 이루는 글자가 천간에 드러나지 않아, 격의 힘이 다소 약한 편이에요.'
      } 실제로 사주에서 가장 강한 기운은 ${topGroup}(${pct(gp[topGroup])})이라, ${GROUP_JOBS[topGroup]}에서 힘을 쓰기 쉬워요.`,
    ),
    basis: `월지 ${BRANCHES[a.pillars.month.branch].hanja} · ${STEMS[a.gyeokguk.stem].hanja}(${a.gyeokguk.tenGod})`,
  });
  {
    const r = orgRatio(a);
    const text =
      r >= 58
        ? `사주 구조로 보면 {who}은 조직형(${r}%)에 가까워요. 혼자 모든 것을 책임지는 창업보다, 시스템이 받쳐 주는 곳에서 인정받으며 단계적으로 올라갈 때 가장 안정적으로 성장해요. “회사를 그만두고 내 일을 해 볼까?” 하는 생각이 들 때가 있겠지만, 이 사주에서 준비와 안전장치 없이 독립하는 것은 위험해요. 조직 안에서 전문가나 관리자로 자리 잡는 길이 {who}의 힘을 가장 잘 쓰는 방법이에요.`
        : r <= 42
          ? `사주 구조로 보면 {who}은 독립형(${100 - r}%)에 가까워요. 정해진 틀 안에서 시키는 일만 할 때 답답함을 크게 느끼고, 내 방식대로 결과를 만들 수 있을 때 실력이 폭발해요. 장기적으로는 전문 프리랜서, 창업, 성과급 구조가 잘 맞아요. 다만 “답답해서 나간다”는 식의 독립은 실패 확률이 높아요. 조직에 있을 때 독립에 필요한 기술, 고객, 자금을 미리 준비해 두는 것이 핵심이에요.`
          : `사주 구조로 보면 {who}은 조직형과 독립형이 섞여 있어요(조직형 ${r}%). 완전히 자유로운 환경도, 완전히 통제된 환경도 잘 맞지 않아요. 조직 안에서 독립적인 역할(전문직, 사내 신사업, 프로젝트 리더)을 맡을 때 가장 만족스럽고 성과도 좋아요.`;
    career.push({ title: '조직형인가, 독립형인가', text: W(text), basis: `관성·인성 ${pct(gp['관성'] + gp['인성'])} vs 식상·비겁 ${pct(gp['식상'] + gp['비겁'])}` });
  }
  {
    const ys = a.yongsin.yongsin;
    const gi = a.yongsin.gisin;
    career.push({
      title: '운이 붙는 분야',
      text: W(
        `사주에서 가장 필요한 기운(용신)은 ${josa(`${ELEMENT_KO[ys]}(${ELEMENT_HANJA[ys]})`, '이에요/예요')}. 이 기운과 닿아 있는 분야, 예를 들어 ${ELEMENT_JOBS[ys].slice(0, 4).join(', ')} 같은 곳에서 일하면 같은 노력으로도 덜 지치고 결과가 잘 붙어요. 직무를 바꾸기 어렵다면 업종이나 회사의 성격을 이쪽으로 맞추는 것만으로도 차이가 나요. 반대로 기신인 ${ELEMENT_KO[gi]}(${ELEMENT_HANJA[gi]}) 성격의 분야(${ELEMENT_JOBS[gi].slice(0, 3).join(', ')} 등)는 성과에 비해 소모가 큰 편이에요.`,
      ),
      basis: `용신 ${ELEMENT_KO[ys]} · 기신 ${ELEMENT_KO[gi]} (${a.yongsin.method})`,
    });
  }
  {
    const risks = itemsOf(careerSec, '일하는 방식과 직장 리스크').filter((s) => s.tone === 'negative');
    if (risks.length) {
      career.push({
        title: '직장에서 부딪히기 쉬운 지점',
        text: W(`현실적으로 조심해야 할 지점도 분명히 있어요. ${risks.map((s) => s.text).join(' ')}`),
        basis: risks.map((s) => s.evidence).filter(Boolean).join(' · '),
      });
    }
  }
  {
    const tl = careerSec?.timeline?.items ?? [];
    const good = tl.filter((t) => t.verdict === '이직 적기');
    const bad = tl.filter((t) => t.verdict === '충동 이직 주의');
    const promo = tl.filter((t) => t.verdict === '승진·인정');
    const parts: string[] = [];
    if (good.length) parts.push(`이직이나 커리어 전환을 생각한다면 ${good.map((t) => `${t.year}년`).join(', ')}을 눈여겨보세요. 변화의 신호와 운의 뒷받침이 함께 들어오는 해예요. 특히 ${good[0].year}년에는 ${good[0].notes.slice(0, 2).map(plain).join(', ')} 같은 흐름이 있어요.`);
    else parts.push('앞으로 10년 중 “변화의 신호”와 “좋은 운”이 겹치는 해가 뚜렷하지 않아요. 이 경우 이직은 운보다 조건(연봉, 직무, 함께 일할 사람)을 기준으로 판단하는 것이 맞아요.');
    if (promo.length) parts.push(`${promo.map((t) => `${t.year}년`).join(', ')}은 지금 자리에서 인정받고 승진하기 좋은 해예요.`);
    if (bad.length) parts.push(`반대로 ${bad.map((t) => `${t.year}년`).join(', ')}은 그만두고 싶은 마음은 커지는데 운의 뒷받침은 약한 해예요. 이때의 감정적인 퇴사는 후회로 남기 쉬우니, 다음 자리를 확정하기 전에는 움직이지 마세요.`);
    if (a.currentDaeun) {
      const d = a.currentDaeun;
      const g = groupOf(d.stemTenGod);
      const tone = d.score >= 58 ? 'good' : d.score < 42 ? 'bad' : 'neutral';
      parts.push(`지금 지나고 있는 ${pillarKo(d.pillar)} 대운(${d.startYear}~${d.endYear}년)은 ${DECADE_THEME[g].label}의 10년이에요. ${DECADE_THEME[g][tone]}`);
    }
    career.push({ title: '이직과 커리어의 타이밍', text: parts.join(' '), basis: '향후 10년 세운의 월지충·식상·역마·관성 + 대운' });
  }

  // ---------------------------------------------------------------------------
  // 재물
  // ---------------------------------------------------------------------------
  const wealth: StoryPara[] = [];
  const wealthSec = sec('wealth');
  {
    const cap = wealthCapacity(a);
    const jae = gp['재성'];
    const text = {
      큼: `{who}의 사주는 일간의 힘(${a.strength.level})과 재물의 기운(재성 ${pct(jae)})을 함께 갖추고 있어요. 명리에서는 이를 “신왕재왕”에 가깝다고 봐요. 돈을 버는 힘과 지키는 힘이 함께 있어서, 기회가 왔을 때 규모를 키워도 감당할 수 있는 구조예요. 다만 이런 사주일수록 자신감이 과해져 무리한 확장을 하기 쉬우니, 잘될 때 일부를 반드시 떼어 두는 습관이 부를 오래 지켜 줘요.`,
      부담: `{who}의 사주는 재물의 기운(재성 ${pct(jae)})은 많은데, 그것을 감당할 일간의 힘(${a.strength.level})이 부족한 구조예요. 명리에서는 이를 “재다신약”이라고 불러요. 돈 될 만한 기회가 눈앞에 자주 보이지만, 욕심을 내 다 잡으려 하면 오히려 몸과 마음이 상하기 쉬워요. 돈 때문에 밤잠을 설쳤던 경험이 있다면 이 구조 때문이에요. 큰돈을 좇기보다 감당할 수 있는 규모를 꾸준히 지키는 것이 이 사주가 부자가 되는 길이에요.`,
      작음: `솔직하게 말씀드리면, {who}의 사주는 재물의 기운(재성 ${pct(jae)})이 약한 편이에요. 돈 자체에 대한 욕심이 크지 않고, 명분이나 사람, 일의 의미를 더 중요하게 여기는 경우가 많아요. 그 대신 돈을 모으고 불리는 감각은 타고나지 않았기 때문에, 수입이 늘어도 어느새 통장이 비어 있는 경험을 하기 쉬워요. 이 사주는 의지보다 구조로 해결해야 해요. 월급날 자동으로 빠져나가는 저축, 쉽게 꺼낼 수 없는 통장이 {who}의 재산을 결정해요.`,
      보통: `{who}의 사주에서 재물의 기운은 보통 수준이에요(재성 ${pct(jae)}, ${a.strength.level}). 한 번에 크게 버는 대박형보다는, 꾸준히 벌고 쌓아 가는 구조에서 성과가 나요. 크게 잃을 위험도, 크게 얻을 행운도 상대적으로 적은 만큼, 시간을 내 편으로 만드는 장기 저축과 투자가 잘 맞아요.`,
    }[cap];
    wealth.push({ title: '돈을 대하는 태도', text: W(text), basis: `재물 그릇 ${cap} · 재성 ${pct(jae)} · ${a.strength.level}` });
    const style = tgc['편재'] > tgc['정재'] ? 'pyeonjae' : tgc['정재'] > 0 ? 'jeongjae' : 'none';
    wealth.push({ title: '돈을 쓰는 습관', text: W(SPENDING_STORY[style]), basis: `편재 ${tgc['편재']} · 정재 ${tgc['정재']}` });
  }
  {
    const route = incomeRoute(a);
    const extra = itemsOf(wealthSec, '돈이 들어오는 방식').slice(1).map((s) => s.text.replace(/^주 수입 경로:\s*/, ''));
    const base = itemsOf(wealthSec, '돈이 들어오는 방식')[0]?.text.replace(/^주 수입 경로:\s*/, '') ?? '';
    const cap = itemsOf(wealthSec, '재물 그릇').slice(1).filter((s) => s.tone === 'positive').map((s) => s.text);
    wealth.push({
      title: '돈이 들어오는 길',
      text: W(`그렇다면 {who}에게 돈은 어디서 들어올까요? ${base} ${[...extra, ...cap].join(' ')}`),
      basis: `${route} ${pct(gp[route])} (재성 외 가장 강한 기운)`,
    });
  }
  {
    const leaks = itemsOf(wealthSec, '돈이 새는 길과 투자 성향').filter((s) => s.tone === 'negative' || (s.tone === 'caution' && !s.text.startsWith('공격적')));
    wealth.push({
      title: '돈이 새는 길',
      text: W(
        leaks.length
          ? `벌어들이는 것만큼 중요한 것이 새는 구멍을 막는 일이에요. ${leaks.map((s) => s.text).join(' ')}`
          : wealthCapacity(a) === '작음'
            ? '사주에 남에게 돈을 빼앗기는 구조(비겁·겁재 과다)는 뚜렷하지 않아요. 이 사주의 문제는 돈이 “새는 것”보다 “모이지 않는 것”이에요. 앞에서 말한 것처럼 의지보다 자동으로 모이는 구조를 만드는 것이 답이에요.'
            : '다행히 사주에 돈이 크게 새는 뚜렷한 구조는 보이지 않아요. 다만 이것이 “손해를 보지 않는다”는 뜻은 아니에요. 운이 나쁜 해에는 누구나 지출과 손실이 생기므로, 아래 재물 흐름에서 조심할 해를 확인해 두세요.',
      ),
      basis: leaks.length ? leaks.map((s) => s.evidence).filter(Boolean).join(' · ') : '비겁·겁재·편재 과다 없음',
    });
  }
  {
    const risk = investmentRisk(a);
    const text =
      risk >= 3
        ? '투자 성향으로 보면 {who}은 위험을 감당할 그릇이 있는 편이에요. 다만 그릇이 크다는 것과 모든 투자가 성공한다는 것은 다른 이야기예요. 손실을 끊는 기준을 미리 정하고, 한 곳에 몰지 않는 원칙만 지키면 공격적인 투자도 시도해 볼 만해요.'
        : risk === 2
          ? '투자 성향으로 보면 {who}은 중간쯤에 있어요. 전 재산을 거는 투자는 맞지 않지만, 자산의 일부(20~30% 이내)를 위험 자산에 두고 나머지는 안정적으로 굴리는 방식이 잘 맞아요.'
          : '투자 성향으로 보면 {who}에게 공격적인 투자는 맞지 않아요. 남이 추천한 종목, 단기 매매, 빚을 낸 투자는 손실로 끝나기 쉬운 구조예요. 원금을 지키는 상품과 적립식 투자처럼 시간이 일해 주는 방식을 고르세요. 재미는 덜해도 결국 가장 많이 남는 길이에요.';
    wealth.push({ title: '투자는 어떻게', text: W(text), basis: `${a.strength.level} · 재성 ${pct(gp['재성'])} · 비겁 ${pct(gp['비겁'])}` });
  }
  {
    const tl = wealthSec?.timeline?.items ?? [];
    const good = tl.filter((t) => t.verdict === '재물 기회').map((t) => t.year);
    const bad = tl.filter((t) => t.verdict === '손재 주의').map((t) => t.year);
    const parts: string[] = [];
    parts.push(good.length ? `앞으로 10년 중 돈의 흐름이 좋아지는 해는 ${good.join('년, ')}년이에요. 이 시기에 수입을 늘릴 기회(이직, 부업, 사업 확장)를 적극적으로 잡으세요.` : '앞으로 10년 동안 재물 운이 크게 치솟는 해는 뚜렷하지 않아요. 대신 꾸준함이 결과를 만드는 흐름이에요.');
    if (bad.length) parts.push(`${bad.join('년, ')}년은 손실을 조심해야 하는 해예요. 보증과 돈거래, 큰 투자는 이 시기를 피하세요.`);
    wealth.push({ title: '재물의 흐름', text: parts.join(' '), basis: '향후 10년 세운의 재성·식상·비겁 운 + 대운' });
  }

  // ---------------------------------------------------------------------------
  // 건강
  // ---------------------------------------------------------------------------
  const health: StoryPara[] = [];
  const healthSec = sec('health');
  const usedScenes = new Set<Element>();
  {
    const sorted = [...ELEMENTS].sort((x, y) => a.elements.percent[y] - a.elements.percent[x]);
    const top = sorted[0];
    const low = sorted[4];
    const parts: string[] = [];
    if (a.elements.percent[top] >= 30) {
      usedScenes.add(top);
      parts.push(`{who}의 몸에는 ${ELEMENT_KO[top]}(${ELEMENT_HANJA[top]}) 기운이 과하게 몰려 있어요(${pct(a.elements.percent[top])}). 한의학의 오행으로 보면 ${ELEMENT_ORGAN[top].organs} 쪽이에요. ${ELEMENT_ORGAN[top].excess} ${HEALTH_SCENE[top]}`);
    }
    if (a.elements.percent[low] < 10) {
      usedScenes.add(low);
      parts.push(`반대로 ${ELEMENT_KO[low]}(${ELEMENT_HANJA[low]}) 기운은 부족해요(${pct(a.elements.percent[low])}). ${ELEMENT_ORGAN[low].lack} ${HEALTH_SCENE[low]}`);
    }
    if (!parts.length) parts.push('{who}의 사주는 오행이 극단적으로 치우치지 않아 타고난 체질상 큰 약점은 두드러지지 않아요. 이런 체질은 생활 습관이 건강을 좌우하는 비중이 커요. 잠, 식사, 운동의 리듬이 무너지는 순간이 가장 큰 위험 신호예요.');
    health.push({ title: '몸의 체질', text: W(parts.join(' ')), basis: `${ELEMENT_KO[top]} ${pct(a.elements.percent[top])} · ${ELEMENT_KO[low]} ${pct(a.elements.percent[low])}` });
  }
  {
    const dmEl = STEMS[ds].element;
    const pace = isStrong(a)
      ? '{who}은 체력이 받쳐 주는 편이라, 피곤해도 “아직 괜찮다”며 몸을 몰아붙이기 쉬워요. 문제는 이런 사람일수록 쉬어야 할 때를 놓친다는 점이에요. 바쁜 일을 며칠 밤새워 끝낸 뒤 몸살이나 장염처럼 한꺼번에 탈이 난 경험이 있다면 바로 이 패턴이에요. 큰일이 끝나면 반드시 하루는 비워 두는 규칙을 만들어 두세요.'
      : '{who}은 타고난 체력이 넉넉한 편은 아니어서, 무리한 다음 날 회복이 남보다 느려요. 사람을 많이 만나거나 신경 쓸 일이 몰린 주에는 몸이 먼저 신호를 보내요. 남들과 같은 일정을 따라가려 애쓰기보다, 내 체력에 맞춘 일정표를 따로 갖는 것이 오래가는 비결이에요.';
    health.push({
      title: '지칠 때 몸이 보내는 신호',
      text: W(`${pace} 또 일간이 ${ELEMENT_KO[dmEl]}(${ELEMENT_HANJA[dmEl]})인 사람은 스트레스가 쌓이면 ${ELEMENT_ORGAN[dmEl].organs} 쪽으로 먼저 티가 나는 경향이 있어요.${usedScenes.has(dmEl) ? '' : ' ' + HEALTH_SCENE[dmEl]}`),
      basis: `신강약 ${pct(a.strength.score)} · 일간 ${STEMS[ds].hanja}(${ELEMENT_KO[dmEl]})`,
    });
  }
  {
    const items = itemsOf(healthSec, '체온·사고·정신 건강');
    if (items.length) health.push({ title: '몸의 온도와 마음의 건강', text: W(items.map((s) => s.text).join(' ')), basis: items.map((s) => s.evidence).filter(Boolean).join(' · ') });
  }
  {
    const tl = healthSec?.timeline?.items ?? [];
    // 가장 점수가 낮은 해 최대 3개만 강조 (모든 해를 나열하면 신호가 흐려진다)
    const careYears = tl
      .filter((t) => t.verdict === '집중 관리' || t.verdict === '관리 필요')
      .sort((x, y) => x.score - y.score)
      .slice(0, 3)
      .sort((x, y) => x.year - y.year);
    const text = careYears.length
      ? `특히 ${careYears.map((t) => `${t.year}년`).join(', ')}에는 컨디션 관리에 신경 써야 해요. ${careYears[0].year}년에는 ${careYears[0].notes.slice(0, 2).map(plain).join(', ') || '전반적인 체력 저하'}의 신호가 있어요. 이런 해에는 정기 검진을 미루지 말고, 무리한 일정을 줄이는 것이 가장 좋은 예방이에요.`
      : '앞으로 10년 중 건강 신호가 크게 나빠지는 해는 뚜렷하지 않아요. 그래도 매년 기본 검진은 꼭 챙기세요.';
    health.push({ title: '관리가 필요한 해', text, basis: '향후 10년 세운의 기신·충·형' });
  }
  health.push({
    title: '나에게 맞는 생활 처방',
    text: W(
      `이 사주에 가장 필요한 기운은 ${josa(`${ELEMENT_KO[a.yongsin.yongsin]}(${ELEMENT_HANJA[a.yongsin.yongsin]})`, '이에요/예요')}. 그래서 ${YONGSIN_HABIT[a.yongsin.yongsin]}이 몸과 마음의 균형을 잡아 줘요. 거창한 보약보다 매일의 작은 습관이 효과가 커요. 다만 사주로 보는 건강은 타고난 경향일 뿐 진단이 아니므로, 증상이 있다면 반드시 병원 진료를 받으세요.`,
    ),
    basis: `용신 ${ELEMENT_KO[a.yongsin.yongsin]}`,
  });

  // ---------------------------------------------------------------------------
  // 종합 — 인생 이야기
  // ---------------------------------------------------------------------------
  const summary: StoryPara[] = [];
  {
    const ys = a.yongsin.yongsin;
    summary.push({
      title: `${who}은 이런 사람이에요`,
      text: W(
        `{who}은 ${josa(dmKb.image.split('—')[1]?.trim() ?? dmKb.image, '을/를')} 닮은 사람이에요. ${dmKb.core} 사주 전체로 보면 ${a.strength.level}의 구조이고, 가장 강한 기운은 ${topGroup}(${pct(gp[topGroup])}), 가장 필요한 기운은 ${josa(`${ELEMENT_KO[ys]}(${ELEMENT_HANJA[ys]})`, '이에요/예요')}. 아래 이야기는 이 구조가 {who}의 삶에서 어떻게 나타나기 쉬운지를 시간 순서대로 풀어 본 거예요. 읽으면서 실제 기억과 비교해 보세요. 맞는 부분과 다른 부분을 알려 주시면 풀이를 더 정확하게 다듬는 데 쓰여요.`,
      ),
      basis: `${pillarHanja(a.pillars.day)}일주 · ${a.gyeokguk.name} · 용신 ${ELEMENT_KO[ys]}`,
    });
  }
  {
    const list = a.daeun.list;
    const { shape: kind, early, mid, late } = lifeShape(a);
    const SHAPE_TEXT: Record<LifeShape, string> = {
      대기만성형: '초년보다 중년 이후로 갈수록 운이 좋아지는 “대기만성형” 흐름이에요. 젊을 때 고생스럽게 느껴졌던 일들이 나중에 밑거름이 되는 구조예요.',
      '초년 강세형': '일찍 기회가 찾아오는 “초년 강세형” 흐름이에요. 젊을 때 쌓아 둔 것이 후반을 받쳐 주므로, 좋은 시기에 기반을 단단히 다져 두는 것이 중요해요.',
      '중년 절정형': '인생의 한가운데에 큰 기회가 몰리는 “중년 절정형” 흐름이에요. 그 시기를 위해 준비하는 것이 인생 전체의 결과를 좌우해요.',
      '고른 흐름형': '큰 기복 없이 고르게 흘러가는 흐름이에요. 극적인 대박도, 큰 추락도 적은 대신 선택과 꾸준함이 결과를 좌우해요.',
    };
    const shape = SHAPE_TEXT[kind];
    const best = [...list].sort((x, y) => y.score - x.score)[0];
    const worst = [...list].sort((x, y) => x.score - y.score)[0];
    summary.push({
      title: '인생의 큰 흐름',
      text: W(
        `사주는 10년마다 바뀌는 큰 운(대운)을 따라 흘러가요. {who}의 인생을 길게 놓고 보면 ${shape} 가장 순풍이 부는 10년은 만 ${Math.floor(best.startAge)}세부터(${best.startYear}~${best.endYear}년), 가장 몸을 낮춰야 하는 10년은 만 ${Math.floor(worst.startAge)}세부터(${worst.startYear}~${worst.endYear}년)예요.`,
      ),
      basis: `대운 평균 점수 초년 ${early.toFixed(0)} · 중년 ${mid.toFixed(0)} · 말년 ${late.toFixed(0)}`,
    });
  }
  summary.push({
    title: a.daeun.startAgeYears >= 1 ? `어린 시절 · 만 0~${a.daeun.startAgeYears}세` : '어린 시절',
    text: W(`${CHILDHOOD_STORY[groupOf(monthInfo.branchTenGod)]} 태어난 달은 부모와 성장 환경을 뜻하는 자리이기도 해요. 그 무렵의 기억과 비교해 보세요.`),
    basis: `월지 ${BRANCHES[a.pillars.month.branch].hanja}(${monthInfo.branchTenGod}) · 첫 대운 전`,
    when: 'past',
  });
  const ageNow = (a.now - a.pillars.conversion.utcMs) / (365.2422 * 86400000);
  const usedNotes = new Set<string>();
  for (const d of a.daeun.list.slice(0, 8)) {
    const g1 = groupOf(d.stemTenGod);
    const g2 = groupOf(d.branchTenGod);
    const tone = d.score >= 58 ? 'good' : d.score < 42 ? 'bad' : 'neutral';
    const a0 = Math.floor(d.startAge);
    const when: StoryPara['when'] = ageNow >= d.startAge + 10 ? 'past' : ageNow >= d.startAge ? 'now' : 'future';
    const head = when === 'past' ? '돌아보면 이 시기는 ' : when === 'now' ? '지금 {who}이 지나고 있는 시기예요. ' : '';
    const stage = lifeStage(d.startAge);
    const scene = STAGE_SCENE[g1][stage];
    const halves =
      g1 !== g2 ? ` 뒤의 5년으로 갈수록 ${DECADE_THEME[g2].label}의 흐름이 짙어져요. ${STAGE_SCENE[g2][stage]}` : '';
    const gnote =
      ['youth', 'settle', 'middle'].includes(stage)
        ? [...new Set([g1, g2])]
            .map((g) => GENDER_NOTE[g]?.[male ? 'male' : 'female'])
            .filter((n): n is string => !!n && !usedNotes.has(n) && (usedNotes.add(n), true))
            .join(' ')
        : '';
    const flagNote = d.flags
      .map((f) => flagText(f, stage))
      .filter(Boolean)
      .join(' ');
    const ask = when === 'past' ? ' 그 무렵의 기억과 비교해 보세요.' : '';
    summary.push({
      title: `만 ${a0}~${a0 + 9}세 · ${pillarHanja(d.pillar)} 대운 (${d.startYear}~${d.endYear})`,
      text: W(`${head}${DECADE_THEME[g1].label}의 10년이에요. ${scene} ${toneText(g1, tone, stage)}${halves}${gnote ? ' ' + gnote : ''}${flagNote ? ' ' + flagNote : ''}${ask}`),
      basis: `천간 ${d.stemTenGod}(${d.stemRole}) · 지지 ${d.branchTenGod}(${d.branchRole}) · ${d.score}점`,
      when,
    });
  }
  {
    const thisYear = a.seun.find((s) => s.year === a.currentSajuYear);
    const month = a.wolun.filter((w) => w.startMs <= a.now).at(-1);
    const parts: string[] = [];
    if (thisYear) {
      const r = readLuck(a, thisYear, '해', thisYear.combined);
      parts.push(`${thisYear.year}년은 {who}에게 ${josa(`“${r.headline}”`, '이에요/예요')}. ${r.good[0]} ${r.caution[0]}`);
    }
    if (month) {
      const r = readLuck(a, month, '달');
      parts.push(`이번 달은 ${josa(`“${r.headline}”`, '이에요/예요')}. ${r.good[0]}`);
    }
    if (parts.length) summary.push({ title: '그리고 지금', text: W(parts.join(' ')), basis: '올해 세운·이번 달 월운', when: 'now' });
  }
  return { summary, personality, love, career, wealth, health };
}

/** 대략적인 읽기 시간(분) — 한국어 분당 약 500자 */
export function readMinutes(paras: StoryPara[]): number {
  const chars = paras.reduce((s, p) => s + p.text.length, 0);
  return Math.max(1, Math.round(chars / 500));
}
