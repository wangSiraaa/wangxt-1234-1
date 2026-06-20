import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './hooks/useAuthStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import CaseList from './pages/CaseList';
import CaseDetail from './pages/CaseDetail';
import CaseCreate from './pages/CaseCreate';
import Clients from './pages/Clients';

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/cases" replace /> : <Login />}
      />
      <Route
        path="/*"
        element={
          isAuthenticated ? (
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/cases" replace />} />
                <Route path="/cases" element={<CaseList />} />
                <Route path="/cases/new" element={<CaseCreate />} />
                <Route path="/cases/:id" element={<CaseDetail />} />
                <Route path="/clients" element={<Clients />} />
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export default App;
