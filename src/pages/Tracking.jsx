import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';
import toast from 'react-hot-toast';
import {
  Link2, BarChart3, LayoutDashboard, Plus, Trash2, Pencil, Copy, Check,
  X, Search, MousePointerClick, UserPlus, ShoppingBag, DollarSign, Globe, Monitor,
  Percent, Fingerprint, Smartphone, Tablet, Bot, HelpCircle, Filter
} from 'lucide-react';
import trackingApi from '../api/tracking';

const fmtMoney = (n) => `$${(Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const fmtInt = (n) => (Number(n) || 0).toLocaleString('ru-RU');
const fmtPct = (n) => `${(Number(n) || 0).toFixed(1)}%`;
const crOf = (s = {}) => (s.clicks ? (s.registrations / s.clicks) * 100 : 0);

const moneyGreen = { color: '#16a34a', fontWeight: 700 };

const DEVICE_LABELS = { mobile: 'Мобильные', tablet: 'Планшеты', desktop: 'Десктоп', bot: 'Боты', unknown: 'Неизвестно' };
const DEVICE_ICON = { desktop: Monitor, mobile: Smartphone, tablet: Tablet, bot: Bot, unknown: HelpCircle };

const OS_BRAND = {
  Windows: { color: '#00A4EF', path: 'M0,0H11.377V11.372H0ZM12.623,0H24V11.372H12.623ZM0,12.623H11.377V24H0Zm12.623,0H24V24H12.623' },
  macOS: { color: '#111827', path: 'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701' },
  iOS: { color: '#111827', path: 'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701' },
  Android: { color: '#3DDC84', path: 'M18.4395 5.5586c-.675 1.1664-1.352 2.3318-2.0274 3.498-.0366-.0155-.0742-.0286-.1113-.043-1.8249-.6957-3.484-.8-4.42-.787-1.8551.0185-3.3544.4643-4.2597.8203-.084-.1494-1.7526-3.021-2.0215-3.4864a1.1451 1.1451 0 0 0-.1406-.1914c-.3312-.364-.9054-.4859-1.379-.203-.475.282-.7136.9361-.3886 1.5019 1.9466 3.3696-.0966-.2158 1.9473 3.3593.0172.031-.4946.2642-1.3926 1.0177C2.8987 12.176.452 14.772 0 18.9902h24c-.119-1.1108-.3686-2.099-.7461-3.0683-.7438-1.9118-1.8435-3.2928-2.7402-4.1836a12.1048 12.1048 0 0 0-2.1309-1.6875c.6594-1.122 1.312-2.2559 1.9649-3.3848.2077-.3615.1886-.7956-.0079-1.1191a1.1001 1.1001 0 0 0-.8515-.5332c-.5225-.0536-.9392.3128-1.0488.5449zm-.0391 8.461c.3944.5926.324 1.3306-.1563 1.6503-.4799.3197-1.188.0985-1.582-.4941-.3944-.5927-.324-1.3307.1563-1.6504.4727-.315 1.1812-.1086 1.582.4941zM7.207 13.5273c.4803.3197.5506 1.0577.1563 1.6504-.394.5926-1.1038.8138-1.584.4941-.48-.3197-.5503-1.0577-.1563-1.6504.4008-.6021 1.1087-.8106 1.584-.4941z' },
  Linux: { color: '#111827', path: 'M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139z' }
};

function OsIcon({ os, size = 15 }) {
  const b = OS_BRAND[os];
  if (!b) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={b.color} aria-hidden="true" style={{ flex: '0 0 auto' }}>
      <path d={b.path} />
    </svg>
  );
}

function GeoCell({ code }) {
  const c = code && code !== '—' && /^[A-Za-z]{2}$/.test(code) ? String(code).toUpperCase() : '';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      {c ? (
        <img
          src={`https://flagcdn.com/24x18/${c.toLowerCase()}.png`}
          srcSet={`https://flagcdn.com/48x36/${c.toLowerCase()}.png 2x`}
          width={20}
          height={15}
          alt={c}
          loading="lazy"
          style={{ borderRadius: 2, boxShadow: '0 0 0 1px rgba(0,0,0,0.08)', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <Globe size={15} style={{ color: '#9ca3af' }} />
      )}
      <span>{c || 'Неизвестно'}</span>
    </span>
  );
}

