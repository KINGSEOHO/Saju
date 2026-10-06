/**
 * 3화 · 나의 인생 연대기 — 어린 시절(월지) + 대운 다섯 개 + 지금의 독백 + 다음 10년 예고.
 * 각 시기의 장면은 이야기형 풀이(인생 연대기)와 같은 기준(대운 십성·점수·충합 신호)으로 고른다.
 */
import { pillarHanja, type SajuAnalysis, type TenGodGroup } from '../engine/index.ts';
import { groupOf } from '../engine/tenGods.ts';
import { lifeShape } from '../report/metrics.ts';
import { DECADE_THEME, GENDER_NOTE, STAGE_SCENE, flagText, lifeStage, toneText, type LifeStage } from '../report/storyKb.ts';
import { cutRaw, makeCtx, say, shot, text, think, toneOf, type Ctx, type Scene } from './ctx.ts';
import type { Age, Beat, Comic, PanelTone } from './types.ts';

const CHILD_PANEL: Record<TenGodGroup, (c: Ctx) => Scene & { line2: string }> = {
  비겁: (c) => ({
    bg: 'park',
    line2: '고집과 자립심이 일찍 자란 아이',
    actors: [c.me(200, 'determined', 'fist', { age: 'kid' }), c.other('child', 420, 'angry', 'cross', { dir: -1, gender: c.male ? 'male' : 'female' })],
    lines: [say(0, '내가 할래! 내가 먼저야!', 'shout'), say(1, '치사해!')],
  }),
  식상: (c) => ({
    bg: 'home',
    line2: '말 많고 재주 많은 아이',
    actors: [c.me(200, 'grin', 'hold', { age: 'kid', held: 'drawing' }), c.other('parent', 420, 'laugh', 'idle', { dir: -1 })],
    lines: [say(0, '엄마! 이거 봐! 내가 그렸어!'), say(1, '어머, 천재 아니야?')],
  }),
  재성: (c) => ({
    bg: 'city',
    line2: '셈이 빠르고 현실 감각이 일찍 생긴 아이',
    actors: [c.me(260, 'thinking', 'hold', { age: 'kid', held: 'coin' })],
    lines: [say(0, '용돈 모아서 저거 사야지. 앞으로 3주!', 'think')],
  }),
  관성: (c) => ({
    bg: 'home',
    line2: '기대 속에서 일찍 철든 아이',
    actors: [c.me(200, 'nervous', 'hold', { age: 'kid', held: 'document' }), c.other('parent', 420, 'smile', 'cross', { dir: -1 })],
    lines: [say(1, '이번에도 100점이지?'), say(0, '(더 잘해야 해…)', 'think')],
  }),
  인성: (c) => ({
    bg: 'library',
    line2: '보살핌 속에서 배우기를 좋아한 아이',
    actors: [c.me(200, 'smile', 'hold', { age: 'kid', held: 'book' }), c.other('parent', 420, 'smile', 'idle', { dir: -1 })],
    lines: [say(0, '이 책 벌써 다 읽었어요!'), say(1, c.given ? `우리 ${c.given}, 최고야!` : '역시 우리 아이 최고야!')],
  }),
};

type DecadeScene = Scene & { line2: string };
type DecadeFn = (c: Ctx, age: Age) => DecadeScene;

