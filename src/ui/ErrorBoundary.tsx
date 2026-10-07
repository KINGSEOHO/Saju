/**
 * 화면을 그리다 오류가 나도 흰 화면만 남지 않게 — 안내와 다시 하기 버튼을 보여 준다.
 * resetKey가 바뀌면(다른 화면으로 옮기면) 다시 그려 본다.
 */
import { Component, type ReactNode } from 'react';
import { clearDraft } from '../lib/birthDraft.ts';

interface Props {
  children: ReactNode;
  resetKey?: unknown;
  /** 작은 칸 하나만 대신할 때 */
  inline?: boolean;
}

export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[명경사주] 화면 오류', error);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.inline) {
      return (
        <div className="panel">
          <p className="text-ui font-semibold text-ink">이 부분을 보여 주지 못했어요</p>
          <p className="mt-1 text-label text-sub">다른 풀이는 그대로 볼 수 있어요. 새로고침하면 대부분 해결돼요.</p>
          <button type="button" className="btn-small mt-3" onClick={() => this.setState({ error: null })}>
            다시 시도
          </button>
        </div>
      );
    }
    return (
      <div className="wrap py-16">
        <p className="kicker">잠시 문제가 생겼어요</p>
        <h1 className="mt-2 text-title1 text-ink">화면을 그리다 멈췄어요</h1>
        <p className="mt-3 text-ui text-sub">새로고침하면 대부분 해결돼요. 그래도 같으면 처음부터 다시 입력해 주세요. 입력한 정보는 서버로 보내지 않아요.</p>
        <div className="mt-8 space-y-2">
          <button type="button" className="btn-primary w-full" onClick={() => window.location.reload()}>
            새로고침
          </button>
          <button
            type="button"
            className="btn-secondary w-full"
            onClick={() => {
              clearDraft();
              window.location.hash = '/start/1';
              this.setState({ error: null });
            }}
          >
            처음부터 다시 입력
          </button>
        </div>
      </div>
    );
  }
}
