import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LotteryTerminal from './LotteryTerminal';
import Lottery3DTerminal from './Lottery3DTerminal';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { ResultsPage } from './pages/ResultsPage';
import { HistoryPage } from './pages/HistoryPage';
import { AdvanceDrawPage } from './pages/AdvanceDrawPage';
import { AdvanceDraw3DPage } from './pages/AdvanceDraw3DPage';
import { CancelTicketPage } from './pages/CancelTicketPage';
import MaintenancePage from './pages/MaintenancePage';
import { AuthProvider, useAuth } from './lib/AuthContext';

// Set to true to enable maintenance mode
const MAINTENANCE_MODE = false;

function AppRoutes() {
  const { user, loading } = useAuth();

  if (MAINTENANCE_MODE) {
    return <MaintenancePage />;
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#2a1a2e',
        color: '#ffd700',
        fontFamily: "Arial, sans-serif",
        fontSize: '14px',
        fontWeight: 800,
        letterSpacing: '2px',
      }}>
        LOADING...
      </div>
    );
  }

  const isAuthenticated = !!user;

  return (
    <Routes>
      <Route
        path="/"
        element={isAuthenticated ? <LotteryTerminal /> : <LandingPage />}
      />
      <Route
        path="/login"
        element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />}
      />
      <Route path="/2d-result" element={<ResultsPage />} />
      <Route
        path="/results"
        element={isAuthenticated ? <ResultsPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/3d"
        element={isAuthenticated ? <Lottery3DTerminal /> : <Navigate to="/" replace />}
      />
      <Route
        path="/history"
        element={isAuthenticated ? <HistoryPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/advance-draw"
        element={isAuthenticated ? <AdvanceDrawPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/cancel-ticket"
        element={isAuthenticated ? <CancelTicketPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/3d-advance-draw"
        element={isAuthenticated ? <AdvanceDraw3DPage /> : <Navigate to="/" replace />}
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
