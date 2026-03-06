import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const Register = () => {
  const [formData, setFormData] = useState({ 
    email: '', 
    username: '', 
    password: '', 
    confirmPassword: '' 
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const register = useAuthStore(state => state.register);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setError('Пароли не совпадают');
    }
    
    setLoading(true);
    try {
      const data = await register(formData.username, formData.email, formData.password);
      setSuccess(data.message);
      setFormData({ email: '', username: '', password: '', confirmPassword: '' });
    } catch (err) {
      setError(err.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: 'var(--bg-darker)'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-sidebar)',
        padding: '2.5rem',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <img src="/logo.png" alt="Logo" style={{ width: '220px', marginBottom: '2rem' }} />
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#ffff' }}>Регистрация</h2>
        
        {error && <p style={{ color: '#ff5252', backgroundColor: 'rgba(255,82,82,0.1)', padding: '0.8rem', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '1rem', border: '1px solid #ff5252' }}>{error}</p>}
        {success && <p style={{ color: '#4caf50', backgroundColor: 'rgba(76,175,80,0.1)', padding: '0.8rem', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '1rem', border: '1px solid #4caf50' }}>{success}</p>}

        {!success && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-dim)' }}>Почта</label>
              <input 
                name="email" 
                type="email" 
                placeholder="example@mail.com" 
                required 
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-dim)' }}>Логин</label>
              <input 
                name="username" 
                type="text" 
                placeholder="Введите логин" 
                required 
                value={formData.username}
                onChange={handleChange}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-dim)' }}>Пароль</label>
              <input 
                name="password" 
                type="password" 
                placeholder="Введите пароль" 
                required 
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-dim)' }}>Повторите пароль</label>
              <input 
                name="confirmPassword" 
                type="password" 
                placeholder="Повторите пароль" 
                required 
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
            <button type="submit" disabled={loading} style={{ marginTop: '1rem' }}>
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
          </form>
        )}
        
        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
