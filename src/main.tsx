import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { initSource } from './lib/source.ts';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
// 함초롱바탕 파일이 없을 때 쓰는 명조 (구글 서버 대신 사이트에 함께 올림, 필요한 글자 조각만 내려받음)
import '@fontsource/noto-serif-kr/400.css';
import '@fontsource/noto-serif-kr/700.css';
import './index.css';

// 지인 리뷰 링크(?from=friend)로 들어왔으면 첫 화면을 그리기 전에 기억해 둔다
initSource();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
