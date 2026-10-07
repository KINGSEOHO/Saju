/**
 * 단계별 입력 — 한 화면에 한 가지 질문만 묻는다.
 * 생년월일 → 태어난 시간 → 성별 → 태어난 곳 → 선택 정보(이름·MBTI·직업) → 결과 보기
 * 단계는 주소(#/start/1 ~ 5)로 나눠 휴대폰의 뒤로 가기가 이전 단계로 돌아가게 한다.
 */
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { CITIES } from '../engine/timezone.ts';
import {
  checkDate, checkTime, draftToInput, formatTime, formatYmd, loadDraft, saveDraft, stepValid, type Draft,
} from '../lib/birthDraft.ts';
import { encodeInput } from '../lib/share.ts';
import { MBTI_LIST } from '../report/mbti.ts';
import { BackIcon, BottomBar } from './common.tsx';
import { JobPicker } from './JobPicker.tsx';

export const FLOW_STEPS = 5;

/** 이 흐름 안에서 '다음'으로 쌓은 기록 수 — 앱 안의 뒤로 버튼이 브라우저 기록과 어긋나지 않게 */
let pushed = 0;
let lastStep = 1;

export function goToStep(n: number) {
  pushed++;
  window.location.hash = `/start/${n}`;
}

function Question({ title, sub, children }: { title: string; sub?: ReactNode; children: ReactNode }) {
  return (
    <>
      <h1 className="mt-8 text-title1 text-ink">{title}</h1>
      {sub && <p className="mt-2 text-ui text-sub">{sub}</p>}
      <div className="mt-8">{children}</div>
    </>
  );
}

function Hint({ error, note }: { error?: string; note?: string }) {
  if (error)
    return (
      <p role="alert" className="mt-3 text-label font-semibold text-ink">
        {error}
      </p>
    );
  if (note) return <p className="mt-3 text-label font-medium text-accent">{note}</p>;
  return null;
}