function DeviceCell({ type, os }) {
  const Ic = DEVICE_ICON[type] || HelpCircle;
  const hasBrand = !!OS_BRAND[os];
  const primary = os || DEVICE_LABELS[type] || type;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      {hasBrand ? <OsIcon os={os} size={16} /> : <Ic size={15} style={{ color: '#6366f1' }} />}
      <span style={{ fontWeight: 600 }}>{primary}</span>
      {os && <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>· {DEVICE_LABELS[type] || type}</span>}
    </span>
  );
}

const toYmd = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

const RANGE_PRESETS = [
  { id: 'today', label: 'Сегодня' },
  { id: 'yesterday', label: 'Вчера' },
  { id: '7d', label: 'Неделя' },
  { id: 'month', label: 'Текущий месяц' },
  { id: 'custom', label: 'Свой период' }
];

function computeRange(preset, cFrom, cTo) {
  const now = new Date();
  if (preset === 'today') return { from: toYmd(now), to: toYmd(now) };
  if (preset === 'yesterday') {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    return { from: toYmd(y), to: toYmd(y) };
  }
  if (preset === '7d') {
    const f = new Date(now); f.setDate(f.getDate() - 6);
    return { from: toYmd(f), to: toYmd(now) };
  }
  if (preset === 'month') {
    return { from: toYmd(new Date(now.getFullYear(), now.getMonth(), 1)), to: toYmd(now) };
  }
  if (preset === 'custom') return { from: cFrom || '', to: cTo || '' };
  return { from: '', to: '' };
}

function useDateRange(defaultPreset = 'month') {
  const [preset, setPreset] = useState(defaultPreset);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const range = useMemo(() => computeRange(preset, customFrom, customTo), [preset, customFrom, customTo]);
  return { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, range };
}

const card = {
  background: 'white', border: '1px solid #e5e7eb', borderRadius: '14px',
  padding: '1.25rem', boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
};
const inputStyle = {
  padding: '0.6rem 0.8rem', fontSize: '0.875rem', border: '1px solid #d1d5db',
  borderRadius: '9px', width: '100%', background: 'white', color: '#111', outline: 'none'
};
const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem',
  background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '9px',
  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
};
const btnGhost = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
  padding: '0.4rem 0.6rem', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb',
  borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer'
};
const th = { textAlign: 'left', padding: '0.6rem 0.75rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6b7280', fontWeight: 700, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' };
const td = { padding: '0.65rem 0.75rem', fontSize: '0.85rem', color: '#111', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' };

function CopyBtn({ value, title = 'Скопировать' }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={() => {
        navigator.clipboard?.writeText(value).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        });
      }}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: done ? '#16a34a' : '#9ca3af', padding: '2px', display: 'inline-flex' }}
    >
      {done ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

function SubTab({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.6rem 1.1rem', cursor: 'pointer',
        background: active ? 'var(--primary)' : 'white',
        color: active ? 'white' : '#374151',
        border: `1px solid ${active ? 'var(--primary)' : '#e5e7eb'}`,
        borderRadius: '10px', fontSize: '0.875rem', fontWeight: 600
      }}
    >
      <Icon size={16} /> {label}
    </button>
  );
}

