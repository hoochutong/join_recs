// /src/App.tsx
// 전체 앱의 라우팅 구조를 정의하는 파일입니다.
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CheckinPage from './pages/CheckinPage';
import AdminPage from './pages/AdminPage';

// App 컴포넌트: 라우터를 통해 페이지를 전환합니다.
function App() {
  return (
    // Router: SPA(싱글 페이지 앱)에서 페이지 이동을 관리합니다.
    <Router>
      {/* Routes: 여러 개의 Route(경로)를 정의합니다. */}
      <Routes>
        {/* '/' 경로로 접속하면 CheckinPage(참여 체크 페이지)로 이동 */}
        <Route path="/" element={<CheckinPage />} />
        {/* '/admin' 경로로 접속하면 AdminPage(관리자 페이지)로 이동 */}
        <Route path="/admin" element={<AdminPage />} />
        {/* 그 외의 모든 경로는 '/'로 리다이렉트 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