export function BirthFlow({ step }: { step: number }) {
  const [d, setD] = useState<Draft>(loadDraft);
  const [adv, setAdv] = useState(false);
  const advancing = useRef(false);
  const update = (patch: Partial<Draft>) =>
    setD((cur) => {
      const next = { ...cur, ...patch };
      saveDraft(next);
      return next;
    });
  const valid = stepValid(d);
  const firstInvalid = valid.findIndex((v) => !v);

  // 앞 단계가 비어 있으면 그 단계로 돌려보낸다 (주소로 바로 들어온 경우)
  useEffect(() => {
    if (firstInvalid >= 0 && step - 1 > firstInvalid) window.location.replace(`#/start/${firstInvalid + 1}`);
  }, [step, firstInvalid]);
  // 단계가 바뀌면 맨 위에서 시작
  useEffect(() => {
    if (step < lastStep) pushed = Math.max(0, pushed - (lastStep - step));
    lastStep = step;
    advancing.current = false;
    window.scrollTo(0, 0);
  }, [step]);

  const finish = () => {
    const input = draftToInput(d);
    if (!input) return;
    pushed = 0;
    window.location.hash = `/r?${encodeInput(input)}`;
    window.scrollTo(0, 0);
  };
  const next = () => {
    if (!valid[step - 1]) return;
    if (step >= FLOW_STEPS) finish();
    else goToStep(step + 1);
  };
  const back = () => {
    if (pushed > 0) {
      window.history.back();
      return;
    }
    if (step > 1) window.location.replace(`#/start/${step - 1}`);
    else if (window.history.length > 1) window.history.back();
    else window.location.hash = '/';
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    next();
  };

  const date = checkDate(d.ymd, d.calendar, d.leap);
  const time = checkTime(d.time);
  const domestic = CITIES.filter((c) => c.timeZone === 'Asia/Seoul');
  const overseas = CITIES.filter((c) => c.timeZone !== 'Asia/Seoul');
  const isOverseas = d.city === '__custom' || overseas.some((c) => c.name === d.city);

  return (
    <form onSubmit={submit} noValidate>
      <div className="sticky top-0 z-30 bg-bg">
        <div className="wrap flex h-14 items-center justify-between">
          <button type="button" onClick={back} className="-ml-2 flex size-10 items-center justify-center rounded-xl text-ink active:bg-fill" aria-label="이전 단계">
            <BackIcon />
          </button>
          <span className="text-label font-semibold text-sub tabular-nums">
            {step} / {FLOW_STEPS}
          </span>
        </div>
        <div className="wrap">
          <div className="h-0.5 bg-line" role="progressbar" aria-valuemin={1} aria-valuemax={FLOW_STEPS} aria-valuenow={step}>
            <div className="h-0.5 bg-accent transition-[width]" style={{ width: `${(step / FLOW_STEPS) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="wrap pb-36">
        {step === 1 && (
          <Question title="언제 태어났나요?" sub="출생신고서에 적힌 날짜 그대로 적어 주세요.">
            <div className="seg" role="radiogroup" aria-label="달력">
              {(
                [
                  ['solar', '양력'],
                  ['lunar', '음력'],
                ] as const
              ).map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={d.calendar === v} onClick={() => update({ calendar: v, leap: false })} className={`seg-item ${d.calendar === v ? 'seg-on' : ''}`}>
                  {l}
                </button>
              ))}
            </div>
            <label className="mt-7 block">
              <span className="text-label font-semibold text-ink-2">생년월일 8자리</span>
              <input
                className="field mt-2 h-16 text-[24px] font-semibold tracking-wide"
                inputMode="numeric"
                autoComplete="bday"
                placeholder="예) 19900707"
                value={formatYmd(d.ymd)}
                onChange={(e) => update({ ymd: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                autoFocus
              />
            </label>
            {d.calendar === 'lunar' && date.leapMonth > 0 && date.leapMonth === date.m && (
              <label className="mt-4 flex items-center gap-2.5 text-ui text-ink-2">
                <input type="checkbox" className="size-5 accent-accent" checked={d.leap} onChange={(e) => update({ leap: e.target.checked })} />
                윤달이에요 <span className="text-label text-sub">({date.y}년은 윤{date.leapMonth}월이 있어요)</span>
              </label>
            )}
            <Hint error={date.error} note={date.note} />
          </Question>
        )}

        {step === 2 && (
          <Question title="몇 시에 태어났나요?" sub="출생신고서나 산모수첩에 적힌 시각 그대로 적어 주세요. 서머타임과 태어난 곳의 시차는 자동으로 계산해요.">
            {!d.timeUnknown ? (
              <>
                <label className="block">
                  <span className="text-label font-semibold text-ink-2">태어난 시각 4자리 (24시간)</span>
                  <input
                    className="field mt-2 h-16 text-[24px] font-semibold tracking-wide"
                    inputMode="numeric"
                    placeholder="예) 0730, 오후 3시 5분은 1505"
                    value={formatTime(d.time)}
                    onChange={(e) => update({ time: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    autoFocus
                  />
                </label>
                <Hint error={time.error} note={time.note} />
                <button type="button" className="btn-secondary mt-8 w-full" onClick={() => update({ timeUnknown: true })}>
                  태어난 시간을 몰라요
                </button>
              </>
            ) : (
              <div className="panel">
                <p className="text-ui font-semibold text-ink">시간을 모르는 채로 볼게요</p>
                <p className="mt-1 text-label text-sub">태어난 시를 뺀 여섯 글자로 풀이해요. 자녀·노후 풀이와 성향 일부는 정확도가 낮아져요.</p>
                <button type="button" className="link mt-3 text-label" onClick={() => update({ timeUnknown: false })}>
                  시간 입력하기
                </button>
              </div>
            )}
          </Question>
        )}

        {step === 3 && (
          <Question title="성별을 알려 주세요" sub="10년마다 바뀌는 큰 운(대운)이 흐르는 방향을 정하는 데 필요해요.">
            <div className="space-y-3" role="radiogroup" aria-label="성별">
              {(
                [
                  ['female', '여성'],
                  ['male', '남성'],
                ] as const
              ).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={d.gender === v}
                  onClick={() => {
                    update({ gender: v });
                    if (advancing.current) return;
                    advancing.current = true;
                    window.setTimeout(() => goToStep(4), 220);
                  }}
                  className={`flex h-16 w-full items-center justify-between rounded-2xl border px-5 text-left text-[17px] font-semibold transition-colors ${d.gender === v ? 'border-accent bg-accent-soft text-accent' : 'border-line text-ink active:bg-fill'}`}
                >
                  {l}
                  <span aria-hidden className={`flex size-5 items-center justify-center rounded-full border-2 ${d.gender === v ? 'border-accent' : 'border-faint'}`}>
                    {d.gender === v && <span className="size-2.5 rounded-full bg-accent" />}
                  </span>
                </button>
              ))}
            </div>
          </Question>
        )}

        {step === 4 && (
          <Question title="어디에서 태어났나요?" sub="태어난 곳의 경도로 그곳의 실제 해의 시각을 맞춰요.">
            <div className="seg" role="radiogroup" aria-label="지역">
              <button type="button" role="radio" aria-checked={!isOverseas} onClick={() => update({ city: '서울' })} className={`seg-item ${!isOverseas ? 'seg-on' : ''}`}>
                국내
              </button>
              <button type="button" role="radio" aria-checked={isOverseas} onClick={() => update({ city: overseas[0]?.name ?? '__custom' })} className={`seg-item ${isOverseas ? 'seg-on' : ''}`}>
                해외
              </button>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2" role="radiogroup" aria-label="태어난 곳">
              {[...(isOverseas ? overseas : domestic).map((c) => c.name), ...(isOverseas ? ['__custom'] : [])].map((name) => (
                <button
                  key={name}
                  type="button"
                  role="radio"
                  aria-checked={d.city === name}
                  onClick={() => update({ city: name })}
                  className={`h-12 rounded-xl border px-1 text-ui transition-colors ${d.city === name ? 'border-accent bg-accent-soft font-bold text-accent' : 'border-line text-ink active:bg-fill'}`}
                >
                  {name === '__custom' ? '직접 입력' : name}
                </button>
              ))}
            </div>
            {d.city === '__custom' && (
              <div className="mt-5 grid gap-3">
                <label className="block">
                  <span className="text-label font-semibold text-ink-2">경도 (동경 +, 서경 −)</span>
                  <input className="field mt-2" inputMode="decimal" value={d.lon} onChange={(e) => update({ lon: e.target.value })} />
                </label>
                <label className="block">
                  <span className="text-label font-semibold text-ink-2">시간대 (예: America/New_York)</span>
                  <input className="field mt-2" value={d.tz} onChange={(e) => update({ tz: e.target.value })} placeholder="Asia/Seoul" />
                </label>
              </div>
            )}
            <button type="button" className="link mt-8 text-label" onClick={() => setAdv((v) => !v)} aria-expanded={adv}>
              {adv ? '계산 기준 닫기' : '계산 기준 바꾸기 (시간 보정·자시)'}
            </button>
            {adv && (
              <div className="mt-4 grid gap-5">
                <label className="block">
                  <span className="text-label font-semibold text-ink-2">시간 보정 방식</span>
                  <select className="field mt-2" value={d.tc} onChange={(e) => update({ tc: e.target.value as Draft['tc'] })}>
                    <option value="mean">평태양시 — 경도 보정 (권장)</option>
                    <option value="true">진태양시 — 경도 + 균시차 보정</option>
                    <option value="none">보정 없음 — 표준시 그대로</option>
                  </select>
                  <span className="mt-1.5 block text-cap text-sub">서울은 표준시보다 해가 약 32분 늦게 떠요. 대부분의 정통 만세력은 평태양시를 써요.</span>
                </label>
                <label className="block">
                  <span className="text-label font-semibold text-ink-2">자시(밤 11시~새벽 1시) 처리</span>
                  <select className="field mt-2" value={d.zr} onChange={(e) => update({ zr: e.target.value as Draft['zr'] })}>
                    <option value="traditional">밤 11시에 날짜 변경 (정통)</option>
                    <option value="split">자정에 날짜 변경 (야자시·조자시)</option>
                  </select>
                  <span className="mt-1.5 block text-cap text-sub">밤 11시~자정에 태어난 분만 영향을 받아요.</span>
                </label>
              </div>
            )}
          </Question>
        )}

        {step === 5 && (
          <Question title="더 알려 주시면 더 자세히 볼게요" sub="모두 선택이에요. 비워 두고 바로 결과를 볼 수도 있어요.">
            <div className="grid gap-6">
              <label className="block">
                <span className="text-label font-semibold text-ink-2">이름</span>
                <input className="field mt-2" value={d.name} onChange={(e) => update({ name: e.target.value })} maxLength={20} placeholder="풀이에서 부를 이름" autoComplete="off" />
              </label>
              <label className="block">
                <span className="text-label font-semibold text-ink-2">MBTI</span>
                <select className="field mt-2" value={d.mbti} onChange={(e) => update({ mbti: e.target.value })}>
                  <option value="">모름 / 입력 안 함</option>
                  {MBTI_LIST.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <JobPicker value={d.job} onChange={(job) => update({ job })} />
            </div>
            <p className="mt-8 text-cap text-sub">입력한 정보는 이 기기 안에서만 계산하고 서버로 보내지 않아요.</p>
          </Question>
        )}
      </div>

      <BottomBar>
        <button type="submit" className="btn-primary w-full" disabled={!valid[step - 1]}>
          {step >= FLOW_STEPS ? '결과 보기' : '다음'}
        </button>
      </BottomBar>
    </form>
  );
}