function TotalsCards({ totals }) {
  const cr = totals.clicks ? (totals.registrations / totals.clicks) * 100 : 0;
  const items = [
    { icon: MousePointerClick, label: 'Клики', value: fmtInt(totals.clicks), color: '#0ea5e9' },
    { icon: Fingerprint, label: 'Уник. клики', value: fmtInt(totals.uniqueVisitors), color: '#6366f1' },
    { icon: UserPlus, label: 'Регистрации', value: fmtInt(totals.registrations), color: '#8b5cf6' },
    { icon: Percent, label: 'CR (рег.)', value: fmtPct(cr), color: '#ec4899' },
    { icon: ShoppingBag, label: 'Покупки', value: fmtInt(totals.purchases), color: '#10b981' },
    { icon: DollarSign, label: 'Выручка', value: fmtMoney(totals.revenue), color: '#16a34a', green: true }
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
      {items.map((it) => (
        <div key={it.label} style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>{it.label}</span>
            <span style={{ color: it.color }}><it.icon size={16} /></span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: it.green ? '#16a34a' : '#111' }}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}

function ConvRow({ totals }) {
  const ctr = totals.clicks ? (totals.registrations / totals.clicks) * 100 : 0;
  const cr = totals.registrations ? (totals.purchases / totals.registrations) * 100 : 0;
  return (
    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.82rem', color: '#374151' }}>
      <span>Клик→Рег: <b>{ctr.toFixed(1)}%</b></span>
      <span>Рег→Покупка: <b>{cr.toFixed(1)}%</b></span>
      <span>ARPU: <b>{fmtMoney(totals.registrations ? totals.revenue / totals.registrations : 0)}</b></span>
    </div>
  );
}

function TimeseriesChart({ data }) {
  if (!data || data.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>Нет данных за период</div>;
  }
  return (
    <div style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="tgC" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="tgR" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="tgP" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
          <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="clicks" name="Клики" stroke="#0ea5e9" fill="url(#tgC)" />
          <Area type="monotone" dataKey="registrations" name="Регистрации" stroke="#8b5cf6" fill="url(#tgR)" />
          <Area type="monotone" dataKey="purchases" name="Покупки" stroke="#10b981" fill="url(#tgP)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function BreakdownTable({ title, icon: Icon, rows, kind }) {
  return (
    <div style={card}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: '#111' }}>
        <Icon size={16} /> {title}
      </h3>
      {(!rows || rows.length === 0) ? (
        <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.82rem' }}>Нет данных</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>{kind === 'geo' ? 'Гео' : 'Устройство / ОС'}</th>
                <th style={{ ...th, textAlign: 'right' }}>Клики</th>
                <th style={{ ...th, textAlign: 'right' }}>Рег.</th>
                <th style={{ ...th, textAlign: 'right' }}>Покупки</th>
                <th style={{ ...th, textAlign: 'right' }}>Выручка</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={td}>
                    {kind === 'geo'
                      ? <GeoCell code={r.geo} />
                      : <DeviceCell type={r.device} os={r.os} />}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtInt(r.clicks)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtInt(r.registrations)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtInt(r.purchases)}</td>
                  <td style={{ ...td, textAlign: 'right', ...moneyGreen }}>{fmtMoney(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RangePicker({ ctx }) {
  const { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo } = ctx;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: '0.3rem', background: '#f3f4f6', padding: '0.25rem', borderRadius: '10px', flexWrap: 'wrap' }}>
        {RANGE_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPreset(p.id)}
            style={{
              padding: '0.4rem 0.75rem', border: 'none', cursor: 'pointer', borderRadius: '8px',
              fontSize: '0.8rem', fontWeight: 600,
              background: preset === p.id ? 'white' : 'transparent',
              color: preset === p.id ? 'var(--primary)' : '#6b7280',
              boxShadow: preset === p.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset === 'custom' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
          <span style={{ color: '#9ca3af' }}>—</span>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
        </div>
      )}
    </div>
  );
}

const FILTER_DEFS = [
  { key: 'utm_source', label: 'utm_source', path: 'source' },
  { key: 'utm_medium', label: 'utm_medium', path: 'medium' },
  { key: 'utm_campaign', label: 'utm_campaign', path: 'campaign' }
];

const emptyFilters = () => ({ utm_source: '', utm_medium: '', utm_campaign: '', subKey: '', subValue: '' });

function LinkFilters({ value, onChange }) {
  const [links, setLinks] = useState([]);
  useEffect(() => {
    trackingApi.listLinks().then((d) => setLinks(d.links || [])).catch(() => {});
  }, []);

  const opts = useMemo(() => {
    const utm = { source: new Set(), medium: new Set(), campaign: new Set() };
    const subKeys = new Set();
    const subValsByKey = {};
    for (const l of links) {
      ['source', 'medium', 'campaign'].forEach((p) => { if (l.utm?.[p]) utm[p].add(l.utm[p]); });
      for (const s of l.subs || []) {
        if (s.key) {
          subKeys.add(s.key);
          (subValsByKey[s.key] = subValsByKey[s.key] || new Set()).add(s.value);
        }
      }
    }
    return { utm, subKeys, subValsByKey };
  }, [links]);

  const set = (k, v) => onChange({ ...value, [k]: v });
  const subValues = value.subKey ? [...(opts.subValsByKey[value.subKey] || [])] : [];
  const active = Object.values(value).some(Boolean);

  const selStyle = { ...inputStyle, width: 'auto', minWidth: 130, padding: '0.45rem 0.6rem', fontSize: '0.8rem' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: '#6b7280', fontWeight: 600 }}>
        <Filter size={14} /> Фильтры
      </span>
      {FILTER_DEFS.map((f) => (
        <select key={f.key} value={value[f.key]} onChange={(e) => set(f.key, e.target.value)} style={selStyle}>
          <option value="">{f.label}: все</option>
          {[...opts.utm[f.path]].map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      ))}
      <select
        value={value.subKey}
        onChange={(e) => onChange({ ...value, subKey: e.target.value, subValue: '' })}
        style={selStyle}
      >
        <option value="">sub: все</option>
        {[...opts.subKeys].map((k) => <option key={k} value={k}>{k}</option>)}
      </select>
      {value.subKey && (
        <select value={value.subValue} onChange={(e) => set('subValue', e.target.value)} style={selStyle}>
          <option value="">{value.subKey}: любое</option>
          {subValues.map((v) => <option key={v} value={v}>{v || '(пусто)'}</option>)}
        </select>
      )}
      {active && (
        <button onClick={() => onChange(emptyFilters())} style={{ ...btnGhost, color: '#ef4444' }} title="Сбросить">
          <X size={13} /> Сброс
        </button>
      )}
    </div>
  );
}

const emptyForm = () => ({
  name: '', targetPath: '/',
  utm: { source: '', medium: '', campaign: '', term: '', content: '' },
  subs: [], isActive: true
});

function LinkModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(() => initial ? {
    name: initial.name || '',
    targetPath: initial.targetPath || '/',
    utm: { source: '', medium: '', campaign: '', term: '', content: '', ...(initial.utm || {}) },
    subs: (initial.subs || []).map((s) => ({ key: s.key, value: s.value })),
    isActive: initial.isActive !== false
  } : emptyForm());
  const [saving, setSaving] = useState(false);
  const editing = !!initial;

  const setUtm = (k, v) => setForm((p) => ({ ...p, utm: { ...p.utm, [k]: v } }));
  const addSub = () => setForm((p) => ({ ...p, subs: [...p.subs, { key: '', value: '' }] }));
  const setSub = (i, k, v) => setForm((p) => ({ ...p, subs: p.subs.map((s, idx) => idx === i ? { ...s, [k]: v } : s) }));
  const removeSub = (i) => setForm((p) => ({ ...p, subs: p.subs.filter((_, idx) => idx !== i) }));

  const save = async () => {
    if (!form.name.trim()) { toast.error('Введите название'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        targetPath: form.targetPath.trim() || '/',
        utm: form.utm,
        subs: form.subs.filter((s) => s.key.trim()),
        isActive: form.isActive
      };
      if (editing) {
        await trackingApi.updateLink(initial._id, payload);
        toast.success('Ссылка обновлена');
      } else {
        await trackingApi.createLink(payload);
        toast.success('Ссылка создана');
      }
      onSaved();
    } catch (e) {
      toast.error(e.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const utmFields = [
    ['source', 'utm_source'], ['medium', 'utm_medium'], ['campaign', 'utm_campaign'],
    ['term', 'utm_term'], ['content', 'utm_content']
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem', overflowY: 'auto' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'white', borderRadius: '16px', width: '560px', maxWidth: '100%', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111' }}>{editing ? 'Редактировать ссылку' : 'Новая умная ссылка'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Название *</label>
            <input style={inputStyle} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Напр. Telegram-канал, ноябрь" />
          </div>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.3rem' }}>Целевой путь</label>
            <input style={inputStyle} value={form.targetPath} onChange={(e) => setForm((p) => ({ ...p, targetPath: e.target.value }))} placeholder="/services/google-ads" />
          </div>

          {editing && (
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '9px', padding: '0.6rem 0.8rem', fontSize: '0.8rem', color: '#374151' }}>
              Базовый UTM-ID (utm_id): <b>{initial.code}</b>
            </div>
          )}

          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.5rem' }}>UTM-метки</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              {utmFields.map(([key, ph]) => (
                <input key={key} style={inputStyle} value={form.utm[key]} onChange={(e) => setUtm(key, e.target.value)} placeholder={ph} />
              ))}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>Доп. параметры (sub)</span>
              <button onClick={addSub} style={{ ...btnGhost, padding: '0.3rem 0.55rem' }}><Plus size={14} /> Добавить</button>
            </div>
            {form.subs.length === 0 && <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Нет дополнительных параметров</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {form.subs.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input style={{ ...inputStyle, flex: 1 }} value={s.key} onChange={(e) => setSub(i, 'key', e.target.value)} placeholder="ключ (напр. sub1)" />
                  <input style={{ ...inputStyle, flex: 1 }} value={s.value} onChange={(e) => setSub(i, 'value', e.target.value)} placeholder="значение" />
                  <button onClick={() => removeSub(i)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer' }}><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          </div>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#374151', cursor: 'pointer', width: 'fit-content' }}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              style={{ width: '16px', height: '16px', flex: '0 0 auto', margin: 0, cursor: 'pointer' }}
            />
            Активна
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.5rem' }}>
          <button onClick={onClose} style={btnGhost}>Отмена</button>
          <button onClick={save} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>{saving ? 'Сохранение…' : 'Сохранить'}</button>
        </div>
      </div>
    </div>
  );
}

