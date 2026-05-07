import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AdminLayout from './sections/AdminLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Clients from './pages/Clients';
import Purchases from './pages/Purchases';
import Products from './pages/Products';
import Manuals from './pages/Manuals';
import Services from './pages/Services';
import AccountSales from './pages/AccountSales';
import Support from './pages/Support';
import Reviews from './pages/Reviews';
import ContactForms from './pages/ContactForms';
import Preorders from './pages/Preorders';
import HealthServer from './pages/HealthServer';
import Orders from './pages/Orders';
import Transactions from './pages/Transactions';
import NotifSettings from './pages/NotifSettings';

function App() {
  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { borderRadius: '12px', fontWeight: '600', fontSize: '0.9rem' },
          success: { style: { background: '#16a34a', color: 'white' }, iconTheme: { primary: 'white', secondary: '#16a34a' } },
          error: { style: { background: '#dc2626', color: 'white' }, iconTheme: { primary: 'white', secondary: '#dc2626' } },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="clients" element={<Clients />} />
          <Route path="purchases" element={<Purchases />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/replacements" element={<Orders />} />
          <Route path="orders/services" element={<Orders />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="balance-history" element={<Transactions />} />
          <Route path="products" element={<Products />} />
          <Route path="manuals" element={<Manuals />} />
          <Route path="services" element={<Services />} />
          <Route path="account-sales" element={<AccountSales />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="support" element={<Support />} />
          <Route path="contact-forms" element={<ContactForms />} />
          <Route path="preorders" element={<Preorders />} />
          <Route path="health" element={<HealthServer />} />
          <Route path="notif-settings" element={<NotifSettings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
