import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const Login = () => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('credentials');
  const [tempToken, setTempToken] = useState('');
  const [code, setCode] = useState('');
  const login = useAuthStore(state => state.login);
  const verify2FA = useAuthStore(state => state.verify2FA);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(formData.username, formData.password);
      if (data?.requires2FA) {
        setTempToken(data.tempToken);
        setStep('2fa');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verify2FA(tempToken, code);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Неверный код');
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

        {step === 'credentials' ? (
          <>
            <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#ffff' }}>Вход в админ-панель</h2>
            {error && <p style={{ color: '#ff5252', backgroundColor: 'rgba(255,82,82,0.1)', padding: '0.8rem', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '1rem', border: '1px solid #ff5252' }}>{error}</p>}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
              <button type="submit" disabled={loading} style={{ marginTop: '1rem' }}>
                {loading ? 'Вход...' : 'Войти'}
              </button>
            </form>
            <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
              Нет аккаунта? <Link to="/register">Регистрация</Link>
            </p>
          </>
        ) : (
          <>
            <h2 style={{ marginBottom: '0.5rem', textAlign: 'center', color: '#ffff' }}>Двухфакторная аутентификация</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              Введите код из приложения-аутентификатора
            </p>
            {error && <p style={{ color: '#ff5252', backgroundColor: 'rgba(255,82,82,0.1)', padding: '0.8rem', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '1rem', border: '1px solid #ff5252' }}>{error}</p>}
            <form onSubmit={handle2FASubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-dim)' }}>Код 2FA</label>
                <input
                  type="text"
                  placeholder="000000"
                  required
                  maxLength={6}
                  value={code}
                  onChange={e => { setCode(e.target.value); setError(''); }}
                  autoFocus
                  style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: '1.25rem' }}
                />
              </div>
              <button type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
                {loading ? 'Проверка...' : 'Подтвердить'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('credentials'); setError(''); setCode(''); }}
                style={{ background: 'transparent', color: 'var(--text-dim)', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
              >
                ← Назад
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
