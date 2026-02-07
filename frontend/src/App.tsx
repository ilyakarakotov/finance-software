import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppLayout from './components/layout/AppLayout';
import ProjectList from './components/project/ProjectList';
import ProjectSetup from './components/project/ProjectSetup';
import BudgetTable from './components/budget/BudgetTable';
import CapitalStack from './components/capital/CapitalStack';
import CashflowTimeline from './components/cashflow/CashflowTimeline';
import SummaryDashboard from './components/dashboard/SummaryDashboard';
import SalesSchedule from './components/sales/SalesSchedule';
import BudgetManager from './components/budget/BudgetManager';
import LoanDrawSchedule from './components/loan-draw/LoanDrawSchedule';
import BCMappingTable from './components/builders-capital/BCMappingTable';
import BenchmarkComparison from './components/budget/BenchmarkComparison';
import CostCodeTemplate from './components/cost-codes/CostCodeTemplate';

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a2846',
            color: '#e2e8f0',
            border: '1px solid #34508c',
            fontSize: '13px',
          },
        }}
      />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<ProjectList />} />
          <Route path="/cost-code-template" element={<CostCodeTemplate />} />
          <Route path="/project/:projectId" element={<Navigate to="setup" replace />} />
          <Route path="/project/:projectId/setup" element={<ProjectSetup />} />
          <Route path="/project/:projectId/budget" element={<BudgetTable />} />
          <Route path="/project/:projectId/budget-v2" element={<BudgetManager />} />
          <Route path="/project/:projectId/capital" element={<CapitalStack />} />
          <Route path="/project/:projectId/cashflow" element={<CashflowTimeline />} />
          <Route path="/project/:projectId/dashboard" element={<SummaryDashboard />} />
          <Route path="/project/:projectId/sales" element={<SalesSchedule />} />
          <Route path="/project/:projectId/loan-draws" element={<LoanDrawSchedule />} />
          <Route path="/project/:projectId/builders-capital" element={<BCMappingTable />} />
          <Route path="/project/:projectId/benchmarks" element={<BenchmarkComparison />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