/** 성인기(20~59세 무렵) 대운 장면: 그룹 × 길흉 × 2가지 (같은 장면이 이어지지 않게) */
const DECADE_SCENE: Record<TenGodGroup, Record<PanelTone, [DecadeFn, DecadeFn]>> = {
  비겁: {
    good: [
      (c, age) => ({
        bg: 'city',
        line2: '내 힘으로 자리를 잡는다',
        actors: [c.me(190, 'grin', 'cheer', { age }), c.other('friend', 420, 'laugh', 'cheer', { dir: -1 })],
        lines: [say(0, '드디어 내 이름 건 첫 시작!'), say(1, '우리가 해냈다!')],
      }),
      (c, age) => ({
        bg: 'office',
        line2: '내 사람들과 함께 일군다',
        actors: [c.other('friend', 190, 'grin', 'cheer'), c.me(420, 'proud', 'fist', { dir: -1, age })],
        lines: [say(0, '드디어 우리 팀이 생겼네!'), say(1, '이제 시작이야. 가 보자!')],
      }),
    ],
    neutral: [
      (c, age) => ({
        bg: 'crossroad',
        line2: '독립하고 싶은 마음이 커진다',
        actors: [c.me(200, 'determined', 'point', { age })],
        lines: [say(0, '이제 내 길은 내가 정할래.')],
        props: [{ kind: 'signpost', x: 450, label: '독립', label2: '안정' }],
      }),
      (c, age) => ({
        bg: 'home',
        line2: '내 힘으로 서 보는 시간',
        actors: [c.me(230, 'determined', 'hold', { age, held: 'bag' })],
        lines: [say(0, '이번엔 누구 도움 없이 해 볼래.')],
        props: [{ kind: 'boxes', x: 450 }],
      }),
    ],
    bad: [
      (c, age) => ({
        bg: 'cafe',
        line2: '사람과 돈 문제로 마음고생',
        actors: [c.other('friend', 190, 'nervous', 'hold', { held: 'document' }), c.me(420, 'shock', 'idle', { dir: -1, age, fx: ['sweat'] })],
        lines: [say(0, '딱 한 번만 보증 좀 서 줘…'), say(1, '(이걸 어떡하지…)', 'think')],
      }),
      (c, age) => ({
        bg: 'office',
        line2: '경쟁자에게 몫을 빼앗기기 쉽다',
        actors: [c.other('coworker', 190, 'smile', 'point'), c.me(420, 'angry', 'cross', { dir: -1, age, fx: ['anger'] })],
        lines: [say(0, '그 자리는 제가 맡기로 했어요.'), say(1, '(그건 내 몫이었는데…!)', 'think')],
      }),
    ],
  },
  식상: {
    good: [
      (c, age) => ({
        bg: 'stage',
        line2: '재능이 빛을 본다',
        actors: [c.me(300, 'grin', 'hold', { age, held: 'mic', fx: ['sparkle'] })],
        lines: [say(0, '내가 만든 걸 사람들이 좋아해!')],
      }),
      (c, age) => ({
        bg: 'cafe',
        line2: '실력이 결과물로 증명된다',
        actors: [c.me(200, 'laugh', 'hold', { age, held: 'phone', fx: ['sparkle'] }), c.other('friend', 420, 'surprised', 'idle', { dir: -1 })],
        lines: [say(1, '이거 네가 만든 거야? 대박!'), say(0, '반응이 이렇게 좋을 줄이야!')],
      }),
    ],
    neutral: [
      (c, age) => ({
        bg: 'cafe',
        line2: '새로운 일을 꿈꾸게 된다',
        actors: [c.me(260, 'thinking', 'think', { age, fx: ['bulb'] })],
        lines: [say(0, '이번엔 진짜 내 걸 만들어 볼까?')],
      }),
      (c, age) => ({
        bg: 'home',
        line2: '하고 싶은 일을 준비하게 된다',
        actors: [c.me(250, 'determined', 'hold', { age, held: 'notebook' })],
        lines: [say(0, '퇴근하고 내 일 준비 중!')],
      }),
    ],
    bad: [
      (c, age) => ({
        bg: 'office',
        line2: '말과 행동이 앞서 구설이 생긴다',
        actors: [c.other('boss', 190, 'angry', 'point'), c.me(420, 'nervous', 'idle', { dir: -1, age })],
        lines: [say(0, '또 말부터 앞섰구먼.'), say(1, '(벌여 놓은 일만 산더미…)', 'think')],
      }),
      (c, age) => ({
        bg: 'cafe',
        line2: '말 한마디가 구설로 번진다',
        actors: [c.other('friend', 190, 'sad', 'idle'), c.me(420, 'nervous', 'facepalm', { dir: -1, age })],
        lines: [say(0, '네가 한 말, 벌써 다 퍼졌더라.'), say(1, '(괜히 말했다…)', 'think')],
      }),
    ],
  },
  재성: {
    good: [
      (c, age) => ({
        bg: 'money',
        line2: '돈과 기회의 규모가 커진다',
        actors: [c.me(220, 'laugh', 'hold', { age, held: 'money', fx: ['sparkle'] })],
        lines: [say(0, '통장이 이렇게 불어나다니!')],
        props: [
          { kind: 'chartUp', x: 450, y: 196 },
          { kind: 'moneyBag', x: 460 },
        ],
      }),
      (c, age) => ({
        bg: 'city',
        line2: '활동 반경과 수입이 넓어진다',
        actors: [c.me(250, 'proud', 'wave', { age, held: 'bag' })],
        lines: [say(0, '이번 거래도 성공! 다음은 어디로?')],
      }),
    ],
    neutral: [
      (c, age) => ({
        bg: 'city',
        line2: '돈과 생활이 최대 관심사',
        actors: [c.me(260, 'thinking', 'hold', { age, held: 'phone' })],
        lines: [say(0, '이번 달 고정비가 얼마더라…', 'think')],
      }),
      (c, age) => ({
        bg: 'home',
        line2: '돈의 흐름을 배우는 때',
        actors: [c.me(260, 'thinking', 'hold', { age, held: 'notebook' })],
        lines: [say(0, '가계부를 써 보니 이제 좀 보이네.')],
      }),
    ],
    bad: [
      (c, age) => ({
        bg: 'gloom',
        line2: '욕심이 손실로 이어지기 쉽다',
        actors: [c.me(230, 'shock', 'hold', { age, held: 'wallet' })],
        lines: [say(0, '들어온 만큼 다 나가네…')],
        props: [{ kind: 'chartDown', x: 450, y: 196 }],
      }),
      (c, age) => ({
        bg: 'gloom',
        line2: '무리한 투자는 손실로 돌아온다',
        actors: [c.me(230, 'cry', 'hold', { age, held: 'phone' })],
        lines: [say(0, '투자한 게… 반토막?!', 'shout')],
        props: [{ kind: 'chartDown', x: 450, y: 196 }],
      }),
    ],
  },
  관성: {
    good: [
      (c, age) => ({
        bg: 'office',
        line2: '인정받고 자리가 잡힌다',
        actors: [c.me(190, 'proud', 'hold', { age, held: 'certificate' }), c.other('boss', 420, 'smile', 'idle', { dir: -1 })],
        lines: [say(1, '축하하네. 이제 팀을 맡아 주게.'), say(0, '열심히 하겠습니다!')],
      }),
      (c, age) => ({
        bg: 'stage',
        line2: '이름이 알려지고 명예가 따른다',
        actors: [c.me(300, 'proud', 'hold', { age, held: 'trophy', fx: ['shine'] })],
        lines: [say(0, '이 상은 함께한 모두 덕분입니다!')],
      }),
    ],
    neutral: [
      (c, age) => ({
        bg: 'office',
        line2: '맡는 책임과 역할이 늘어난다',
        actors: [c.me(230, 'determined', 'hold', { age, held: 'document' })],
        lines: [say(0, '책임이 늘었네. 그래도 해 보자.')],
        props: [{ kind: 'whiteboard', x: 450, y: 210 }],
      }),
      (c, age) => ({
        bg: 'office',
        line2: '책임질 사람과 일이 늘어난다',
        actors: [c.other('coworker', 190, 'nervous', 'hold', { held: 'document' }), c.me(420, 'determined', 'cross', { dir: -1, age })],
        lines: [say(0, '선배, 이건 어떻게 해요?'), say(1, '같이 보자. 내가 책임질게.')],
      }),
    ],
    bad: [
      (c, age) => ({
        bg: 'officeNight',
        line2: '압박에 짓눌리기 쉽다. 건강이 먼저',
        actors: [c.me(230, 'tired', 'facepalm', { age, fx: ['cloud'] })],
        lines: [say(0, '숨 좀 쉬고 싶다…', 'think')],
        props: [
          { kind: 'desk', x: 300 },
          { kind: 'papers', x: 352 },
        ],
      }),
      (c, age) => ({
        bg: 'office',
        line2: '평가와 압박이 거세진다',
        actors: [c.other('boss', 190, 'angry', 'point'), c.me(420, 'tired', 'idle', { dir: -1, age, fx: ['sweat'] })],
        lines: [say(0, '이번 실적, 어떻게 된 건가?'), say(1, '(숨이 턱 막힌다…)', 'think')],
      }),
    ],
  },
  인성: {
    good: [
      (c, age) => ({
        bg: 'library',
        line2: '배움과 귀인의 도움이 길을 연다',
        actors: [c.me(190, 'smile', 'hold', { age, held: 'certificate' }), c.other('teacher', 420, 'smile', 'idle', { dir: -1 })],
        lines: [say(1, '자네라면 할 수 있어.'), say(0, '도와주셔서 감사합니다!')],
      }),
      (c, age) => ({
        bg: 'home',
        line2: '공부와 자격이 결실을 맺는다',
        actors: [c.me(260, 'grin', 'hold', { age, held: 'certificate', fx: ['sparkle'] })],
        lines: [say(0, '드디어 합격이다!', 'shout')],
      }),
    ],
    neutral: [
      (c, age) => ({
        bg: 'library',
        line2: '드러나지 않게 내공이 쌓인다',
        actors: [c.me(260, 'thinking', 'hold', { age, held: 'book' })],
        lines: [say(0, '지금은 실력을 쌓을 때야.')],
      }),
      (c, age) => ({
        bg: 'cafe',
        line2: '배우고 준비하는 시간',
        actors: [c.me(260, 'smile', 'hold', { age, held: 'book' })],
        lines: [say(0, '퇴근 후 공부, 오늘도 한 장!')],
      }),
    ],
    bad: [
      (c, age) => ({
        bg: 'bedroom',
        line2: '생각만 많고 실행이 막힌다',
        actors: [c.me(250, 'worried', 'think', { age, fx: ['question'] })],
        lines: [say(0, '생각만 하다 또 한 달이 갔네…', 'think')],
      }),
      (c, age) => ({
        bg: 'home',
        line2: '미루는 습관이 기회를 놓치게 한다',
        actors: [c.me(250, 'nervous', 'shrug', { age })],
        lines: [say(0, '다음 달부터는 진짜 시작할게…')],
      }),
    ],
  },
};

