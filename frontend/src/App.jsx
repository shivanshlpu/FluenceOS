import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/ui/ErrorBoundary';
import useAuthStore from './store/authStore';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Speaking = lazy(() => import('./pages/Speaking'));
const Knowledge = lazy(() => import('./pages/Knowledge'));
const Market = lazy(() => import('./pages/Market'));
const Roadmap = lazy(() => import('./pages/Roadmap'));
const Tracker = lazy(() => import('./pages/Tracker'));
const CVMaker = lazy(() => import('./pages/CVMaker'));
const Auth = lazy(() => import('./pages/Auth'));

function LoadingFallback() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      background: '#121212',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '38px', height: '38px',
          border: '3px solid #282828',
          borderTop: '3px solid #a855f7',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 14px',
        }} />
        <p style={{ color: '#888', fontSize: '13px', fontWeight: 500 }}>Loading module...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/auth" replace />;
  return children;
}

export default function App() {
  return (
    <Router>
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="speaking" element={<Speaking />} />
              <Route path="knowledge" element={<Knowledge />} />
              <Route path="tracker" element={<Tracker />} />
              <Route path="cv-maker" element={<CVMaker />} />
              <Route path="market" element={<Market />} />
              <Route path="roadmap" element={<Roadmap />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Router>
  );
}
