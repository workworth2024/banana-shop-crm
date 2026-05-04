import React, { useState, useEffect, useCallback } from 'react';
import { Search, Check, X, ChevronLeft, ChevronRight, DollarSign, Eye, RefreshCw, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { getClients, toggleClientStatus, adjustClientBalance, resetClientPassword } from '../api/clients';
import { useAuthStore } from '../stores/authStore';

const StatusBadge = ({ active }) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.3rem 0.65rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '600',
    backgroundColor: active ? '#ecfdf5' : '#fef2f2',
    color: active ? '#059669' : '#dc2626'
  }}>
    {active ? <Check size={12} /> : <X size={12} />}
    {active ? 'Активен' : 'Заблокирован'}
  </span>
);

const Clients = () => {
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'admin';

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [selectedClient, setSelectedClient] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceNote, setBalanceNote] = useState('');
  const [balanceLoading, setBalanceLoading] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
        search,
        status: filterStatus
      });
      const data = await getClients(params);
      setClients(data.customers);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      toast.error(err.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, filterStatus]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleToggleStatus = async (client) => {
    if (!isAdmin) return;
    try {
      const res = await toggleClientStatus(client._id);
      toast.success(`Клиент ${res.status ? 'активирован' : 'заблокирован'}`);
      fetchClients();
    } catch (err) {
      toast.error(err.message || 'Ошибка');
    }
  };

  const openBalanceModal = (client) => {
    setSelectedClient(client);
    setBalanceAmount('');
    setBalanceNote('');
    setShowBalanceModal(true);
  };

  const handleBalanceSubmit = async (e) => {
    e.preventDefault();
    const num = parseFloat(balanceAmount);
    if (isNaN(num) || num === 0) {
      toast.error('Введите корректную сумму (не 0)');
      return;
    }
    setBalanceLoading(true);
    try {
      const res = await adjustClientBalance(selectedClient._id, num, balanceNote);
      toast.success(`Баланс обновлён: $${res.balance.toFixed(2)}`);
      setShowBalanceModal(false);
      fetchClients();
    } catch (err) {
      toast.error(err.message || 'Ошибка');
    } finally {
      setBalanceLoading(false);
    }
  };

  const openPasswordModal = (client) => {
    setSelectedClient(client);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      toast.error('Пароль должен содержать минимум 8 символов');
      return;
    }
    setPasswordLoading(true);
    try {
      await resetClientPassword(selectedClient._id, newPassword);
      toast.success('Пароль успешно изменён');
      setShowPasswordModal(false);
    } catch (err) {
      toast.error(err.message || 'Ошибка');
    } finally {
      setPasswordLoading(false);
    }
  };

  const openDetail = (client) => {
    setSelectedClient(client);
    setShowDetailModal(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: 'var(--text-main)' }}>Клиенты</h1>
          <p style={{ color: 'var(--text-dim)', marginTop: '0.25rem' }}>
            База покупателей магазина
          </p>
        </div>
        <button onClick={fetchClients} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem' }}>
          <RefreshCw size={16} />
          Обновить
        </button>
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Поиск по имени, email, UID, Telegram..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
          style={{ minWidth: '150px' }}
        >
          <option value="">Все статусы</option>
          <option value="true">Активен</option>
          <option value="false">Заблокирован</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>UID / Дата</th>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Клиент</th>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Telegram</th>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Баланс (USD)</th>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Статус</th>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Загрузка...</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Клиенты не найдены</td></tr>
            ) : clients.map((c) => (
              <tr key={c._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace', fontWeight: '600' }}>#{c.uid}</div>
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.2rem' }}>{new Date(c.createdAt).toLocaleDateString('ru-RU')}</div>
                </td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{c.username}</div>
                  <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{c.email}</div>
                </td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  {c.telegramUsername ? (
                    <span style={{ fontSize: '0.875rem', color: '#0ea5e9' }}>@{c.telegramUsername}</span>
                  ) : (
                    <span style={{ color: '#d1d5db', fontSize: '0.875rem' }}>—</span>
                  )}
                </td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <span style={{ fontWeight: '700', color: c.balance > 0 ? '#059669' : 'var(--text-main)' }}>
                    ${c.balance.toFixed(2)}
                  </span>
                </td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <StatusBadge active={c.status} />
                </td>
                <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => openDetail(c)}
                      style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', color: '#4b5563', borderRadius: '8px' }}
                      title="Просмотр"
                    >
                      <Eye size={16} />
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => openBalanceModal(c)}
                          style={{ padding: '0.5rem', backgroundColor: '#ecfdf5', color: '#059669', borderRadius: '8px' }}
                          title="Изменить баланс"
                        >
                          <DollarSign size={16} />
                        </button>
                        <button
                          onClick={() => openPasswordModal(c)}
                          style={{ padding: '0.5rem', backgroundColor: '#eff6ff', color: '#3b82f6', borderRadius: '8px' }}
                          title="Сменить пароль"
                        >
                          <KeyRound size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(c)}
                          style={{
                            padding: '0.5rem',
                            backgroundColor: c.status ? '#fef2f2' : '#ecfdf5',
                            color: c.status ? '#ef4444' : '#059669',
                            borderRadius: '8px'
                          }}
                          title={c.status ? 'Заблокировать' : 'Активировать'}
                        >
                          {c.status ? <X size={16} /> : <Check size={16} />}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Всего: <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{total}</span> клиентов
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', color: '#4b5563', opacity: currentPage === 1 ? 0.5 : 1 }}
            >
              <ChevronLeft size={18} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', fontSize: '0.875rem', fontWeight: '600' }}>
              {currentPage} / {pages || 1}
            </div>
            <button
              disabled={currentPage >= pages}
              onClick={() => setCurrentPage(p => p + 1)}
              style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', color: '#4b5563', opacity: currentPage >= pages ? 0.5 : 1 }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedClient && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '20px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: '700' }}>Карточка клиента</h2>
              <button type="button" onClick={() => setShowDetailModal(false)} style={{ padding: '0.5rem', backgroundColor: '#d1d5db', color: '#111827', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { label: 'UID', value: `#${selectedClient.uid}` },
                { label: 'Username', value: selectedClient.username },
                { label: 'Email', value: selectedClient.email },
                { label: 'Telegram', value: selectedClient.telegramUsername ? `@${selectedClient.telegramUsername}` : '—' },
                { label: 'Баланс', value: `$${selectedClient.balance.toFixed(2)}` },
                { label: 'Реферальный код', value: selectedClient.referralCode },
                { label: '2FA', value: selectedClient.twoFAEnabled ? 'Включён' : 'Выключен' },
                { label: 'Статус', value: selectedClient.status ? 'Активен' : 'Заблокирован' },
                { label: 'Зарегистрирован', value: new Date(selectedClient.createdAt).toLocaleString('ru-RU') },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>{label}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-main)' }}>{value}</span>
                </div>
              ))}
            </div>

            <button onClick={() => setShowDetailModal(false)} style={{ marginTop: '1.5rem', width: '100%', backgroundColor: '#f3f4f6', color: '#4b5563' }}>
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && selectedClient && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '20px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontWeight: '700' }}>Сменить пароль</h2>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>{selectedClient.username}</p>
              </div>
              <button type="button" onClick={() => setShowPasswordModal(false)} style={{ padding: '0.5rem', backgroundColor: '#d1d5db', color: '#111827', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Новый пароль <span style={{ color: '#9ca3af', fontWeight: 400 }}>(минимум 8 символов)</span>
                </label>
                <input
                  type="password"
                  placeholder="Введите новый пароль..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => setShowPasswordModal(false)} style={{ flex: 1, backgroundColor: '#f3f4f6', color: '#4b5563' }}>
                  Отмена
                </button>
                <button type="submit" disabled={passwordLoading} style={{ flex: 1 }}>
                  {passwordLoading ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Balance Modal */}
      {showBalanceModal && selectedClient && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '20px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontWeight: '700' }}>Изменить баланс</h2>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  {selectedClient.username} — текущий: <strong>${selectedClient.balance.toFixed(2)}</strong>
                </p>
              </div>
              <button type="button" onClick={() => setShowBalanceModal(false)} style={{ padding: '0.5rem', backgroundColor: '#d1d5db', color: '#111827', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBalanceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Сумма (USD) <span style={{ color: '#9ca3af', fontWeight: 400 }}>— отрицательная для списания</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Например: 10.00 или -5.00"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  Комментарий <span style={{ color: '#9ca3af', fontWeight: 400 }}>(необязательно)</span>
                </label>
                <input
                  type="text"
                  placeholder="Причина корректировки..."
                  value={balanceNote}
                  onChange={(e) => setBalanceNote(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowBalanceModal(false)} style={{ flex: 1, backgroundColor: '#f3f4f6', color: '#4b5563' }}>
                  Отмена
                </button>
                <button type="submit" disabled={balanceLoading} style={{ flex: 1 }}>
                  {balanceLoading ? 'Сохранение...' : 'Применить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