function LinksView({ onOpenStats }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // {mode:'create'|'edit', link}
  const [filters, setFilters] = useState(emptyFilters());
  const range = useDateRange('month');
  const { from, to } = range.range;

  const load = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const params = { ...filters };
      if (q) params.search = q;
      if (from) params.from = from;
      if (to) params.to = to;
      const data = await trackingApi.listLinks(params);
      setLinks(data.links || []);
    } catch (e) {
      toast.error(e.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [from, to, filters]);

  useEffect(() => { load(search); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleActive = async (link) => {
    try {
      await trackingApi.updateLink(link._id, { isActive: !link.isActive });
      setLinks((prev) => prev.map((l) => l._id === link._id ? { ...l, isActive: !l.isActive } : l));
    } catch (e) {
      toast.error(e.message || 'Ошибка');
    }
  };

  const remove = async (link) => {
    if (!window.confirm(`Удалить ссылку «${link.name}» и всю её статистику?`)) return;
    try {
      await trackingApi.deleteLink(link._id);
      setLinks((prev) => prev.filter((l) => l._id !== link._id));
      toast.success('Удалено');
    } catch (e) {
      toast.error(e.message || 'Ошибка');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <RangePicker ctx={range} />
        <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Показатели за выбранный период</span>
      </div>
      <div style={{ ...card }}>
        <LinkFilters value={filters} onChange={setFilters} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <form onSubmit={(e) => { e.preventDefault(); load(search); }} style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 360 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input style={{ ...inputStyle, paddingLeft: '2.2rem' }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по названию или коду" />
        </form>
        <button style={btnPrimary} onClick={() => setModal({ mode: 'create' })}><Plus size={16} /> Создать ссылку</button>
      </div>

      <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Загрузка…</div>
        ) : links.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#9ca3af' }}>Ссылок пока нет. Создайте первую умную ссылку.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1040 }}>
            <thead>
              <tr>
                <th style={th}>Название</th>
                <th style={th}>UTM-ID</th>
                <th style={th}>Ссылка</th>
                <th style={{ ...th, textAlign: 'right' }}>Клики</th>
                <th style={{ ...th, textAlign: 'right' }}>Уник.</th>
                <th style={{ ...th, textAlign: 'right' }}>Рег.</th>
                <th style={{ ...th, textAlign: 'right' }}>CR</th>
                <th style={{ ...th, textAlign: 'right' }}>Покупки</th>
                <th style={{ ...th, textAlign: 'right' }}>Выручка</th>
                <th style={{ ...th, textAlign: 'center' }}>Активна</th>
                <th style={{ ...th, textAlign: 'right' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr key={l._id}>
                  <td style={{ ...td, fontWeight: 600 }}>{l.name}</td>
                  <td style={td}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <code style={{ fontSize: '0.78rem', background: '#f3f4f6', padding: '2px 6px', borderRadius: 5 }}>{l.code}</code>
                      <CopyBtn value={l.code} />
                    </span>
                  </td>
                  <td style={{ ...td, maxWidth: 260 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: '100%' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem', color: '#2563eb' }} title={l.url}>{l.url}</span>
                      <CopyBtn value={l.url} title="Скопировать ссылку" />
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtInt(l.stats?.clicks)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtInt(l.stats?.uniqueClicks)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtInt(l.stats?.registrations)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtPct(crOf(l.stats))}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtInt(l.stats?.purchases)}</td>
                  <td style={{ ...td, textAlign: 'right', ...moneyGreen }}>{fmtMoney(l.stats?.revenue)}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <button onClick={() => toggleActive(l)} title="Переключить"
                      style={{
                        width: 38, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', position: 'relative',
                        background: l.isActive ? '#16a34a' : '#d1d5db', transition: 'background 0.2s'
                      }}>
                      <span style={{ position: 'absolute', top: 2, left: l.isActive ? 18 : 2, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
                    </button>
                  </td>
                  <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button style={{ ...btnGhost, marginRight: 6 }} onClick={() => onOpenStats(l._id)} title="Статистика"><BarChart3 size={14} /></button>
                    <button style={{ ...btnGhost, marginRight: 6 }} onClick={() => setModal({ mode: 'edit', link: l })} title="Редактировать"><Pencil size={14} /></button>
                    <button style={{ ...btnGhost, color: '#ef4444', background: '#fee2e2', borderColor: '#fecaca' }} onClick={() => remove(l)} title="Удалить"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <LinkModal
          initial={modal.mode === 'edit' ? modal.link : null}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(search); }}
        />
      )}
    </div>
  );
}

function StatsView({ selectedId, onSelect }) {
  const [links, setLinks] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const range = useDateRange('month');
  const { from, to } = range.range;

  useEffect(() => {
    trackingApi.listLinks().then((d) => setLinks(d.links || [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!selectedId) { setData(null); return; }
    setLoading(true);
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const json = await trackingApi.linkStats(selectedId, params);
      setData(json);
    } catch (e) {
      toast.error(e.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  }, [selectedId, from, to]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ ...card, display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <select value={selectedId || ''} onChange={(e) => onSelect(e.target.value || null)} style={{ ...inputStyle, width: 'auto', minWidth: 240 }}>
          <option value="">— Выберите ссылку —</option>
          {links.map((l) => <option key={l._id} value={l._id}>{l.name} ({l.code})</option>)}
        </select>
        <RangePicker ctx={range} />
      </div>

      {!selectedId ? (
        <div style={{ ...card, textAlign: 'center', color: '#9ca3af', padding: '2.5rem' }}>Выберите ссылку, чтобы увидеть статистику</div>
      ) : loading ? (
        <div style={{ ...card, textAlign: 'center', color: '#9ca3af', padding: '2.5rem' }}>Загрузка…</div>
      ) : data ? (
        <>
          <div style={{ ...card, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111' }}>{data.link?.name}</div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <span style={{ fontSize: '0.78rem', color: '#2563eb' }}>{data.link?.url}</span>
                <CopyBtn value={data.link?.url} />
              </span>
            </div>
            <ConvRow totals={data.totals} />
          </div>
          <TotalsCards totals={data.totals} />
          <div style={card}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: '#111' }}>Динамика</h3>
            <TimeseriesChart data={data.timeseries} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            <BreakdownTable title="По гео" icon={Globe} rows={data.byGeo} kind="geo" />
            <BreakdownTable title="По устройствам" icon={Monitor} rows={data.byDevice} kind="device" />
          </div>
        </>
      ) : null}
    </div>
  );
}

function DashboardView({ onOpenStats }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(emptyFilters());
  const range = useDateRange('month');
  const { from, to } = range.range;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      if (from) params.from = from;
      if (to) params.to = to;
      const json = await trackingApi.dashboard(params);
      setData(json);
    } catch (e) {
      toast.error(e.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  }, [from, to, filters]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ fontSize: '0.85rem', color: '#374151' }}>Всего умных ссылок: <b>{fmtInt(data?.linkCount)}</b></div>
        <RangePicker ctx={range} />
      </div>
      <div style={{ ...card }}>
        <LinkFilters value={filters} onChange={setFilters} />
      </div>

      {loading ? (
        <div style={{ ...card, textAlign: 'center', color: '#9ca3af', padding: '2.5rem' }}>Загрузка…</div>
      ) : data ? (
        <>
          <TotalsCards totals={data.totals} />
          <div style={{ ...card }}>
            <ConvRow totals={data.totals} />
          </div>
          <div style={card}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: '#111' }}>Динамика по всем ссылкам</h3>
            <TimeseriesChart data={data.timeseries} />
          </div>

          <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, padding: '1rem 1.25rem 0', color: '#111' }}>Топ ссылок</h3>
            {(!data.topLinks || data.topLinks.length === 0) ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#9ca3af' }}>Нет данных</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780, marginTop: '0.75rem' }}>
                <thead>
                  <tr>
                    <th style={th}>Название</th>
                    <th style={th}>UTM-ID</th>
                    <th style={{ ...th, textAlign: 'right' }}>Клики</th>
                    <th style={{ ...th, textAlign: 'right' }}>Рег.</th>
                    <th style={{ ...th, textAlign: 'right' }}>CR</th>
                    <th style={{ ...th, textAlign: 'right' }}>Покупки</th>
                    <th style={{ ...th, textAlign: 'right' }}>Выручка</th>
                    <th style={{ ...th, textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {data.topLinks.map((l) => (
                    <tr key={l.linkId}>
                      <td style={{ ...td, fontWeight: 600 }}>{l.name}</td>
                      <td style={td}><code style={{ fontSize: '0.78rem', background: '#f3f4f6', padding: '2px 6px', borderRadius: 5 }}>{l.code}</code></td>
                      <td style={{ ...td, textAlign: 'right' }}>{fmtInt(l.clicks)}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{fmtInt(l.registrations)}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{fmtPct(crOf(l))}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{fmtInt(l.purchases)}</td>
                      <td style={{ ...td, textAlign: 'right', ...moneyGreen }}>{fmtMoney(l.revenue)}</td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <button style={btnGhost} onClick={() => onOpenStats(l.linkId)} title="Статистика"><BarChart3 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            <BreakdownTable title="По гео" icon={Globe} rows={data.byGeo} kind="geo" />
            <BreakdownTable title="По устройствам" icon={Monitor} rows={data.byDevice} kind="device" />
          </div>
        </>
      ) : null}
    </div>
  );
}

const Tracking = () => {
  const [view, setView] = useState('links');
  const [statsLinkId, setStatsLinkId] = useState(null);

  const openStats = (id) => { setStatsLinkId(id); setView('stats'); };

  const tabs = useMemo(() => ([
    { id: 'links', label: 'Ссылки', icon: Link2 },
    { id: 'stats', label: 'Статистика', icon: BarChart3 },
    { id: 'dashboard', label: 'Дашборд', icon: LayoutDashboard }
  ]), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111', marginBottom: '0.25rem' }}>Tracking</h1>
        <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>Умные ссылки с UTM, статистика и сводный дашборд по источникам трафика.</p>
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <SubTab key={t.id} active={view === t.id} onClick={() => setView(t.id)} icon={t.icon} label={t.label} />
        ))}
      </div>

      {view === 'links' && <LinksView onOpenStats={openStats} />}
      {view === 'stats' && <StatsView selectedId={statsLinkId} onSelect={setStatsLinkId} />}
      {view === 'dashboard' && <DashboardView onOpenStats={openStats} />}
    </div>
  );
};

export default Tracking;
