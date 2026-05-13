import { useState, useEffect, useCallback } from 'react';
import { Shield, Monitor, Trash2, RefreshCw, QrCode, Check, X, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuthStore } from '../stores/authStore';

function parseUA(ua) {
  if (!ua) return 'Неизвестное устройство';
  if (/mobile/i.test(ua)) return 'Мобильное устройство';
  if (/windows/i.test(ua)) return 'Windows';
  if (/mac os/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Браузер';
}

function SessionsSection() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [terminating, setTerminating] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/auth/sessions');
      setSessions(data.sessions || []);
    } catch {
      toast.error('Ошибка загрузки сессий');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleTerminateOthers = async () => {
    if (!window.confirm('Завершить все другие сессии?')) return;
    setTerminating(true);
    try {
      await api.delete('/auth/sessions/others');
      toast.success('Все другие сессии завершены');
      fetchSessions();
    } catch (err) {
      toast.error(err.message || 'Ошибка');
    } finally {
      setTerminating(false);
    }
  };

  const otherCount = sessions.filter(s => !s.isCurrent).length;

  return (
    <div style={{ background: 'white', borderRadius: '12px', padding: '1.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <Monitor size={20} style={{ color: 'var(--primary)' }} />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)' }}>Активные сессии</h3>
        </div>
        {otherCount > 0 && (
          <button
            onClick={handleTerminateOthers}
            disabled={terminating}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', borderRadius: '8px', border: '1.5px solid #fee2e2', background: '#fff5f5', color: '#ef4444', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: '500' }}
          >
            <Trash2 size={14} />
            Завершить остальные ({otherCount})
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>Загрузка...</p>
      ) : sessions.length === 0 ? (
        <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>Нет активных сессий</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {sessions.map(s => (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.875rem 1rem', borderRadius: '8px',
              background: s.isCurrent ? 'rgba(16,185,129,0.06)' : '#f9fafb',
              border: s.isCurrent ? '1.5px solid rgba(16,185,129,0.2)' : '1px solid #e5e7eb'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-main)' }}>
                    {parseUA(s.device)}
                  </span>
                  {s.isCurrent && (
                    <span style={{ fontSize: '0.7rem', fontWeight: '600', padding: '0.1rem 0.4rem', borderRadius: '4px', background: '#10b981', color: 'white' }}>Текущая</span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  IP: {s.ip || '—'} · {new Date(s.createdAt).toLocaleString('ru-RU')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TwoFASection() {
  const { user, setUser } = useAuthStore();
  const [phase, setPhase] = useState('idle');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    try {
      const data = await api.post('/auth/2fa/setup', {});
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setPhase('confirm');
    } catch (err) {
      toast.error(err.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/2fa/enable', { token: code });
      toast.success('2FA включена');
      setUser({ ...user, twoFAEnabled: true });
      setPhase('idle');
      setCode('');
    } catch (err) {
      toast.error(err.message || 'Неверный код');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/2fa/disable', { token: code });
      toast.success('2FA отключена');
      setUser({ ...user, twoFAEnabled: false });
      setPhase('idle');
      setCode('');
    } catch (err) {
      toast.error(err.message || 'Неверный код');
    } finally {
      setLoading(false);
    }
  };

  const enabled = user?.twoFAEnabled;

  return (
    <div style={{ background: 'white', borderRadius: '12px', padding: '1.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
        <Shield size={20} style={{ color: 'var(--primary)' }} />
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)' }}>Двухфакторная аутентификация</h3>
        <span style={{
          marginLeft: 'auto', fontSize: '0.75rem', fontWeight: '600',
          padding: '0.2rem 0.6rem', borderRadius: '6px',
          background: enabled ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
          color: enabled ? '#065f46' : '#6b7280'
        }}>
          {enabled ? 'Включена' : 'Отключена'}
        </span>
      </div>

      {phase === 'idle' && !enabled && (
        <div>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Защитите аккаунт с помощью приложения-аутентификатора (Google Authenticator, Authy и т.д.)
          </p>
          <button onClick={handleSetup} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.125rem', borderRadius: '8px', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '0.875rem' }}>
            <QrCode size={16} />
            {loading ? 'Загрузка...' : 'Настроить 2FA'}
          </button>
        </div>
      )}

      {phase === 'confirm' && (
        <div>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Отсканируйте QR-код в приложении, затем введите код для подтверждения
          </p>
          {qrCode && (
            <img src={qrCode} alt="QR Code" style={{ display: 'block', width: '180px', height: '180px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '1rem' }} />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <code style={{ fontSize: '0.75rem', background: '#f3f4f6', padding: '0.4rem 0.75rem', borderRadius: '6px', letterSpacing: '0.05em', color: 'var(--text-main)', flex: 1, wordBreak: 'break-all' }}>
              {showSecret ? secret : '••••••••••••••••••••••••••••••••'}
            </code>
            <button type="button" onClick={() => setShowSecret(v => !v)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex' }}>
              {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <form onSubmit={handleEnable} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8125rem', color: 'var(--text-dim)' }}>Код подтверждения</label>
              <input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value)}
                required
                autoFocus
                style={{ textAlign: 'center', letterSpacing: '0.2em' }}
              />
            </div>
            <button type="submit" disabled={loading} style={{ padding: '0.625rem 1.125rem', borderRadius: '8px', background: '#10b981', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Check size={15} />
              {loading ? '...' : 'Включить'}
            </button>
            <button type="button" onClick={() => { setPhase('idle'); setCode(''); }} style={{ padding: '0.625rem 1rem', borderRadius: '8px', background: '#f3f4f6', color: '#374151', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>
              Отмена
            </button>
          </form>
        </div>
      )}

      {phase === 'idle' && enabled && (
        <div>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            2FA активна. Для отключения введите текущий код из приложения-аутентификатора
          </p>
          <form onSubmit={handleDisable} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8125rem', color: 'var(--text-dim)' }}>Код 2FA</label>
              <input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value)}
                required
                style={{ textAlign: 'center', letterSpacing: '0.2em' }}
              />
            </div>
            <button type="submit" disabled={loading} style={{ padding: '0.625rem 1.125rem', borderRadius: '8px', background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <X size={15} />
              {loading ? '...' : 'Отключить'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function Profile() {
  const { user } = useAuthStore();

  return (
    <div style={{ maxWidth: '720px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>Мой профиль</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          {user?.username} · {user?.role}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <SessionsSection />
        <TwoFASection />
      </div>
    </div>
  );
}
