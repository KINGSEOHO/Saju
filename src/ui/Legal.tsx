/**
 * 이용약관 · 개인정보처리방침 · 환불 안내 — 주소 #/terms · #/privacy · #/refund
 * 실제로 하는 일과 똑같이 적는다. 하는 일이 바뀌면(예: 결제를 열 때) 여기부터 고치고 POLICY_VERSIONS에 새 시행일을 더한다.
 */
import { useState, type ReactNode } from 'react';
import { BUSINESS, POLICY_DATE, POLICY_VERSIONS } from '../config/business.ts';
import { clearAllLocal, deviceIdForRequest } from '../lib/storageKeys.ts';

export type LegalDoc = 'terms' | 'privacy' | 'refund';

export const LEGAL_TITLE: Record<LegalDoc, string> = {
  terms: '이용약관',
  privacy: '개인정보처리방침',
  refund: '환불 안내',
};

const pending = '등록 준비 중';
const contact = () => BUSINESS.email || pending;
/** ‘○○로 보내 주세요’ — 연락처가 아직 없으면 조사가 어색하지 않게 */
const to = () => (BUSINESS.email ? `${BUSINESS.email}로` : '사이트 아래 연락처(등록 준비 중)로');

function Sec({ n, h, children }: { n: number; h: string; children: ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="text-title3 text-ink">
        제{n}조 {h}
      </h2>
      <div className="mt-3 space-y-3 text-ui leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}

/** 표 대신 칸마다 묶어 보여 준다 — 휴대폰 폭에서 옆으로 잘리지 않게 */
function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => (
        <dl key={i} className="rounded-xl border border-line px-4 py-3 text-label">
          {r.map((c, j) => (
            <div key={j} className={j === 0 ? 'font-semibold text-ink' : 'mt-1.5 flex gap-3'}>
              {j === 0 ? (
                <dt>{c}</dt>
              ) : (
                <>
                  <dt className="w-[5.5rem] shrink-0 text-sub">{head[j]}</dt>
                  <dd className="text-ink-2">{c}</dd>
                </>
              )}
            </div>
          ))}
        </dl>
      ))}
    </div>
  );
}

