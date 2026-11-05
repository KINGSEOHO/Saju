import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './index.css';

// 휴대폰 결제창에서 돌아왔으면 결제 확인을 마저 하고 결제하던 화면으로 — 그때만 결제 코드를 불러온다 (첫 화면을 가볍게)
if (location.search.includes('pay_return')) void import('./lib/payApi.ts').then((m) => m.resumePayment());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
