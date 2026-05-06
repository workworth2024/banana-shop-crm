import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Cpu, HardDrive, Database, Clock, AlertTriangle, CheckCircle, XCircle, Server } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v3';

async function fetchStats() {
  const res = await fetch(`${BASE_URL}/health/stats`, { credentials: 'include' });
  if (!res.ok) throw new Error('Ошибка загрузки данных');
  return res.json();
}

function Bar({ percent, color, height = 12 }) {
  const clamp = Math.max(0, Math.min(100, percent || 0));
  return (
    <div style={{ background: '#f3f4f6', borderRadius: 8, overflow: 'hidden', height }}>
      <div style={{
        width: `${clamp}%`,
        height: '100%',
        background: color || '#f59e0b',
        borderRadius: 8,
        transition: 'width 0.5s ease'
      }} />
    </div>
  );
}

function StatCard({ icon: Icon, label, children, accent }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      padding: '1.5rem',
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
      border: `1px solid ${accent || '#e5e7eb'}`,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: (accent || '#f59e0b') + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon size={18} color={accent || '#f59e0b'} />
        </div>
        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#374151' }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

function MiniValue({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ fontWeight: 700, color: color || '#111827' }}>{value}</span>
    </div>
  );
}

function LoadBar({ label, value, max }) {
  const pct = Math.min(100, (value / (max || 8)) * 100);
  const color = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981';
  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
        <span style={{ color: '#6b7280' }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{value}</span>
      </div>
      <Bar percent={pct} color={color} height={8} />
    </div>
  );
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d) parts.push(`${d}д`);
  if (h) parts.push(`${h}ч`);
  parts.push(`${m}м`);
  return parts.join(' ');
}