function Terms() {
  return (
    <>
      <Sec n={1} h="목적">
        <p>
          이 약관은 {BUSINESS.name}(이하 ‘회사’)가 {BUSINESS.site}에서 제공하는 사주 풀이 서비스(이하 ‘서비스’)를 이용하는 데 필요한 회사와 이용자의 권리·의무와 책임을 정해요.
        </p>
      </Sec>
      <Sec n={2} h="약관의 게시와 변경">
        <p>회사는 이 약관을 사이트 아래쪽 ‘이용약관’에 늘 게시해요.</p>
        <p>
          약관을 바꿀 때는 시행일과 바꾸는 까닭을 시행 7일 전부터 사이트에 알려요. 이용자에게 불리하게 바꾸는 경우에는 30일 전부터 알려요. 바뀐 약관에 동의하지 않으면 이용을 멈출 수 있고, 이미 산 유료
          서비스는 바뀌기 전 약관대로 이용할 수 있어요.
        </p>
      </Sec>
      <Sec n={3} h="서비스의 내용">
        <p>회사는 이용자가 넣은 생년월일·출생 시각·출생지로 사주 원국을 계산하고, 성향·운의 흐름·고민별 풀이·궁합 같은 해석을 글과 그림으로 제공해요.</p>
        <p>
          <b className="text-ink">사주 풀이는 전통 명리학의 경향을 정리한 참고 자료예요.</b> 미래를 확정하거나 결과를 보증하지 않으며, 의학·법률·투자·심리 상담 같은 전문가의 판단을 대신하지 않아요.
          건강·돈·법률 문제는 반드시 해당 전문가와 상의해 주세요.
        </p>
      </Sec>
      <Sec n={4} h="이용">
        <p>서비스는 회원가입 없이 이용할 수 있어요. 입력한 생년월일 등은 이용자의 브라우저 안에서만 계산하며 회사 서버로 보내지 않아요(자세한 내용은 개인정보처리방침).</p>
        <p>서비스는 만 14세 이상을 위한 것이에요. 만 14세 미만은 후기·의견을 보내거나 결제할 수 없어요.</p>
      </Sec>
      <Sec n={5} h="유료 서비스와 결제">
        <p>유료 서비스의 내용과 가격은 결제 전에 화면에 표시해요. 이용자는 상품과 금액을 확인하고, 환불 안내에 동의한 뒤 결제해요.</p>
        <p>
          산 리포트는 같은 사람(같은 양력 생일)에게 계속 열려요. 출생 시각·출생지·음력 여부를 고쳐도 다시 결제하지 않아요. 신년운세는 산 해의 풀이에 해당해요. 이미 산 고민이 있는 상태에서 ‘전부
          열기’를 사면 먼저 낸 금액을 빼 줘요.
        </p>
        <p>
          만 19세 미만 미성년자가 법정대리인의 동의 없이 결제했다면 본인이나 법정대리인이 결제를 취소할 수 있어요(민법 제5조). 다만 미성년자가 속임수로 성년이라고 믿게 했거나 법정대리인이 허락한
          범위의 용돈으로 결제한 경우에는 취소가 제한될 수 있어요.
        </p>
        <p>결제·환불의 자세한 기준은 ‘환불 안내’를 따르며, 환불 안내는 이 약관의 일부예요.</p>
      </Sec>
      <Sec n={6} h="이용자의 의무">
        <p>이용자는 다음을 하면 안 돼요.</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>다른 사람의 생년월일 등을 그 사람이 원하지 않는데 넣어 풀이 결과를 퍼뜨리는 일 (궁합·재회의 상대 정보는 이용자가 책임지고 넣어 주세요)</li>
          <li>풀이 결과·그림·글을 회사 허락 없이 판매하거나 상업적으로 다시 배포하는 일</li>
          <li>후기·의견에 다른 사람을 비방하거나 개인정보(실명·연락처 등)를 적는 일</li>
          <li>자동화 도구로 서비스에 과도한 부담을 주거나 결제·구매 기록을 조작하려는 일</li>
        </ul>
      </Sec>
      <Sec n={7} h="게시물(후기)">
        <p>
          이용자가 공개에 동의한 후기는 이름 없이 사이트에 실릴 수 있어요. 다른 사람의 권리를 침해하거나 개인정보가 들어 있는 후기는 알리지 않고 내리거나 고칠 수 있어요. 이용자는 언제든 자신의 후기를
          내려 달라고 요청할 수 있어요.
        </p>
      </Sec>
      <Sec n={8} h="서비스의 변경·중단">
        <p>
          회사는 풀이 내용을 더 정확하게 고치기 위해 서비스를 바꿀 수 있어요. 시스템 점검·고장·통신 장애 같은 사정으로 잠시 멈출 수 있으며, 유료 서비스를 완전히 끝낼 때는 30일 전에 알리고 남은 이용
          권리에 대해 환불 안내에 따라 보상해요.
        </p>
      </Sec>
      <Sec n={9} h="책임의 제한">
        <p>회사는 사주 풀이를 믿고 내린 이용자의 결정과 그 결과에 대해 책임지지 않아요. 다만 회사의 고의나 중대한 과실로 생긴 손해는 법이 정한 대로 책임져요.</p>
        <p>이용자가 공유한 링크나 이미지에는 생년월일 등이 담길 수 있어요. 이용자가 스스로 공유해서 생긴 문제는 회사가 책임지지 않아요.</p>
      </Sec>
      <Sec n={10} h="분쟁 해결">
        <p>이용 중 불편이나 분쟁이 생기면 {to()} 알려 주세요. 영업일 기준 3일 안에 답해요.</p>
        <p>해결되지 않으면 이용자는 한국소비자원(국번 없이 1372) 또는 전자거래분쟁조정위원회(www.ecmc.or.kr)에 조정을 신청할 수 있어요. 소송은 민사소송법에 따른 관할 법원에서 해요.</p>
      </Sec>
      <p className="mt-9 text-label text-sub">부칙: 이 약관은 {POLICY_DATE}부터 시행해요.</p>
    </>
  );
}