type Lines = { kid: string; teen: string };
const pick = (age: Age, l: Lines) => (age === 'kid' ? l.kid : l.teen);

/** 어린이·10대 대운 장면 — 나이(어린이/10대)마다 대사가 달라 같은 그룹이 이어져도 겹치지 않는다 */
const YOUNG_SCENE: Record<TenGodGroup, (c: Ctx, age: Age, tone: PanelTone) => DecadeScene> = {
  비겁: (c, age, tone) => ({
    bg: age === 'kid' ? 'park' : 'school',
    line2: tone === 'bad' ? '경쟁과 다툼이 잦다' : '친구들과 겨루며 자란다',
    actors: [c.me(200, tone === 'bad' ? 'angry' : 'determined', 'fist', { age }), c.other('friend', 420, tone === 'bad' ? 'angry' : 'grin', 'cross', { dir: -1, age })],
    lines:
      tone === 'bad'
        ? [say(0, pick(age, { kid: '내 장난감 만지지 마!', teen: '쟤한테만은 절대 안 져!' })), say(1, pick(age, { kid: '치사해!', teen: '흥, 두고 봐!' }))]
        : [say(0, pick(age, { kid: '달리기는 내가 1등!', teen: '이번 시합은 꼭 이긴다!' })), say(1, pick(age, { kid: '다음엔 내가 이길 거야!', teen: '좋아, 붙어 보자!' }))],
  }),
  식상: (c, age, tone) => ({
    bg: 'school',
    line2: tone === 'bad' ? '하고 싶은 것과 해야 할 것 사이의 갈등' : '재주와 끼가 드러난다',
    actors: [c.me(200, tone === 'bad' ? 'nervous' : 'grin', tone === 'bad' ? 'idle' : 'cheer', { age }), c.other('teacher', 420, tone === 'bad' ? 'angry' : 'surprised', 'idle', { dir: -1 })],
    lines:
      tone === 'bad'
        ? [say(1, pick(age, { kid: '수업 시간엔 조용히 해야지!', teen: '수업 시간에 딴짓하지 말랬지!' })), say(0, pick(age, { kid: '(할 말이 너무 많은데…)', teen: '(이게 더 재밌는데…)' }), 'think')]
        : [say(1, pick(age, { kid: '장기자랑 나갈 사람?', teen: '장래 희망은 정했니?' })), say(0, pick(age, { kid: '저요! 저요!', teen: '하고 싶은 게 너무 많아요!' }))],
  }),
  재성: (c, age, tone) => ({
    bg: 'city',
    line2: tone === 'bad' ? '갖고 싶은 것 앞에서 애가 탄다' : '돈과 현실에 일찍 눈뜬다',
    actors: [c.me(260, tone === 'bad' ? 'worried' : 'proud', 'hold', { age, held: 'coin' })],
    lines: [
      say(
        0,
        tone === 'bad'
          ? pick(age, { kid: '용돈이 벌써 다 떨어졌어…', teen: '사고 싶은 건 많은데 돈이 없어…' })
          : pick(age, { kid: '저금통이 꽉 찼다!', teen: '알바해서 번 내 첫 돈!' }),
      ),
    ],
  }),
  관성: (c, age, tone) => ({
    bg: 'school',
    line2: tone === 'bad' ? '평가와 규칙에 짓눌린다' : '책임 있는 역할을 맡는다',
    actors: [c.me(260, tone === 'bad' ? 'tired' : 'proud', 'hold', { age, held: tone === 'bad' ? 'document' : 'certificate' })],
    lines: [
      say(
        0,
        tone === 'bad'
          ? pick(age, { kid: '숙제, 또 숙제…', teen: '시험, 시험, 또 시험…' })
          : pick(age, { kid: '받아쓰기 100점 받았어요!', teen: '반장이 됐다! 책임감 뿜뿜!' }),
      ),
    ],
  }),
  인성: (c, age, tone) =>
    tone === 'bad' && age === 'kid'
      ? {
          bg: 'home',
          line2: '어른에게 기대고 미루는 습관이 생기기 쉽다',
          actors: [c.me(200, 'nervous', 'hold', { age, held: 'notebook' }), c.other('parent', 420, 'tired', 'cross', { dir: -1 })],
          lines: [say(0, '숙제… 엄마가 도와주면 안 돼요?'), say(1, '또? 이번엔 혼자 해 보자.')],
        }
      : {
          bg: 'library',
          line2: tone === 'bad' ? '생각이 많아 고민이 깊어진다' : '좋은 선생님과 배움을 만난다',
          actors: [c.me(260, tone === 'bad' ? 'worried' : 'smile', tone === 'bad' ? 'think' : 'hold', { age, held: tone === 'bad' ? undefined : 'book' })],
          lines: [
            tone === 'bad'
              ? say(0, '생각이 많아서 잠이 안 와…', 'think')
              : say(0, pick(age, { kid: '이 책 너무 재밌어요!', teen: '공부가 재밌어지기 시작했어!' })),
          ],
        },
};

