import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import Layout from './components/Layout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import PlayersPage from './pages/players/PlayersPage';
import PlayerDetailPage from './pages/players/PlayerDetailPage';
import AgentsPage from './pages/agents/AgentsPage';
import AgentDetailPage from './pages/agents/AgentDetailPage';
import DepositsPage from './pages/finance/DepositsPage';
import WithdrawalsPage from './pages/finance/WithdrawalsPage';
import TransactionsPage from './pages/finance/TransactionsPage';
import FinanceSummaryPage from './pages/finance/FinanceSummaryPage';
import GameProvidersPage from './pages/games/GameProvidersPage';
import PromotionsPage from './pages/promotions/PromotionsPage';
import BonusesPage from './pages/promotions/BonusesPage';
import ReportsPage from './pages/reports/ReportsPage';
import SecurityPage from './pages/security/SecurityPage';
import StaffActivityPage from './pages/security/StaffActivityPage';
import RolesPage from './pages/security/RolesPage';
import StaffPage from './pages/security/StaffPage';
import SettingsPage from './pages/settings/SettingsPage';
import ContentPage from './pages/content/ContentPage';
import SupportPage from './pages/support/SupportPage';
import MissionsPage from './pages/missions/MissionsPage';

function AppRoutes() {
const { staff, loading } = useAuth();
if (loading) return <div className="login"><div className="sk" style={{ width: 400, height: 300 }} /></div>;
if (!staff) return <Routes><Route path="/login" element={<LoginPage />} /><Route path="*" element={<Navigate to="/login" />} /></Routes>;

return (
<Layout>
<Routes>
<Route path="/" element={<DashboardPage />} />
<Route path="/players" element={<PlayersPage />} />
<Route path="/players/:id" element={<PlayerDetailPage />} />
<Route path="/agents" element={<AgentsPage />} />
<Route path="/agents/:id" element={<AgentDetailPage />} />
<Route path="/finance" element={<FinanceSummaryPage />} />
<Route path="/finance/deposits" element={<DepositsPage />} />
<Route path="/finance/withdrawals" element={<WithdrawalsPage />} />
<Route path="/finance/transactions" element={<TransactionsPage />} />
<Route path="/games" element={<GameProvidersPage />} />
<Route path="/promotions" element={<PromotionsPage />} />
<Route path="/promotions/bonuses" element={<BonusesPage />} />
<Route path="/reports" element={<ReportsPage />} />
<Route path="/security" element={<SecurityPage />} />
<Route path="/security/activity" element={<StaffActivityPage />} />
<Route path="/security/roles" element={<RolesPage />} />
<Route path="/security/staff" element={<StaffPage />} />
<Route path="/settings" element={<SettingsPage />} />
<Route path="/content" element={<ContentPage />} />
<Route path="/support" element={<SupportPage />} />
<Route path="/missions" element={<MissionsPage />} />
<Route path="*" element={<Navigate to="/" />} />
</Routes>
</Layout>
);
}

export default function App() {
return <AuthProvider><AppRoutes /></AuthProvider>;
}