function Privacy() {
  const [cleared, setCleared] = useState(false);
  const [asked, setAsked] = useState(false);
  const id = deviceIdForRequest();
  return (
    <>
      <p className="mt-6 text-ui leading-relaxed text-ink-2">
        {BUSINESS.name}(이하 ‘회사’)는 개인정보 보호법에 따라 이용자의 개인정보를 보호하고, 관련 고충을 빠르게 처리하기 위해 이 방침을 두어요.{' '}
        <b className="text-ink">회사는 서비스에 꼭 필요한 정보만, 가능한 한 누구인지 알 수 없는 형태로 받아요.</b>
      </p>

      <Sec n={1} h="한눈에 보기">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b className="text-ink">이름·생년월일·출생 시각·출생지는 회사 서버로 보내지 않아요.</b> 사주 계산은 이용자의 브라우저 안에서만 해요.
          </li>
          <li>궁합·재회의 상대 정보는 서버에도, 공유 링크에도 담지 않고 이 탭을 닫으면 지워져요.</li>
          <li>후기·의견을 보낼 때만, 이름 없는 요약(일간·성별·연령대 등)을 함께 받아요.</li>
          <li>광고를 위한 추적이나 쿠키는 쓰지 않아요.</li>
        </ul>
      </Sec>

      <Sec n={2} h="처리하는 개인정보와 목적·보관 기간">
        <Table
          head={['언제', '항목', '목적', '보관 기간']}
          rows={[
            [
              '사주를 볼 때',
              '이름(선택)·성별·생년월일·출생 시각·출생지·MBTI·직업 (서버로 보내지 않음)',
              '사주 계산과 풀이 — 이용자 기기 안에서만',
              '기기에만 저장. ‘최근 본 사주’에서 지우거나 아래 ‘모두 지우기’로 바로 지울 수 있어요',
            ],
            ['사이트를 쓸 때', '무작위로 만든 기기 식별값, 방문·결과 보기·고민 펼치기 같은 이용 단계, 고른 상품·금액', '어떤 풀이가 쓰이는지 알고 서비스를 고치기 위해', '받은 날부터 1년 뒤 파기'],
            [
              '후기·의견을 보낼 때',
              '점수, 적은 글, 공개 동의 여부, 기기 식별값, 이름 없는 사주 요약(일간·일주·성별·연령대·신강약·격국·용신·MBTI·직업 분야)',
              '풀이 정확도 개선, 문의 응대, (동의한 경우) 후기 게시',
              '받은 날부터 3년 또는 삭제 요청 때까지',
            ],
            ['접속할 때 (자동)', '접속 IP·브라우저 종류·접속 시각 (사이트를 올려 둔 GitHub의 서버 기록)', '사이트 전송과 보안', 'GitHub 정책에 따름'],
          ]}
        />
        <p className="text-label text-sub">
          결제 기능을 열면 ‘계정 식별값(로그인 수단의 회원번호 또는 구매 코드)·산 상품·금액·결제 일시·결제 승인번호’를 추가로 처리하며, 이때 이 방침을 먼저 고쳐 알려요. 카드번호 등 결제 정보는
          결제대행사가 직접 처리하고 회사는 받지 않아요. 결제 기록은 전자상거래법에 따라 계약·결제 기록 5년, 소비자 불만·분쟁 처리 기록 3년 동안 보관해요.
        </p>
      </Sec>

      <Sec n={3} h="동의를 거부할 권리">
        <p>후기·의견을 보낼 때의 개인정보 수집·이용에는 동의하지 않을 수 있어요. 동의하지 않으면 후기·의견만 보낼 수 없고, 사주 풀이 등 나머지 서비스는 그대로 이용할 수 있어요.</p>
      </Sec>

      <Sec n={4} h="만 14세 미만 아동">
        <p>회사는 만 14세 미만 아동의 개인정보를 받지 않아요. 후기·의견을 보내거나 결제할 때 만 14세 이상인지 먼저 확인해요.</p>
      </Sec>

      <Sec n={5} h="제3자 제공">
        <p>회사는 이용자의 개인정보를 다른 곳에 제공하지 않아요. 법령에 정해진 경우(수사기관의 적법한 요청 등)만 예외예요.</p>
      </Sec>

      <Sec n={6} h="처리 위탁과 국외 보관">
        <p>회사는 서비스 운영을 위해 아래 업체의 서비스를 써요. 이 업체들의 서버는 국외(미국 등)에 있어, 정보가 인터넷으로 전송되어 그곳에 보관돼요.</p>
        <Table
          head={['업체 (국가)', '맡기는 일', '옮겨지는 항목', '보관 기간']}
          rows={[
            ['Google LLC (미국)', '후기·의견·이용 단계 기록 저장 (Google 스프레드시트)', '제2조의 ‘사이트를 쓸 때’, ‘후기·의견을 보낼 때’ 항목', '제2조와 같음'],
            ['GitHub, Inc. (미국)', '사이트 파일 호스팅', '접속 IP 등 접속 기록', 'GitHub 정책에 따름'],
            ['Kakao Corp. (대한민국)', '카카오톡 공유하기 (이용자가 누를 때만)', '공유하는 카드 내용 (생년월일·시각은 넣지 않음)', '카카오 정책에 따름'],
          ]}
        />
        <p className="text-label text-sub">
          국외로 옮기는 것을 원하지 않으면 후기·의견을 보내지 않으면 돼요. 사주 풀이는 그대로 이용할 수 있어요. 결제를 열 때 결제대행사·로그인 업체를 이 표에 더해 알려요.
        </p>
      </Sec>

      <Sec n={7} h="기기에 저장하는 정보 (쿠키 대신)">
        <p>
          회사는 쿠키를 쓰지 않고, 편의를 위해 브라우저 저장소(localStorage)에 ‘최근 본 사주’, 입력 중인 값, 맞혀 볼게요 답, 기기 식별값, 보내지 못한 후기를 저장해요. 이 정보는 이용자의 기기에만 있고
          회사는 볼 수 없어요. 사이트를 업데이트해도 지워지지 않으며, 이용자가 아래 버튼이나 브라우저 설정으로 지울 수 있어요.
        </p>
        <div className="panel">
          <p className="text-label text-ink">
            이 기기의 식별값: <span className="font-mono text-cap">{id || '없음'}</span>
          </p>
          <p className="mt-1 text-cap text-sub">보낸 후기·의견을 지워 달라고 요청할 때 이 값을 함께 알려 주시면 찾을 수 있어요.</p>
          {cleared ? (
            <p className="mt-3 text-label font-semibold text-accent">이 기기에 저장된 명경사주 기록을 모두 지웠어요.</p>
          ) : asked ? (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="btn-small bg-ink text-bg"
                onClick={() => {
                  clearAllLocal();
                  setCleared(true);
                }}
              >
                정말 지우기
              </button>
              <button type="button" className="btn-small" onClick={() => setAsked(false)}>
                취소
              </button>
            </div>
          ) : (
            <button type="button" className="btn-small mt-3" onClick={() => setAsked(true)}>
              이 기기의 기록 모두 지우기
            </button>
          )}
        </div>
      </Sec>

      <Sec n={8} h="파기">
        <p>보관 기간이 끝나거나 목적을 이루면 지체 없이 지워요. 전자 파일은 되살릴 수 없는 방법으로 지워요. 법령에 따라 더 보관해야 하는 정보는 따로 나눠 그 기간 동안만 보관해요.</p>
      </Sec>

      <Sec n={9} h="이용자의 권리와 행사 방법">
        <p>
          이용자는 언제든 자신의 개인정보를 열람·정정·삭제·처리정지해 달라고 요청할 수 있어요. {to()} 위의 기기 식별값이나 보낸 날짜·내용을 알려 주시면 10일 안에 처리하고 결과를 알려 드려요.
          법정대리인이나 위임받은 사람을 통해서도 요청할 수 있어요.
        </p>
      </Sec>

      <Sec n={10} h="안전성 확보 조치">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>꼭 필요한 정보만 받고, 이름·생년월일·출생 시각은 서버로 보내지 않아요.</li>
          <li>모든 통신을 암호화(HTTPS)해요.</li>
          <li>저장된 기록은 관리자 비밀번호로만 볼 수 있고, 볼 수 있는 사람을 최소로 해요.</li>
          <li>후기 글은 길이를 제한하고, 스프레드시트 수식으로 실행되지 않게 처리해요.</li>
        </ul>
      </Sec>

      <Sec n={11} h="개인정보 보호책임자">
        <p>
          책임자: {BUSINESS.owner || pending} (대표) · 연락처: {contact()}
          {BUSINESS.phone ? ` · ${BUSINESS.phone}` : ''}
        </p>
        <p>개인정보 침해로 상담이 필요하면 아래 기관에 문의할 수 있어요.</p>
        <ul className="list-disc space-y-1 pl-5 text-label">
          <li>개인정보분쟁조정위원회 1833-6972 (www.kopico.go.kr)</li>
          <li>개인정보침해신고센터 118 (privacy.kisa.or.kr)</li>
          <li>대검찰청 1301 (www.spo.go.kr)</li>
          <li>경찰청 182 (ecrm.police.go.kr)</li>
        </ul>
      </Sec>

      <Sec n={12} h="방침의 변경">
        <p>이 방침을 바꿀 때는 시행 7일 전부터 사이트에 알려요. 이용자의 권리에 중요한 변경은 30일 전부터 알려요.</p>
        <ul className="space-y-1 text-label text-sub">
          {POLICY_VERSIONS.map((v) => (
            <li key={v.date}>
              {v.date} 시행 — {v.note}
            </li>
          ))}
        </ul>
      </Sec>
    </>
  );
}