/** 60대 이후 대운 장면 — [보통·좋음, 나쁨] 각각 2가지 */
const SENIOR_SCENE: Record<TenGodGroup, { ok: [DecadeFn, DecadeFn]; bad: [DecadeFn, DecadeFn] }> = {
  비겁: {
    ok: [
      (c) => ({
        bg: 'park',
        line2: '또래와 어울리는 자립의 시간',
        actors: [c.me(190, 'laugh', 'wave', { age: 'senior' }), c.other('elder', 420, 'laugh', 'wave', { dir: -1 })],
        lines: [say(0, '역시 친구들이랑 걷는 게 최고야!')],
      }),
      (c) => ({
        bg: 'cafe',
        line2: '오랜 친구가 힘이 되는 때',
        actors: [c.other('elder', 190, 'grin', 'hold', { held: 'coffee' }), c.me(420, 'laugh', 'idle', { dir: -1, age: 'senior' })],
        lines: [say(0, '우리 동창 모임, 이번 달도 꼭 와!'), say(1, '당연하지, 그게 낙인데!')],
      }),
    ],
    bad: [
      (c) => ({
        bg: 'park',
        line2: '사람 사이의 돈 문제를 조심할 때',
        actors: [c.other('elder', 190, 'grin', 'point'), c.me(420, 'worried', 'idle', { dir: -1, age: 'senior' })],
        lines: [say(0, '이번에 같이 투자 하나 할래?'), say(1, '(이 나이에 모험은…)', 'think')],
      }),
      (c) => ({
        bg: 'home',
        line2: '고집이 외로움이 되지 않게',
        actors: [c.me(260, 'sad', 'cross', { age: 'senior' })],
        lines: [say(0, '내 말이 맞는데… 다들 왜 안 듣지?', 'think')],
      }),
    ],
  },
  식상: {
    ok: [
      (c) => ({
        bg: 'home',
        line2: '배우고 표현하는 즐거움',
        actors: [c.me(220, 'grin', 'wave', { age: 'senior', held: 'brush' })],
        lines: [say(0, '요즘 그림 배우는 재미에 산다!')],
        props: [{ kind: 'easel', x: 440 }],
      }),
      (c) => ({
        bg: 'park',
        line2: '손주와 취미가 삶을 젊게 만든다',
        actors: [c.me(200, 'laugh', 'cheer', { age: 'senior', fx: ['music'] }), c.other('child', 420, 'grin', 'cheer', { dir: -1 })],
        lines: [say(1, c.male ? '할아버지 노래 또 불러 주세요!' : '할머니 노래 또 불러 주세요!'), say(0, '그래, 따라 불러 봐!')],
      }),
    ],
    bad: [
      (c) => ({
        bg: 'home',
        line2: '마음은 앞서는데 몸이 따라 주지 않는다',
        actors: [c.me(220, 'tired', 'wave', { age: 'senior', held: 'brush' })],
        lines: [say(0, '하고 싶은 건 많은데 몸이 안 따라 주네.')],
        props: [{ kind: 'easel', x: 440 }],
      }),
      (c) => ({
        bg: 'home',
        line2: '잔소리가 서운함을 부르기 쉽다',
        actors: [c.me(200, 'angry', 'point', { age: 'senior' }), c.other('child', 420, 'sad', 'idle', { dir: -1 })],
        lines: [say(0, '그건 그렇게 하는 게 아니라니까!'), say(1, '(또 시작이다…)', 'think')],
      }),
    ],
  },
  재성: {
    ok: [
      (c) => ({
        bg: 'home',
        line2: '모은 것을 정리하고 나누는 때',
        actors: [c.me(260, 'thinking', 'hold', { age: 'senior', held: 'document' })],
        lines: [say(0, '재산 정리는 미리미리 해 두자.')],
      }),
      (c) => ({
        bg: 'home',
        line2: '쓰고 남기는 균형을 잡는 때',
        actors: [c.me(200, 'smile', 'hold', { age: 'senior', held: 'gift' }), c.other('child', 420, 'love', 'idle', { dir: -1 })],
        lines: [say(0, '이건 우리 손주 몫이야.'), say(1, '와, 고맙습니다!')],
      }),
    ],
    bad: [
      (c) => ({
        bg: 'home',
        line2: '노후 자금을 단단히 챙겨야 할 때',
        actors: [c.me(260, 'worried', 'hold', { age: 'senior', held: 'document' })],
        lines: [say(0, '노후 자금이 생각보다 빠듯하네…')],
      }),
      (c) => ({
        bg: 'gloom',
        line2: '큰돈이 오가는 결정은 피할 때',
        actors: [c.me(260, 'shock', 'hold', { age: 'senior', held: 'phone' })],
        lines: [say(0, '이 수익률… 너무 좋아서 수상한데?', 'think')],
      }),
    ],
  },
  관성: {
    ok: [
      (c) => ({
        bg: 'park',
        line2: '건강과 규칙적인 생활이 가장 큰 과제',
        actors: [c.me(280, 'smile', 'fist', { age: 'senior' })],
        lines: [say(0, '매일 걷고, 검진은 꼭 챙기자!')],
      }),
      (c) => ({
        bg: 'gym',
        line2: '몸을 돌보는 습관이 운을 지킨다',
        actors: [c.me(260, 'determined', 'fighting', { age: 'senior' })],
        lines: [say(0, '오늘도 운동 완료! 몸이 가볍네.')],
        props: [{ kind: 'dumbbell', x: 460 }],
      }),
    ],
    bad: [
      (c) => ({
        bg: 'home',
        line2: '건강과 규칙적인 생활이 가장 큰 과제',
        actors: [c.me(280, 'tired', 'idle', { age: 'senior', fx: ['sweat'] })],
        lines: [say(0, '여기저기 쑤시네… 병원 예약해야지.')],
      }),
      (c) => ({
        bg: 'home',
        line2: '무리하지 말고 쉬어 가야 할 때',
        actors: [c.me(260, 'tired', 'facepalm', { age: 'senior' })],
        lines: [say(0, '예전 같지 않네… 오늘은 쉬자.', 'think')],
      }),
    ],
  },
  인성: {
    ok: [
      (c) => ({
        bg: 'home',
        line2: '지혜를 나누고 보살핌을 받는 때',
        actors: [c.me(200, 'smile', 'hold', { age: 'senior', held: 'book' }), c.other('child', 420, 'grin', 'idle', { dir: -1 })],
        lines: [say(1, '옛날이야기 또 해 주세요!'), say(0, '그래, 그럼 오늘은…')],
      }),
      (c) => ({
        bg: 'library',
        line2: '마음공부와 배움이 즐거운 때',
        actors: [c.me(260, 'smile', 'hold', { age: 'senior', held: 'book' })],
        lines: [say(0, '이 나이에 배우는 게 제일 재밌네.')],
      }),
    ],
    bad: [
      (c) => ({
        bg: 'home',
        line2: '기대고 싶은 마음과 미안한 마음 사이',
        actors: [c.me(280, 'worried', 'think', { age: 'senior' })],
        lines: [say(0, '자식들한테 짐이 될까 봐 걱정이야.', 'think')],
      }),
      (c) => ({
        bg: 'night',
        line2: '생각이 많아 잠 못 드는 밤',
        actors: [c.me(280, 'tired', 'idle', { age: 'senior', fx: ['gloom'] })],
        lines: [say(0, '이런저런 생각에 잠이 안 오네…', 'think')],
      }),
    ],
  },
};

