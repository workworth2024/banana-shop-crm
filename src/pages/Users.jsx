import React, { useState, useEffect, useCallback } from 'react';
import { Search, UserPlus, MoreVertical, Edit2, Key, Trash2, Check, X, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { getUsers, getRoles, createUser, updateUser, deleteUser } from '../api/users';
import { useAuthStore } from '../stores/authStore';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'admin';

  // Form states
  const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'new', status: true });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: currentPage, search, role: filterRole, status: filterStatus });
      const data = await getUsers(params);
      setUsers(data.users);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, filterRole, filterStatus]);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers]);

  const fetchRoles = async () => {
    try {
      const data = await getRoles();
      setRoles(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createUser(formData);
      setShowCreateModal(false);
      setFormData({ username: '', email: '', password: '', role: 'new', status: true });
      fetchUsers();
      toast.success('Пользователь создан');
    } catch (err) {
      toast.error(err.message || 'Ошибка создания');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await updateUser(selectedUser._id, formData);
      setShowEditModal(false);
      setSelectedUser(null);
      setFormData({ username: '', email: '', password: '', role: 'new', status: true });
      fetchUsers();
      toast.success('Пользователь обновлён');
    } catch (err) {
      toast.error(err.message || 'Ошибка обновления');
    }
  };

  const toggleStatus = async (user) => {
    if (!isAdmin) return;
    try {
      await updateUser(user._id, { status: !user.status });
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Ошибка смены статуса');
    }
  };

  const handleDelete = async (userId) => {
    if (!isAdmin || !window.confirm('Вы уверены?')) return;
    try {
      await deleteUser(userId);
      fetchUsers();
      toast.success('Пользователь удалён');
    } catch (err) {
      toast.error(err.message || 'Ошибка удаления');
    }
  };

  const openEdit = (user) => {
    setSelectedUser(user);
    setFormData({ 
      username: user.username, 
      email: user.email, 
      role: user.role_id.name, 
      status: user.status,
      password: '' 
    });
    setShowEditModal(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: 'var(--text-main)' }}>Пользователи</h1>
          <p style={{ color: 'var(--text-dim)', marginTop: '0.25rem' }}>Управление учетными записями и правами доступа</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowCreateModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem' }}
          >
            <UserPlus size={20} />
            Добавить пользователя
          </button>
        )}
      </div>

      {/* Filters & Search */}
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
            placeholder="Поиск по имени или почте..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
        
        <select 
          value={filterRole} 
          onChange={(e) => setFilterRole(e.target.value)}
          style={{ minWidth: '150px' }}
        >
          <option value="">Все роли</option>
          {roles.map(r => <option key={r._id} value={r.name}>{r.name}</option>)}
        </select>

        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
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
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>ID / Дата</th>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Пользователь</th>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Роль</th>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Статус</th>
              <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}></th>
            </tr>
          </thead>
          <tbody style={{ divideY: '1px solid #e5e7eb' }}>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Загрузка...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Пользователи не найдены</td></tr>
            ) : users.map(u => (
              <tr key={u._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace' }}>{u._id.slice(-8)}</div>
                  <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.25rem' }}>{new Date(u.createdAt).toLocaleDateString()}</div>
                </td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{u.username}</div>
                  <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{u.email}</div>
                </td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.625rem', 
                    borderRadius: '9999px', 
                    fontSize: '0.75rem', 
                    fontWeight: '600',
                    backgroundColor: u.role_id?.name === 'admin' ? '#fee2e2' : u.role_id?.name === 'manager' ? '#e0f2fe' : '#f3f4f6',
                    color: u.role_id?.name === 'admin' ? '#991b1b' : u.role_id?.name === 'manager' ? '#075985' : '#374151'
                  }}>
                    {u.role_id?.name || 'New'}
                  </span>
                </td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <button 
                    onClick={() => toggleStatus(u)}
                    disabled={!isAdmin || u._id === currentUser?.id}
                    style={{ 
                      backgroundColor: u.status ? '#ecfdf5' : '#fef2f2',
                      color: u.status ? '#059669' : '#dc2626',
                      padding: '0.375rem 0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      cursor: (isAdmin && u._id !== currentUser?.id) ? 'pointer' : 'default',
                      opacity: u._id === currentUser?.id ? 0.7 : 1
                    }}
                  >
                    {u.status ? <Check size={14} /> : <X size={14} />}
                    {u.status ? 'Активен' : 'Заблокирован'}
                  </button>
                </td>
                <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => openEdit(u)} style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', color: '#4b5563', borderRadius: '8px' }} title="Редактировать">
                        <Edit2 size={16} />
                      </button>
                      {u._id !== currentUser?.id && (
                        <button onClick={() => handleDelete(u._id)} style={{ padding: '0.5rem', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '8px' }} title="Удалить">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Pagination */}
        <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Всего: <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{total}</span> пользователей
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', color: '#4b5563', opacity: currentPage === 1 ? 0.5 : 1 }}
            >
              <ChevronLeft size={18} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', fontSize: '0.875rem', fontWeight: '600' }}>
              {currentPage} / {pages}
            </div>
            <button 
              disabled={currentPage === pages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', color: '#4b5563', opacity: currentPage === pages ? 0.5 : 1 }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Overlay Style */}
      {(showCreateModal || showEditModal) && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 
        }}>
          <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '20px', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontWeight: '700' }}>
                {showCreateModal ? 'Создать пользователя' : 'Редактировать пользователя'}
              </h2>
              <button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} style={{ padding: '0.5rem', backgroundColor: '#d1d5db', color: '#111827', borderRadius: '8px', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={showCreateModal ? handleCreate : handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Логин</label>
                <input 
                  type="text" 
                  value={formData.username} 
                  onChange={(e) => setFormData({...formData, username: e.target.value})} 
                  required 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Email</label>
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  required 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  {showEditModal ? 'Новый пароль (оставьте пустым, если не меняете)' : 'Пароль'}
                </label>
                <input 
                  type="password" 
                  value={formData.password} 
                  onChange={(e) => setFormData({...formData, password: e.target.value})} 
                  required={showCreateModal}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Роль</label>
                <select 
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  {roles.map(r => <option key={r._id} value={r.name}>{r.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input 
                  type="checkbox" 
                  checked={formData.status} 
                  onChange={(e) => setFormData({...formData, status: e.target.checked})}
                  style={{ width: 'auto' }} 
                />
                <span style={{ fontSize: '0.875rem' }}>Активен</span>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); setSelectedUser(null); }} style={{ flex: 1, backgroundColor: '#f3f4f6', color: '#4b5563' }}>Отмена</button>
                <button type="submit" style={{ flex: 1 }}>{showCreateModal ? 'Создать' : 'Сохранить'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
