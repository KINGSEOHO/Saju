import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './index.css';
import { resumePayment } from './lib/payApi.ts';

// 휴대폰 결제창에서 돌아왔으면 결제 확인을 마저 하고 결제하던 화면으로 (결제 확인 서버가 있을 때만)
resumePayment();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
