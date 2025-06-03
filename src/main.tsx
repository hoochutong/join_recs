// /src/main.tsx
// React 앱의 진입점(entry point) 파일입니다.
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// ReactDOM.createRoot: 리액트 18에서 사용하는 렌더링 방식입니다.
ReactDOM.createRoot(document.getElementById('root')!).render(
  // React.StrictMode: 개발 시 잠재적 문제를 경고해주는 모드입니다.
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
