import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import HomePage from '../pages/HomePage';
import VaultPage from '../pages/VaultPage';
import BankPoolPage from '../pages/BankPoolPage';
import StakingPoolPage from '@/pages/StakingPoolPage';
import TokenPage from '@/pages/TokenPage';
import WagmiDemoPage from '@/pages/WagmiDemoPage';

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="vault" element={<VaultPage />} />
        <Route path="bank" element={<BankPoolPage />} />
        <Route path="/staking" element={<StakingPoolPage />} />
        <Route path="token" element={<TokenPage />} />
        <Route path="wagmi-demo" element={<WagmiDemoPage />} />
      </Route>
    </Routes>
  );
};

export default AppRouter;