function Refund() {
  return (
    <>
      <p className="mt-6 text-ui leading-relaxed text-ink-2">
        명경사주의 유료 리포트는 결제하면 바로 화면에 열리는 디지털 콘텐츠예요. 전자상거래법 제17조에 따라 아래 기준으로 환불해요. 결제 전에 같은 내용을 다시 보여 드리고 동의를 받아요.
      </p>
      <Sec n={1} h="전액 환불되는 경우">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b className="text-ink">결제했지만 아직 리포트를 열어 보지 않은 경우</b> — 결제일로부터 7일 안에 요청하면 전액 환불해요.
          </li>
          <li>
            <b className="text-ink">같은 리포트를 두 번 결제한 경우</b> — 겹친 금액을 전액 환불해요. 구매 코드로 기록을 합칠 때 겹친 결제가 확인되면 따로 요청하지 않아도 환불해요.
          </li>
          <li>
            <b className="text-ink">오류로 리포트가 열리지 않거나 내용이 비어 있는 경우</b>, 또는 <b className="text-ink">안내한 내용과 실제 내용이 다른 경우</b> — 받은 날부터 3개월 안에, 그 사실을 안
            날부터 30일 안에 요청하면 전액 환불해요.
          </li>
          <li>결제는 됐는데 화면이 넘어가지 않아 리포트를 받지 못한 경우 — 확인 후 전액 환불하거나 바로 열어 드려요.</li>
        </ul>
      </Sec>
      <Sec n={2} h="환불이 제한되는 경우">
        <p>
          리포트를 연 뒤에는 이미 내용을 모두 받은 것이라 단순 변심(‘생각과 달라요’, ‘마음에 안 들어요’)으로는 환불이 어려워요(전자상거래법 제17조 제2항 제5호). 대신 결제 전에 무료로 결론과 일부
          내용을 먼저 보여 드려요.
        </p>
        <p>사주 풀이가 이용자의 생각과 다르다는 이유는 ‘내용이 다른 경우’에 해당하지 않아요. 다만 출생 정보를 잘못 넣어 산 경우에는 같은 사람이면 고친 정보로 다시 열어 드려요.</p>
      </Sec>
      <Sec n={3} h="미성년자 결제">
        <p>만 19세 미만 미성년자가 법정대리인의 동의 없이 결제했다면 본인이나 법정대리인이 취소를 요청할 수 있어요. 가족관계를 확인할 수 있는 서류를 요청드릴 수 있어요.</p>
      </Sec>
      <Sec n={4} h="요청 방법과 처리 기간">
        <p>
          {to()} 구매 코드(MG-XXXX-XXXX), 결제 일시, 금액, 환불 사유를 보내 주세요. 확인 후 영업일 기준 3일 안에 결제한 수단으로 환불을 진행해요. 카드사 사정에 따라 실제 입금·취소까지 며칠 더 걸릴 수
          있어요.
        </p>
      </Sec>
      <p className="mt-9 text-label text-sub">이 안내는 {POLICY_DATE}부터 시행해요.</p>
    </>
  );
}