function ageOfStage(s: LifeStage): Age {
  if (s === 'child') return 'kid';
  if (s === 'teen') return 'teen';
  if (s === 'senior') return 'senior';
  return 'adult';
}

/** 결혼·이사·이직처럼 특정 신호가 있는 시기의 장면 (2가지씩) */
const LOVE: [DecadeFn, DecadeFn] = [
  (c, age) => ({
    bg: 'dinner',
    line2: '깊은 인연이 들어오기 쉽다',
    actors: [c.me(150, 'love', 'cheeks', { age }), c.other('partner', 450, 'smile', 'idle', { dir: -1, fx: ['hearts'] })],
    lines: [say(1, '우리, 앞으로도 함께할래?'), say(0, '응, 좋아!')],
    props: [{ kind: 'table', x: 300 }],
  }),
  (c, age) => ({
    bg: 'park',
    line2: '인연이 깊어지는 시기',
    actors: [c.me(200, 'love', 'idle', { age }), c.other('partner', 410, 'smile', 'wave', { dir: -1, fx: ['hearts'] })],
    lines: [say(1, '오래오래 같이 걷자.'), say(0, '응, 약속!')],
    props: [{ kind: 'bench', x: 300 }],
  }),
];
const MOVE: Record<'good' | 'bad', [DecadeFn, DecadeFn]> = {
  good: [
    (c, age) => ({
      bg: 'home',
      line2: '이사·관계·생활에 변동이 생긴다',
      actors: [c.me(230, 'grin', 'cheer', { age })],
      lines: [say(0, '새집으로 이사! 새 출발이다!')],
      props: [{ kind: 'boxes', x: 450 }],
    }),
    (c, age) => ({
      bg: 'city',
      line2: '생활의 무대가 바뀐다',
      actors: [c.me(250, 'grin', 'wave', { age, held: 'bag' })],
      lines: [say(0, '새 동네, 새 생활! 설렌다.')],
    }),
  ],
  bad: [
    (c, age) => ({
      bg: 'home',
      line2: '이사·관계·건강에 변동이 생긴다',
      actors: [c.me(230, 'nervous', 'shrug', { age })],
      lines: [say(0, '또 짐을 싸야 하네… 정신없다.')],
      props: [{ kind: 'boxes', x: 450 }],
    }),
    (c, age) => ({
      bg: 'rain',
      line2: '집과 관계에 흔들림이 생긴다',
      actors: [c.me(260, 'worried', 'wave', { age, held: 'umbrella' })],
      lines: [say(0, '요즘 왜 이렇게 다 흔들리지…', 'think')],
    }),
  ],
};
const JOB: Record<'good' | 'bad', [DecadeFn, DecadeFn]> = {
  good: [
    (c, age) => ({
      bg: 'city',
      line2: '직장과 환경이 크게 바뀐다',
      actors: [c.me(260, 'grin', 'wave', { age, held: 'bag' })],
      lines: [say(0, '새 회사 첫 출근! 잘해 보자.')],
    }),
    (c, age) => ({
      bg: 'office',
      line2: '새 무대에서 다시 시작한다',
      actors: [c.me(240, 'determined', 'fighting', { age })],
      lines: [say(0, '새 팀, 새 업무. 다시 시작이다!')],
    }),
  ],
  bad: [
    (c, age) => ({
      bg: 'crossroad',
      line2: '직장과 환경이 크게 바뀐다',
      actors: [c.me(200, 'thinking', 'think', { age })],
      lines: [say(0, '여기 계속 있어야 할까…?', 'think')],
      props: [{ kind: 'signpost', x: 450, label: '이직', label2: '잔류' }],
    }),
    (c, age) => ({
      bg: 'office',
      line2: '자리가 흔들리기 쉽다',
      actors: [c.me(260, 'worried', 'hold', { age, held: 'bag' })],
      lines: [say(0, '조직 개편이라니… 내 자리는?', 'think')],
    }),
  ],
};