function formatTs(ts) {
  return new Date(ts).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

export default function HealthServer() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [errFilter, setErrFilter] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchStats();
      setStats(data);
      setError(null);
      setLastUpdate(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [autoRefresh, load]);

  const mem = stats?.memory;
  const cpu = stats?.cpu;
  const disk = stats?.disk;
  const db = stats?.db;
  const errors = stats?.errors || [];

  const memColor = mem?.freePercent < 10 ? '#ef4444' : mem?.freePercent < 25 ? '#f59e0b' : '#10b981';
  const diskColor = disk?.freePercent < 10 ? '#ef4444' : disk?.freePercent < 20 ? '#f59e0b' : '#10b981';

  const filteredErrors = errors.filter(e =>
    !errFilter || e.message?.toLowerCase().includes(errFilter.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: '#f59e0b22',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Server size={22} color="#f59e0b" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#111827' }}>Health Server</h1>
            <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: 2 }}>
              {lastUpdate ? `Обновлено: ${formatTs(lastUpdate)}` : 'Загрузка...'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#6b7280', cursor: 'pointer' }}>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
            Авто (15с)
          </label>
          <button
            onClick={load}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: '#f59e0b', color: 'white',
              border: 'none', borderRadius: 10, cursor: 'pointer',
              fontWeight: 600, fontSize: '0.85rem',
              opacity: loading ? 0.6 : 1
            }}
          >
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Обновить
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '1rem 1.25rem', color: '#dc2626', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard icon={Cpu} label="Нагрузка CPU" accent="#6366f1">
          {cpu ? (
            <>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: 4 }}>{cpu.model} · {cpu.cores} ядра</div>
              <LoadBar label="1 мин" value={cpu.loadAvg['1m']} max={cpu.cores} />
              <LoadBar label="5 мин" value={cpu.loadAvg['5m']} max={cpu.cores} />
              <LoadBar label="15 мин" value={cpu.loadAvg['15m']} max={cpu.cores} />
            </>
          ) : <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>—</div>}
        </StatCard>

        <StatCard icon={Cpu} label="Оперативная память" accent={memColor}>
          {mem ? (
            <>
              <Bar percent={mem.usedPercent} color={memColor} />
              <MiniValue label="Использовано" value={`${mem.usedMB} MB`} color={memColor} />
              <MiniValue label="Свободно" value={`${mem.freeMB} MB`} color={memColor} />
              <MiniValue label="Всего" value={`${mem.totalMB} MB`} />
              <div style={{
                marginTop: 6, fontSize: '0.78rem', fontWeight: 700, color: memColor,
                background: memColor + '15', borderRadius: 8, padding: '0.25rem 0.6rem', display: 'inline-block'
              }}>
                Свободно: {mem.freePercent}%
              </div>
              {mem.freePercent < 10 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#dc2626', fontWeight: 600 }}>
                  <AlertTriangle size={13} /> Загрузка файлов заблокирована
                </div>
              )}
            </>
          ) : <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>—</div>}
        </StatCard>

        <StatCard icon={HardDrive} label="Диск" accent={diskColor}>
          {disk ? (
            <>
              <Bar percent={disk.usedPercent} color={diskColor} />
              <MiniValue label="Использовано" value={`${disk.usedMB} MB`} color={diskColor} />
              <MiniValue label="Свободно" value={`${disk.freeMB} MB`} color={diskColor} />
              <MiniValue label="Всего" value={`${disk.totalMB} MB`} />
              <div style={{
                marginTop: 6, fontSize: '0.78rem', fontWeight: 700, color: diskColor,
                background: diskColor + '15', borderRadius: 8, padding: '0.25rem 0.6rem', display: 'inline-block'
              }}>
                Свободно: {disk.freePercent}%
              </div>
            </>
          ) : <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>—</div>}
        </StatCard>

        <StatCard icon={Database} label="База данных" accent="#3b82f6">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {db?.status === 'connected'
              ? <CheckCircle size={18} color="#10b981" />
              : <XCircle size={18} color="#ef4444" />
            }
            <span style={{
              fontWeight: 700, fontSize: '1rem',
              color: db?.status === 'connected' ? '#10b981' : '#ef4444'
            }}>
              {db?.status === 'connected' ? 'Подключено' : db?.status || '—'}
            </span>
          </div>
          <StatCard icon={Clock} label="Аптайм сервера" accent="#8b5cf6">
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#8b5cf6' }}>
              {stats ? formatUptime(stats.uptimeSeconds) : '—'}
            </div>
          </StatCard>
        </StatCard>
      </div>

      <div style={{
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <AlertTriangle size={18} color="#f59e0b" />
            <span style={{ fontWeight: 700, color: '#374151' }}>Журнал ошибок</span>
            {errors.length > 0 && (
              <span style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#92400e', padding: '0.15rem 0.55rem', borderRadius: 20, fontWeight: 700 }}>
                {errors.length}
              </span>
            )}
          </div>
          <input
            type="text"
            placeholder="Поиск по ошибкам..."
            value={errFilter}
            onChange={e => setErrFilter(e.target.value)}
            style={{
              padding: '0.375rem 0.75rem', fontSize: '0.82rem',
              border: '1px solid #e5e7eb', borderRadius: 8,
              outline: 'none', width: 220
            }}
          />
        </div>

        {filteredErrors.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
            {loading ? 'Загрузка...' : errors.length === 0 ? '✅ Ошибок нет' : 'Ничего не найдено'}
          </div>
        ) : (
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            {filteredErrors.map((e, i) => (
              <div key={i} style={{
                padding: '0.75rem 1.5rem',
                borderBottom: '1px solid #f9fafb',
                background: i % 2 === 0 ? 'white' : '#fafafa'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', color: '#dc2626', fontWeight: 600, wordBreak: 'break-word', marginBottom: 2 }}>
                      {e.message}
                    </div>
                    {e.stack && (
                      <details style={{ marginTop: 4 }}>
                        <summary style={{ fontSize: '0.72rem', color: '#9ca3af', cursor: 'pointer' }}>Stack trace</summary>
                        <pre style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#f9fafb', padding: '0.5rem', borderRadius: 6 }}>
                          {e.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {formatTs(e.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
