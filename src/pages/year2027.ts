/**
 * 검색용 페이지 — 2027 정미년 일간별 운세 (/2027/ 과 /2027/<일간>/ 열 편).
 * 사이트를 만들 때(빌드) 계산 엔진과 풀이 지식(report/luckReading.ts, report/kb.ts)에서 그대로 뽑아 쓴다 — 유료 리포트·결과 화면과 말이 어긋나지 않게.
 * 여기서는 일간 하나만 본다(누구나 같은 내용). '내 사주에서 도움인지 부담인지, 몇 월에'는 결과 화면과 신년운세 리포트의 몫이다.
 */
import { BRANCHES, ELEMENT_HANJA, ELEMENT_KO, STEMS } from '../engine/constants.ts';
import { josa } from '../engine/josa.ts';
import { fmtKst, ipchunMs, jieAround, yearMonthPillarsAt, yearPillarOf } from '../engine/pillars.ts';
import { TEN_GOD_HANJA, tenGodOfBranch, tenGodOfStem, type TenGod } from '../engine/tenGods.ts';
import { DAY_MASTER } from '../report/kb.ts';
import { GOD } from '../report/luckReading.ts';
import { stemArt } from './stemArt.ts';

export const YEAR = 2027;
const SITE = 'https://mgsaju.io.kr';
const SLUGS = ['gap', 'eul', 'byeong', 'jeong', 'mu', 'gi', 'gyeong', 'sin', 'im', 'gye'];
const YP = yearPillarOf(YEAR);
const Y_KO = STEMS[YP.stem].ko + BRANCHES[YP.branch].ko; // 정미
const Y_HANJA = STEMS[YP.stem].hanja + BRANCHES[YP.branch].hanja; // 丁未

const nameOf = (i: number) => STEMS[i].ko + ELEMENT_KO[STEMS[i].element]; // 갑목
const hanjaOf = (i: number) => STEMS[i].hanja + ELEMENT_HANJA[STEMS[i].element]; // 甲木
const batchim = (w: string) => (w.charCodeAt(w.length - 1) - 0xac00) % 28 !== 0;
const head = (s: string) => s.replace('{p}', '시기');
const li = (list: string[]) => list.map((t) => `<li>${t}</li>`).join('');
/** '2027. 02. 04. 10:46' → '2월 4일 10:46' */
const kst = (ms: number) => {
  const [, mo, d, t] = fmtKst(ms).match(/\d+\. (\d+)\. (\d+)\. (\d+:\d+)/)!;
  return `${Number(mo)}월 ${Number(d)}일 ${t}`;
};

export interface Page {
  /** 'index.html' 기준 폴더 — '2027' 또는 '2027/gap' */
  dir: string;
  html: string;
}