interface DecadePick {
  scene: DecadeScene;
  kind: 'love' | 'move' | 'job' | 'normal';
}

function decadeScene(c: Ctx, g: TenGodGroup, tone: PanelTone, stage: LifeStage, flags: string[], used: Set<string>): DecadePick {
  const age = ageOfStage(stage);
  const once = (key: string, fns: [DecadeFn, DecadeFn]): DecadeScene => {
    const v = used.has(key) ? 1 : 0;
    used.add(key);
    return fns[v](c, age);
  };
  if (age === 'kid' || age === 'teen') return { scene: YOUNG_SCENE[g](c, age, tone), kind: 'normal' };
  if (age === 'senior') {
    const t = tone === 'bad' ? 'bad' : 'ok';
    return { scene: once(`senior-${g}-${t}`, SENIOR_SCENE[g][t]), kind: 'normal' };
  }
  const spouseStar: TenGodGroup = c.male ? '재성' : '관성';
  const loveStage = stage === 'youth' || stage === 'settle';
  if (loveStage && (flags.some((f) => f.startsWith('일지합')) || (g === spouseStar && tone !== 'bad'))) return { scene: once('love', LOVE), kind: 'love' };
  const t = tone === 'good' ? 'good' : 'bad';
  if (flags.some((f) => f.startsWith('일지충'))) return { scene: once(`move-${t}`, MOVE[t]), kind: 'move' };
  if (flags.some((f) => f.startsWith('월지충'))) return { scene: once(`job-${t}`, JOB[t]), kind: 'job' };
  return { scene: once(`${g}-${tone}`, DECADE_SCENE[g][tone]), kind: 'normal' };
}

