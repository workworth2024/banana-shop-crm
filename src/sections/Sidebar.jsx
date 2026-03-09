import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users as UsersIcon,
  UserCheck,
  ShoppingCart,
  Package,
  BookOpen,
  Briefcase,
  Key,
  LifeBuoy,
  Star,
  ChevronRight
} from 'lucide-react';

const SidebarItem = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    style={({ isActive }) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '0.875rem',
      padding: '0.875rem 1.125rem',
      borderRadius: '10px',
      textDecoration: 'none',
      color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
      backgroundColor: isActive ? 'var(--sidebar-item-active)' : 'transparent',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      marginBottom: '0.25rem',
      fontSize: '0.9375rem',
      fontWeight: isActive ? '500' : '400',
      position: 'relative',
      border: isActive ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid transparent'
    })}
  >
    {({ isActive }) => (
      <>
        <Icon size={20} style={{ 
          color: isActive ? 'var(--primary)' : 'var(--sidebar-text)',
          transition: 'color 0.2s'
        }} />
        <span style={{ flex: 1 }}>{label}</span>
        {isActive && <ChevronRight size={14} style={{ opacity: 0.5 }} />}
      </>
    )}
  </NavLink>
);

const Sidebar = () => {
  const menuItems = [
    { to: "/", icon: LayoutDashboard, label: "Главная" },
    { to: "/users", icon: UsersIcon, label: "Пользователи" },
    { to: "/clients", icon: UserCheck, label: "Клиенты" },
    { to: "/purchases", icon: ShoppingCart, label: "История покупок" },
    { to: "/products", icon: Package, label: "Товары" },
    { to: "/manuals", icon: BookOpen, label: "Мануалы" },
    { to: "/services", icon: Briefcase, label: "Услуги" },
    { to: "/account-sales", icon: Key, label: "Продажа аккаунтов" },
    { to: "/reviews", icon: Star, label: "Отзывы" },
    { to: "/support", icon: LifeBuoy, label: "Поддержка" },
  ];

  return (
    <div className="sidebar-container" style={{
      width: '280px',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      borderRight: '1px solid rgba(255, 255, 255, 0.05)',
      boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
      zIndex: 20
    }}>
      <div style={{ 
        padding: '1.75rem 1.5rem', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.75rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        marginBottom: '1rem'
      }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.125rem', color: 'white', fontWeight: '700', letterSpacing: '0.025em' }}>BANANA</h2>
          <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: '600', letterSpacing: '0.1em' }}>CRM SYSTEM</span>
        </div>
      </div>
      
      <nav style={{ 
        padding: '0 1rem',
        flex: 1,
        overflowY: 'auto'
      }}>
        <div style={{ 
          fontSize: '0.65rem', 
          color: '#4b5563', 
          fontWeight: '700', 
          textTransform: 'uppercase', 
          letterSpacing: '0.05em',
          padding: '0.5rem 0.75rem 1rem',
        }}>
          Основное меню
        </div>
        {menuItems.map((item) => (
          <SidebarItem key={item.to} {...item} />
        ))}
      </nav>

      <div style={{ 
        padding: '1.5rem', 
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        backgroundColor: 'rgba(0,0,0,0.2)'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem',
          backgroundColor: 'var(--sidebar-item-active)',
          padding: '0.75rem',
          borderRadius: '12px'
        }}>
          <div style={{ width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%', boxShadow: '0 0 8px #10b981' }} />
          <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: '500' }}>Сервер Online</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
