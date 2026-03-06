import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuthStore } from '../stores/authStore';
import { LogOut, User as UserIcon, Bell, Search } from 'lucide-react';

const AdminLayout = () => {
  const { user, logout, checkAuth, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user && isAuthenticated) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        backgroundColor: 'var(--bg-content)',
        color: 'var(--text-main)' 
      }}>
        Загрузка...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-content)' }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: '280px', display: 'flex', flexDirection: 'column' }}>
        <header style={{
          height: '72px',
          backgroundColor: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2.5rem',
          borderBottom: '1px solid #e5e7eb',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input 
              type="text" 
              placeholder="Поиск по системе..." 
              style={{ 
                padding: '0.625rem 1rem 0.625rem 2.5rem', 
                fontSize: '0.875rem',
                backgroundColor: '#f3f4f6',
                border: 'none',
                width: '100%'
              }} 
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <button style={{ backgroundColor: 'transparent', padding: '0.5rem', color: '#6b7280' }}>
              <Bell size={20} />
            </button>
            
            <div style={{ height: '24px', width: '1px', backgroundColor: '#e5e7eb' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '0.9375rem', color: 'var(--text-main)', fontWeight: '600' }}>{user?.username}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '500', textTransform: 'uppercase' }}>{user?.role}</span>
              </div>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '12px', 
                backgroundColor: 'var(--bg-header)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'white',
                border: '2px solid white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <UserIcon size={20} />
              </div>
            </div>

            <button 
              onClick={handleLogout}
              title="Выйти"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#fee2e2', 
                color: '#ef4444',
                padding: 0,
                border: 'none'
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main style={{
          flex: 1,
          padding: '2.5rem',
          color: 'var(--text-main)',
          maxWidth: '1600px',
          width: '100%',
          margin: '0 auto'
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