const SHAPE_DESC: Record<string, string> = {
  대기만성형: '시간이 갈수록 단단해지는 인생',
  '초년 강세형': '일찍 꽃피고, 지키는 힘이 중요한 인생',
  '중년 절정형': '한가운데에서 가장 빛나는 인생',
  '고른 흐름형': '큰 굴곡 없이 꾸준히 나아가는 인생',
};
const SHAPE_LINE: Record<string, string> = {
  대기만성형: '초반엔 더디지만, 뒤로 갈수록 운이 받쳐 준다.',
  '초년 강세형': '젊은 시절 운이 강하고, 뒤로 갈수록 지키는 힘이 중요해진다.',
  '중년 절정형': '인생의 한가운데, 중년에 가장 큰 운이 몰려 있다.',
  '고른 흐름형': '시기마다 큰 차이 없이, 꾸준함이 무기인 흐름이다.',
};

const NOW_LINE: Record<PanelTone, (theme: string) => string> = {
  good: (t) => `(지금이 바로 ${t}의 때야. 놓치지 말자.)`,
  neutral: (t) => `(지금은 ${t}의 시간. 차근차근 가자.)`,
  bad: () => '(지금은 버티는 시간. 그래도 지나간다.)',
};

export function lifeEpisode(a: SajuAnalysis): Comic {
  const c = makeCtx(a, null, 'life');
  const beats: Beat[] = [];
  const { shape, early, mid, late } = lifeShape(a);
  const monthInfo = a.positions.find((p) => p.pos === 'month')!;
  const cg = groupOf(monthInfo.branchTenGod);
  const child = CHILD_PANEL[cg](c);
  const firstAge = a.daeun.startAgeYears;
  const list = a.daeun.list;
  const ageNow = (a.now - a.pillars.conversion.utcMs) / (365.2422 * 86400000);

  beats.push(
    cutRaw(c, '표지', '', { bg: 'mountain', actors: [c.me(410, 'smile', 'hips', { dir: -1 })], lines: [] }, { cover: { kicker: '3화', title: '나의 인생 연대기', tagline: `${shape} — ${SHAPE_DESC[shape]}` } }),
  );
  beats.push(
    text(`내 인생 그래프는 ‘${shape}’.\n${SHAPE_LINE[shape]}`, 'plain', {
      title: '인생 그래프',
      basis: `대운 평균 초년 ${early} · 중년 ${mid} · 말년 ${late}점`,
      note: `10년마다 바뀌는 대운의 점수를 이어 보면 인생의 큰 흐름이 보입니다. 초년 ${early}점, 중년 ${mid}점, 말년 ${late}점으로 ‘${shape}’에 가깝습니다.`,
    }),
  );

  const { line2: childLine, ...childScene } = child;
  beats.push(
    cutRaw(c, '어린 시절', `어린 시절${firstAge >= 1 ? ` (만 0~${firstAge}세)` : ''}\n${childLine}`, childScene, {
      badge: ageNow < list[0].startAge ? '지금 여기!' : undefined,
      basis: `월지 ${pillarHanja(a.pillars.month).slice(1)}(${monthInfo.branchTenGod}) · 성장 환경`,
      note: `태어난 달은 부모와 성장 환경을 뜻하는 자리입니다. 이 자리에 ${monthInfo.branchTenGod}(${cg})이 있어 이런 어린 시절을 보냈을 가능성이 큽니다. 실제 기억과 비교해 보세요.`,
      tone: 'neutral',
    }),
  );

  const found = list.findIndex((d) => ageNow >= d.startAge && ageNow < d.startAge + 10);
  const cur = found >= 0 ? found : ageNow >= list[0].startAge ? list.length - 1 : 0;
  const start = Math.max(0, Math.min(cur - 2, list.length - 5));
  const shown = list.slice(start, start + 5);
  const best = shown.reduce((m, d) => (d.score > m.score ? d : m), shown[0]);
  const worst = shown.reduce((m, d) => (d.score < m.score ? d : m), shown[0]);
  const used = new Set<string>();
  shown.forEach((d) => {
    const g = groupOf(d.stemTenGod);
    const tone = toneOf(d.score);
    const stage = lifeStage(d.startAge);
    const { scene, kind } = decadeScene(c, g, tone, stage, d.flags, used);
    const { line2, ...sc } = scene;
    const a0 = Math.floor(d.startAge);
    const isNow = ageNow >= d.startAge && ageNow < d.startAge + 10;
    const badge = isNow ? '지금 여기!' : d === best && d.score >= 58 ? '전성기' : d === worst && d.score < 42 ? '버티는 시기' : undefined;
    const theme = DECADE_THEME[g];
    const flagNote = d.flags
      .map((f) => flagText(f, stage))
      .filter(Boolean)
      .join(' ');
    const genderNote = kind === 'love' ? (GENDER_NOTE[g]?.[c.male ? 'male' : 'female'] ?? '') : '';
    beats.push(
      cutRaw(c, `만 ${a0}~${a0 + 9}세`, `만 ${a0}~${a0 + 9}세 · ${theme.label}의 10년\n${line2}`, sc, {
        badge,
        basis: `${pillarHanja(d.pillar)} 대운 · ${d.stemTenGod}(${d.stemRole}) · ${d.score}점`,
        note: [`${d.startYear}~${d.endYear}년.`, STAGE_SCENE[g][stage], toneText(g, tone, stage), genderNote, flagNote].filter(Boolean).join(' '),
        tone,
      }),
    );
    if (isNow) {
      const face = tone === 'good' ? 'sparkle' : tone === 'bad' ? 'determined' : 'thinking';
      const mood = tone === 'good' ? 'sparkle' : tone === 'bad' ? 'tone' : 'soft';
      beats.push(
        cutRaw(c, '지금 여기', '그리고 지금, 나는 여기에 서 있다.', { bg: 'night', ...shot('close', mood), actors: [c.me(230, face, 'idle')], lines: [think(0, NOW_LINE[tone](theme.label))] }, {
          basis: `현재 대운 ${pillarHanja(d.pillar)} · ${d.score}점`,
          note: `지금은 ${d.startYear}~${d.endYear}년의 대운, ‘${theme.label}’의 10년입니다. ${toneText(g, tone, stage)}`,
        }),
      );
      const next = list[list.indexOf(d) + 1];
      if (next) {
        const ng = groupOf(next.stemTenGod);
        beats.push(
          text(`그리고 다음 10년(${next.startYear}~${next.endYear}년)은\n‘${DECADE_THEME[ng].label}’의 시간.`, 'soft', {
            title: '다음 10년',
            basis: `${pillarHanja(next.pillar)} 대운 · ${next.stemTenGod} · ${next.score}점`,
            note: toneText(ng, toneOf(next.score), lifeStage(next.startAge)),
          }),
        );
      }
    }
  });

  beats.push(text('사주는 정해진 운명이 아니라 흐름의 지도다.\n흐름을 알면, 준비할 수 있다.', 'soft'));
  const final: Scene = {
    bg: 'crossroad',
    actors: [c.me(220, 'grin', 'wave'), c.mirror(440, 'smile', { dir: -1 })],
    lines: [say(0, '다음 10년도 잘 부탁해!'), say(1, '언제든 다시 비춰 줄게!')],
  };
  beats.push(cutRaw(c, '앞으로도', '앞으로도, 나답게.', final));

  return {
    id: 'life',
    no: 3,
    title: '나의 인생 연대기',
    subtitle: `${pillarHanja(a.pillars.day)}일주 · ${shape} · 대운 ${a.daeun.forward ? '순행' : '역행'}`,
    beats,
  };
}