function shell(o: { dir: string; title: string; desc: string; ogTitle: string; body: string; script?: string }): string {
  const up = o.dir
    .split('/')
    .map(() => '..')
    .join('/');
  const url = `${SITE}/${o.dir}/`;
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${o.title}</title>
    <meta name="description" content="${o.desc}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="명경사주" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${o.ogTitle}" />
    <meta property="og:description" content="${o.desc}" />
    <meta property="og:image" content="${SITE}/og.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="theme-color" content="#fcfbf8" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#121110" media="(prefers-color-scheme: dark)" />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2222%22 fill=%22%2333574d%22/><text x=%2250%22 y=%2268%22 font-size=%2256%22 font-family=%22serif%22 text-anchor=%22middle%22 fill=%22%23ffffff%22>命</text></svg>" />
  </head>
  <body class="bg-bg text-ink">
    <header class="wrap flex items-center justify-between pt-5">
      <a href="${up}/" class="hanja text-title3 font-bold text-ink">명경사주</a>
      <a href="${up}/" class="link text-label">내 사주 보기</a>
    </header>
    <main class="wrap pt-10 pb-16">
${o.body}
    </main>
    <footer class="wrap pb-10 text-center text-cap text-sub">
      <a href="${up}/time/" class="underline">출생시간 보정 계산기</a> · <a href="${up}/#/terms" class="underline">이용약관</a> · <a href="${up}/#/privacy" class="underline">개인정보처리방침</a> · <a href="${up}/#/pricing" class="underline">요금 안내</a>
    </footer>
    <script type="module" src="/src/pages/${o.script ?? 'static'}.ts"></script>
  </body>
</html>
`;
}

/** 일간 열 개로 가는 줄 — cur는 지금 보고 있는 일간 */
function stemLinks(base: string, cur = -1): string {
  return `<ul class="mt-4 grid grid-cols-5 gap-2 text-center">${STEMS.map((s, i) =>
    i === cur
      ? `<li class="rounded-xl bg-accent py-3 text-label font-semibold text-on-accent"><span class="hanja block text-title3">${s.hanja}</span>${nameOf(i)}</li>`
      : `<li><a href="${base}${SLUGS[i]}/" class="block rounded-xl bg-fill py-3 text-label font-semibold text-ink"><span class="hanja block text-title3">${s.hanja}</span>${nameOf(i)}</a></li>`,
  ).join('')}</ul>`;
}

const cta = (up: string, text: string) => `<div class="panel mt-10 text-center">
        <p class="text-ui font-semibold text-ink">${text}</p>
        <p class="mt-2 text-label text-sub">생년월일을 넣으면 여덟 글자를 세워서 무료로 보여 드려요. 입력한 값은 서버로 보내지 않아요.</p>
        <a href="${up}/" class="btn-primary mt-5 w-full">내 사주로 ${YEAR}년 보기</a>
      </div>`;

function half(when: string, glyph: string, god: TenGod): string {
  const g = GOD[god];
  return `<section class="mt-12">
        <h2 class="text-title2 text-ink">${when} — ${head(g.neutralHead)}</h2>
        <p class="mt-2 text-label text-sub">${glyph} · ${god}(${TEN_GOD_HANJA[god]}) · ${g.theme}</p>
        <h3 class="mt-6 text-ui font-semibold text-ink">이렇게 하면 좋아요</h3>
        <ul class="read mt-2 list-disc space-y-2 pl-5">${li(g.good)}</ul>
        <h3 class="mt-6 text-ui font-semibold text-ink">이건 조심하세요</h3>
        <ul class="read mt-2 list-disc space-y-2 pl-5">${li([...g.bad, ...(g.always ? [g.always] : [])])}</ul>
      </section>`;
}

function stemPage(i: number): Page {
  const s = STEMS[i];
  const name = nameOf(i);
  const gs = tenGodOfStem(i, YP.stem);
  const gb = tenGodOfBranch(i, YP.branch);
  const [a, b] = [GOD[gs], GOD[gb]];
  const dm = DAY_MASTER[i];
  const yStem = `${STEMS[YP.stem].ko}화(${STEMS[YP.stem].hanja}火)`;
  const yBranch = `${BRANCHES[YP.branch].ko}토(${BRANCHES[YP.branch].hanja}土)`;
  const hap = (i + 5) % 10 === YP.stem || (YP.stem + 5) % 10 === i;
  const love = [
    a.loveMale && `남성이라면 상반기에 — ${a.loveMale}`,
    a.loveFemale && `여성이라면 상반기에 — ${a.loveFemale}`,
    b.loveMale && `남성이라면 하반기에 — ${b.loveMale}`,
    b.loveFemale && `여성이라면 하반기에 — ${b.loveFemale}`,
  ].filter((x): x is string => !!x);
  const body = `      <h1 class="hanja text-display text-ink">${YEAR}년 ${name}(${s.hanja}) 운세</h1>
      <p class="mt-4 text-ui text-sub">태어난 날의 윗글자(일간)가 ${josa(name, '이라/라')}면, ${YEAR}년 ${Y_KO}년(${Y_HANJA}年)은 상반기에 ${head(a.neutralHead)}, 하반기에 ${head(b.neutralHead)}로 흘러요. 왜 그렇게 보는지 근거부터 적을게요.</p>

      <div class="panel mt-8">
        <div class="mx-auto mb-4 max-w-[280px]">${stemArt(i, dm.image)}</div>
        <p class="text-center text-label font-semibold text-ink">${dm.image}</p>
        <dl class="mt-4 space-y-3 text-label">
          <div class="flex justify-between gap-4"><dt class="text-sub">${YEAR}년의 윗글자 ${yStem}</dt><dd class="text-right font-semibold text-ink">${name}에게 ${gs}(${TEN_GOD_HANJA[gs]})</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-sub">${YEAR}년의 아랫글자 ${yBranch}</dt><dd class="text-right font-semibold text-ink">${name}에게 ${gb}(${TEN_GOD_HANJA[gb]})</dd></div>
        </dl>
        <p class="mt-4 text-cap text-sub">한 해의 윗글자는 상반기, 아랫글자는 하반기에 더 크게 작용한다고 봐요.${hap ? ` ${s.ko}(${s.hanja})과 ${STEMS[YP.stem].ko}(${STEMS[YP.stem].hanja})은 서로 끌어당기는 짝(천간합)이라, 상반기의 ${gs} 기운이 다른 일간보다 가깝게 붙어요.` : ''}</p>
      </div>

${half('상반기', yStem, gs)}

${half('하반기', yBranch, gb)}
${
  love.length
    ? `
      <section class="mt-12">
        <h2 class="text-title2 text-ink">연애·결혼</h2>
        <ul class="read mt-4 list-disc space-y-2 pl-5">${li(love)}</ul>
      </section>
`
    : ''
}
      <section class="mt-12">
        <h2 class="text-title2 text-ink">같은 ${name}${batchim(name) ? '이어도' : '여도'} 다르게 와요</h2>
        <div class="read mt-4 space-y-4">
          <p>여기까지는 일간 한 글자만 본 이야기예요. 같은 ${gs}·${gb}의 해라도 그 기운이 내 사주에 도움이 되는지 부담이 되는지에 따라 정반대로 읽혀요.</p>
        </div>
        <table class="mt-4 w-full text-left text-label">
          <thead class="text-sub"><tr><th class="py-2"></th><th>내 사주에 도움이 되면</th><th>부담이 되면</th></tr></thead>
          <tbody class="[&_td]:border-t [&_td]:border-line [&_td]:py-3 [&_td]:pr-2 [&_td]:align-top">
            <tr><td class="whitespace-nowrap text-sub">상반기</td><td>${head(a.favHead)}</td><td>${head(a.unfavHead)}</td></tr>
            <tr><td class="whitespace-nowrap text-sub">하반기</td><td>${head(b.favHead)}</td><td>${head(b.unfavHead)}</td></tr>
          </tbody>
        </table>
        <div class="read mt-4 space-y-4">
          <p>어느 쪽인지는 여덟 글자 전체에서 ${name}의 힘이 센지 약한지, 어떤 오행이 필요한지를 따져야 나와요. 부담으로 올 때의 대응은 이래요: ${a.defend}</p>
        </div>
      </section>

      <section class="mt-12">
        <h2 class="text-title2 text-ink">${josa(name, '은/는')} 어떤 사람인가요?</h2>
        <p class="read mt-4">${dm.core}</p>
      </section>

${cta('../..', `내 사주에서 ${YEAR}년이 도움인지 부담인지 보기`)}

      <section class="mt-12">
        <h2 class="text-title2 text-ink">다른 일간의 ${YEAR}년</h2>
        <p class="mt-2 text-label text-sub">${YEAR}년은 입춘(${kst(ipchunMs(YEAR))})부터예요. <a href="../" class="link">${Y_KO}년 전체와 달마다의 간지 보기</a></p>
        ${stemLinks('../', i)}
      </section>`;
  return {
    dir: `${YEAR}/${SLUGS[i]}`,
    html: shell({
      dir: `${YEAR}/${SLUGS[i]}`,
      title: `${YEAR}년 ${name}(${hanjaOf(i)}) 운세 — ${Y_KO}년 신년운세 | 명경사주`,
      desc: `${name} 일간의 ${YEAR} ${Y_KO}년 운세. ${STEMS[YP.stem].ko}화는 ${gs}, ${BRANCHES[YP.branch].ko}토는 ${josa(gb, '이에요/예요')}. 상·하반기에 할 일과 조심할 일을 근거와 함께 적었어요.`,
      ogTitle: `${YEAR}년 ${name}(${s.hanja}) 운세 — ${head(a.neutralHead)}`,
      body,
    }),
  };
}

/** 사주의 한 해 열두 달 — 절기 시각과 월주 */
function monthRows(): string {
  const rows: string[] = [];
  let ms = ipchunMs(YEAR);
  for (let k = 0; k < 12; k++) {
    const { prev, next } = jieAround(ms + 86400000);
    const mp = yearMonthPillarsAt(ms + 86400000).month;
    rows.push(
      `<tr><td>${STEMS[mp.stem].ko}${BRANCHES[mp.branch].ko}월 <span class="hanja text-sub">${STEMS[mp.stem].hanja}${BRANCHES[mp.branch].hanja}</span></td><td>${prev.name}</td><td>${kst(prev.ms)}</td></tr>`,
    );
    ms = next.ms;
  }
  return rows.join('\n');
}

function indexPage(): Page {
  const next = ipchunMs(YEAR + 1);
  const cards = STEMS.map((_, i) => {
    const gs = tenGodOfStem(i, YP.stem);
    const gb = tenGodOfBranch(i, YP.branch);
    return `<li class="border-b border-line py-4"><a href="${SLUGS[i]}/" class="block"><span class="text-ui font-semibold text-ink"><span class="hanja">${STEMS[i].hanja}</span> ${nameOf(i)}</span><span class="mt-1 block text-label text-sub">${gs}·${gb} — 상반기 ${head(GOD[gs].neutralHead)}, 하반기 ${head(GOD[gb].neutralHead)}</span></a></li>`;
  }).join('\n');
  const body = `      <h1 class="hanja text-display text-ink">${YEAR}년 ${Y_KO}년 운세, 일간별로 보기</h1>
      <p class="mt-4 text-ui text-sub">${YEAR}년은 ${Y_KO}년(${Y_HANJA}年)이에요. 같은 해라도 태어난 날의 윗글자(일간)에 따라 그 해의 글자가 뜻하는 것이 달라요. 열 가지 일간마다 무엇이 들어오는 해인지, 왜 그렇게 보는지 근거와 함께 적었어요.</p>

      <section class="mt-10">
        <h2 class="text-title2 text-ink">내 일간 찾기</h2>
        <p class="mt-2 text-label text-sub">일간은 태어난 날의 윗글자예요. 띠(태어난 해)와는 다른 글자라서, 양력 생일을 골라 찾아요. 음력 생일이면 양력으로 바꿔 넣어 주세요.</p>
        <div id="stem-finder" class="panel mt-4"><noscript>일간을 찾으려면 자바스크립트를 켜 주세요. 아래 목록에서 바로 골라도 돼요.</noscript></div>
        <p class="mt-2 text-cap text-sub">밤 11시 반쯤 뒤에 태어났다면 다음 날의 글자일 수 있어요. <a href="../" class="link">내 사주 보기</a>에서 시각까지 넣으면 정확히 나와요. 입력한 값은 서버로 보내지 않아요.</p>
        <h3 class="mt-8 text-title3 text-ink">일간을 알고 있다면</h3>
        <ul class="mt-4 border-t border-line">
${cards}
        </ul>
      </section>

      <section class="mt-12">
        <h2 class="text-title2 text-ink">${Y_KO}년은 어떤 해인가요?</h2>
        <div class="read mt-4 space-y-4">
          <p>윗글자 ${STEMS[YP.stem].ko}(${STEMS[YP.stem].hanja})은 음(陰)의 불이에요. 해처럼 넓게 비추는 불이 아니라 촛불·등불처럼 가까운 곳을 밝히는 불로 읽어요. 아랫글자 ${BRANCHES[YP.branch].ko}(${BRANCHES[YP.branch].hanja})는 음의 흙이고 띠로는 양이에요. 여름의 끝자락에 해당하는 마르고 따뜻한 땅이에요.</p>
          <p>불이 흙을 낳는 관계(화생토)라서 위아래 글자가 같은 방향으로 힘을 실어요. 그래서 ${YEAR}년은 불과 흙의 기운이 뚜렷한 해예요. 이 두 기운이 내게 무엇인지는 일간마다 달라요.</p>
        </div>
      </section>

      <section class="mt-12">
        <h2 class="text-title2 text-ink">${YEAR}년은 언제 시작하나요?</h2>
        <div class="read mt-4 space-y-4">
          <p>사주의 새해는 1월 1일도 설날도 아니고 입춘이에요. ${YEAR}년 ${Y_KO}년은 <b>${kst(ipchunMs(YEAR))}</b>(한국 표준시)에 시작해서 ${YEAR + 1}년 ${kst(next)} 전까지예요. 그 전에 태어난 아이는 아직 지난해의 띠예요.</p>
        </div>
        <table class="mt-4 w-full text-left text-label">
          <thead class="text-sub"><tr><th class="py-2">달</th><th>시작 절기</th><th>시작 시각</th></tr></thead>
          <tbody class="[&_td]:border-t [&_td]:border-line [&_td]:py-2 tabular-nums">
${monthRows()}
          </tbody>
        </table>
        <p class="mt-3 text-cap text-sub">절기 시각은 명경사주가 천문 계산으로 구한 값이에요(한국 표준시). 사주의 달은 음력 초하루가 아니라 이 절기에 바뀌어요.</p>
      </section>

${cta('..', `일간만으로는 절반이에요. 여덟 글자 전체로 ${YEAR}년을 보세요`)}`;
  return {
    dir: `${YEAR}`,
    html: shell({
      dir: `${YEAR}`,
      title: `${YEAR}년 ${Y_KO}년 운세 — 일간별 신년운세와 절기 시각 | 명경사주`,
      desc: `${YEAR} ${Y_KO}년(${Y_HANJA}年)이 갑목부터 계수까지 일간마다 어떤 해인지, 입춘과 열두 달 절기 시각까지 근거와 함께 정리했어요.`,
      ogTitle: `${YEAR}년 ${Y_KO}년 운세, 내 일간으로 보기`,
      body,
      script: 'finder',
    }),
  };
}

export function pages(): Page[] {
  return [indexPage(), ...STEMS.map((_, i) => stemPage(i))];
}
