/**
 * 직업 입력 — 누르면 언제나 전체 추천 목록이 열리고, 글자를 치면 그때만 걸러진다.
 * (브라우저 기본 datalist는 이미 고른 값으로 목록을 걸러, 한 번 고르면 다른 직업을 고를 수 없었다)
 */
import { useId, useState } from 'react';
import { JOB_SUGGEST } from '../report/job.ts';

export function JobPicker({ value, onChange, onPick, autoFocus }: { value: string; onChange: (v: string) => void; onPick?: (v: string) => void; autoFocus?: boolean }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState(false);
  const q = value.trim();
  const list = typed && q ? JOB_SUGGEST.filter((j) => j.includes(q) || q.includes(j)) : JOB_SUGGEST;
  const pick = (j: string) => {
    onChange(j);
    setTyped(false);
    setOpen(false);
    // 다음에 누를 때 다시 목록이 열리도록(모바일 키보드도 닫힌다)
    (document.activeElement as HTMLElement | null)?.blur();
    onPick?.(j);
  };
  return (
    <div className="relative">
      <label htmlFor={id} className="mb-2 block text-label font-semibold text-ink">
        직업·하는 일
      </label>
      <div className="relative">
        <input
          id={id}
          className="field pr-11"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setTyped(true);
            setOpen(true);
          }}
          onFocus={() => {
            setTyped(false);
            setOpen(true);
          }}
          onClick={() => {
            if (!open) {
              setTyped(false);
              setOpen(true);
            }
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 180)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
          maxLength={30}
          placeholder="예) 개발자, 간호사, 대학생"
          autoComplete="off"
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
        />
        {value && (
          <button
            type="button"
            aria-label="직업 지우기"
            className="absolute top-1/2 right-2.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-sub active:bg-fill"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange('');
              setTyped(false);
              setOpen(true);
            }}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </div>
      {open && list.length > 0 && (
        <div id={`${id}-list`} role="listbox" className="absolute z-30 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-line bg-bg p-2">
          <div className="flex flex-wrap gap-1.5">
            {list.map((j) => (
              <button
                key={j}
                type="button"
                role="option"
                aria-selected={j === value}
                className={`rounded-lg px-3 py-2 text-label ${j === value ? 'bg-accent-tint font-semibold text-accent-strong' : 'bg-fill text-ink active:bg-line'}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(j)}
              >
                {j}
              </button>
            ))}
          </div>
          {typed && q && !JOB_SUGGEST.includes(q) && <p className="mt-2 px-1 text-cap text-sub">목록에 없으면 그대로 입력해도 돼요.</p>}
        </div>
      )}
    </div>
  );
}
