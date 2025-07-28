import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeContextProvider } from './context/ThemeContext';

// Authentication
import SignIn from './pages/Login';

// Layout
import DashboardLayout from './component/DashboardLayout';

// PrivateRoute
import PrivateRoute from './PrivateRoute';

// Main Pages
import Dashboard from './pages/Dashboard';
import Warehouse from './pages/Warehouse';
import AuditTrail from './pages/Audit';
import Alerts from './pages/Alerts';
import UserManagement from './pages/Users';

// Inventory Management
import StockTracking from './pages/inventory/Stock';
import ItemMaster from './pages/inventory/Items';
import BinLocations from './pages/inventory/Bins';
import ExpiryTracking from './pages/inventory/Expiry';

// Procurement
import PurchaseOrders from './pages/procurement/Orders';
import Requisitions from './pages/procurement/Requisitions';
import Receiving from './pages/procurement/Receiving';
import POApproval from './pages/procurement/Approvals'

// Analytics
import StockAnalytics from './pages/analytics/Stock';
import DwellTime from './pages/analytics/Dwell';
import EOQReports from './pages/analytics/EOQ';

// Settings
import ERPIntegration from './pages/settings/ERP';
import CompanyBranding from './pages/settings/Branding';
import TrackerSetup from './pages/settings/Trackers';

// Finance 
import FinanceOverview from './pages/finance/Overview';
import FinanceCategories from './pages/finance/Categories';
import FinanceTransactions from './pages/finance/Transactions';

// Receipt
import ReceiptCreate from './pages/receipt/Create';
import ReceiptSigning from './pages/receipt/Signing';
import ReceiptArchive from './pages/receipt/Archive';

// Rentals
import ActiveRentals from './pages/rentals/Active';
import RentalPayments from './pages/rentals/Payments';
import EquipmentCatalog from './pages/rentals/Catalog';

function App() {
  return (
    <ThemeContextProvider>
      <Router>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<SignIn />} />

          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* ✅ Protected routes */}
          <Route element={<PrivateRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />

              <Route path="/dashboard/warehouse" element={<Warehouse />} />
              <Route path="/dashboard/audit" element={<AuditTrail />} />
              <Route path="/dashboard/alerts" element={<Alerts />} />
              <Route path="/dashboard/users" element={<UserManagement />} />

              {/* Inventory */}
              <Route path="/dashboard/inventory/stock" element={<StockTracking />} />
              <Route path="/dashboard/inventory/items" element={<ItemMaster />} />
              <Route path="/dashboard/inventory/bins" element={<BinLocations />} />
              <Route path="/dashboard/inventory/expiry" element={<ExpiryTracking />} />

              {/* Procurement */}
              <Route path="/dashboard/procurement/orders" element={<PurchaseOrders />} />
              <Route path="/dashboard/procurement/requisitions" element={<Requisitions />} />
              <Route path="/dashboard/procurement/receiving" element={<Receiving />} />
              <Route path="/dashboard/procurement/approval" element={<POApproval />} />

              {/* Finance */}
              <Route path="/dashboard/finance/overview" element={<FinanceOverview />} />
              <Route path="/dashboard/finance/categories" element={<FinanceCategories />} />
              <Route path="/dashboard/finance/transactions" element={<FinanceTransactions />} />

              {/* Receipt */}
              <Route path="/dashboard/receipts/create" element={<ReceiptCreate />} />
              <Route path="/dashboard/receipts/signing" element={<ReceiptSigning />} />
              <Route path="/dashboard/receipts/archive" element={<ReceiptArchive />} />

              {/* Rentals */}
              <Route path="/dashboard/rentals/active" element={<ActiveRentals />} />
              <Route path="/dashboard/rentals/payments" element={<RentalPayments />} />
              <Route path="/dashboard/rentals/catalog" element={<EquipmentCatalog />} />

              {/* Analytics */}
              <Route path="/dashboard/analytics/stock" element={<StockAnalytics />} />
              <Route path="/dashboard/analytics/dwell" element={<DwellTime />} />
              <Route path="/dashboard/analytics/eoq" element={<EOQReports />} />

              {/* Settings */}
              <Route path="/dashboard/settings/erp" element={<ERPIntegration />} />
              <Route path="/dashboard/settings/branding" element={<CompanyBranding />} />
              <Route path="/dashboard/settings/trackers" element={<TrackerSetup />} />
            </Route>
          </Route>

          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </ThemeContextProvider>
  );
}

export default App;
