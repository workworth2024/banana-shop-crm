import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="clients" element={<Clients />} />
          <Route path="purchases" element={<Purchases />} />
          <Route path="products" element={<Products />} />
          <Route path="manuals" element={<Manuals />} />
          <Route path="services" element={<Services />} />
          <Route path="account-sales" element={<AccountSales />} />
          <Route path="support" element={<Support />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