export function Legal({ doc }: { doc: LegalDoc }) {
  return (
    <article className="wrap pt-8 pb-20">
      <nav className="flex gap-4 text-label font-semibold" aria-label="약관과 정책">
        {(Object.keys(LEGAL_TITLE) as LegalDoc[]).map((d) => (
          <a key={d} href={`#/${d}`} className={d === doc ? 'text-ink' : 'text-sub'} aria-current={d === doc ? 'page' : undefined}>
            {LEGAL_TITLE[d]}
          </a>
        ))}
      </nav>
      <h1 className="mt-6 text-display text-ink">{LEGAL_TITLE[doc]}</h1>
      <p className="mt-2 text-label text-sub">시행일 {POLICY_DATE}</p>
      {doc === 'terms' ? <Terms /> : doc === 'privacy' ? <Privacy /> : <Refund />}
    </article>
  );
}

/** 사이트 아래 — 사업자 정보와 약관 링크 (전자상거래법상 표시 사항) */
export function BusinessFooter() {
  const b = BUSINESS;
  const rows: [string, string][] = [
    ['상호', b.name],
    ['대표', b.owner || pending],
    ['사업자등록번호', b.regNo || pending],
    ['통신판매업 신고', b.mailOrderNo || pending],
    ['주소', b.address || pending],
    ['연락처', [b.phone, b.email].filter(Boolean).join(' · ') || pending],
    ['호스팅', 'GitHub, Inc.'],
  ];
  return (
    <div className="mt-5 space-y-3">
      <nav className="flex flex-wrap gap-x-4 gap-y-1 text-label" aria-label="약관과 정책">
        <a href="#/terms" className="text-ink-2">
          이용약관
        </a>
        <a href="#/privacy" className="font-bold text-ink">
          개인정보처리방침
        </a>
        <a href="#/refund" className="text-ink-2">
          환불 안내
        </a>
      </nav>
      <p className="text-micro leading-relaxed text-sub">
        {rows.map(([k, v], i) => (
          <span key={k}>
            {i > 0 && ' · '}
            {k} {v}
          </span>
        ))}
        {b.regNo && (
          <>
            {' · '}
            <a className="underline" href={`https://www.ftc.go.kr/bizCommPop.do?wrkr_no=${b.regNo.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
              사업자정보 확인
            </a>
          </>
        )}
      </p>
    </div>
  );
}
