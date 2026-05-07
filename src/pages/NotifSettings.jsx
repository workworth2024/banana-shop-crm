import React, { useEffect, useState } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Bell, Save } from 'lucide-react';

const SETTINGS_META = [
  {
    group: 'Транзакции',
    items: [
      { key: 'transaction_deposit', label: 'Пополнение баланса' },
      { key: 'transaction_payment', label: 'Списание с баланса' }
    ]
  },
  {
    group: 'Пользователи',
    items: [
      { key: 'user_registration', label: 'Новая регистрация' }
    ]
  },
  {
    group: 'Покупки',
    items: [
      { key: 'order_product', label: 'Заказ товара' },
      { key: 'order_preorder', label: 'Предзаказ' },
      { key: 'order_replacement', label: 'Запрос на замену' }
    ]
  },
  {
    group: 'Поддержка',
    items: [
      { key: 'support_ticket', label: 'Новый тикет' }
    ]
  }
];

const cardStyle = {
  background: 'white', borderRadius: '16px', padding: '1.5rem',
  border: '1px solid #e5e7eb', marginBottom: '1rem',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
};

export default function NotifSettings() {
  const [enabled, setEnabled] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/admin-notifications/settings')
      .then(d => setEnabled({ ...d.settings?.enabled }))
      .catch(() => toast.error('Ошибка загрузки настроек'))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (key) => {
    setEnabled(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.request('/admin-notifications/settings', {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
        headers: { 'Content-Type': 'application/json' }
      });
      toast.success('Настройки сохранены');
    } catch {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Загрузка...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
        <Bell size={22} style={{ color: 'var(--primary)' }} />
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-main)' }}>
          Настройки уведомлений
        </h1>
      </div>

      {SETTINGS_META.map(group => (
        <div key={group.group} style={cardStyle}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1rem' }}>
            {group.group}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {group.items.map(item => (
              <label key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: '1rem' }}>
                <span style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: '500' }}>{item.label}</span>
                <div
                  onClick={() => toggle(item.key)}
                  style={{
                    width: '44px', height: '24px', borderRadius: '12px',
                    background: enabled?.[item.key] ? 'var(--primary)' : '#d1d5db',
                    position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0
                  }}
                >
                  <div style={{
                    position: 'absolute', top: '3px',
                    left: enabled?.[item.key] ? '23px' : '3px',
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: 'white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    transition: 'left 0.2s'
                  }} />
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={save}
        disabled={saving}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.65rem 1.5rem', borderRadius: '10px', border: 'none',
          background: 'var(--primary)', color: 'white',
          fontSize: '0.875rem', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1
        }}
      >
        <Save size={16} /> {saving ? 'Сохранение...' : 'Сохранить настройки'}
      </button>
    </div>
  );
}
