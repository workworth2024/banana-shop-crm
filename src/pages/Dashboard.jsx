import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import {
  Users, Wifi, Wallet, ArrowUpRight, ArrowDownRight, ShoppingCart, Briefcase, Clock, Ticket, TrendingUp, Loader2
} from 'lucide-react';
import dashboardApi from '../api/dashboard';
import { resolveMediaUrl } from '../utils/mediaUrl';
import styles from './Dashboard.module.css';

const PRESETS = [
  { id: 'today', label: 'Сегодня' },
  { id: 'yesterday', label: 'Вчера' },
  { id: '7d', label: '7 дней' },
  { id: 'month', label: 'Текущий месяц' },
  { id: 'prevMonth', label: 'Предыдущий месяц' },
  { id: 'custom', label: 'Свой период' }
];

const fmtMoney = (n) => `$${(Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const fmtInt = (n) => (Number(n) || 0).toLocaleString('ru-RU');

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

const computeRange = (preset, customFrom, customTo) => {
  const now = new Date();
  if (preset === 'today') return { from: startOfDay(now), to: endOfDay(now) };
  if (preset === 'yesterday') {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    return { from: startOfDay(y), to: endOfDay(y) };
  }
  if (preset === '7d') {
    const from = new Date(now); from.setDate(from.getDate() - 6);
    return { from: startOfDay(from), to: endOfDay(now) };
  }
  if (preset === 'month') {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
  }
  if (preset === 'prevMonth') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { from, to };
  }
  if (preset === 'custom' && customFrom && customTo) {
    return { from: startOfDay(new Date(customFrom)), to: endOfDay(new Date(customTo)) };
  }
  return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
};

const toInput = (d) => d.toISOString().slice(0, 10);

const calcDelta = (cur, prev) => {
  if (!prev) return cur ? 100 : 0;
  return ((cur - prev) / prev) * 100;
};

const Delta = ({ cur, prev }) => {
  const d = calcDelta(Number(cur) || 0, Number(prev) || 0);
  if (!Number.isFinite(d) || Math.abs(d) < 0.05) {
    return <span className={`${styles.kpiDelta} ${styles.deltaFlat}`}>— vs пред.</span>;
  }
  const up = d > 0;
  return (
    <span className={`${styles.kpiDelta} ${up ? styles.deltaUp : styles.deltaDown}`}>
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(d).toFixed(1)}% vs пред.
    </span>
  );
};

const KpiCard = ({ icon: Icon, label, value, delta, suffix, onClick }) => (
  <div
    className={styles.card}
    onClick={onClick}
    style={onClick ? { cursor: 'pointer' } : undefined}
    title={onClick ? 'Открыть подробнее' : undefined}
  >
    <div className={styles.kpiHead}>
      <span className={styles.kpiLabel}>{label}</span>
      <span className={styles.kpiIcon}><Icon size={16} /></span>
    </div>
    <div className={styles.kpiValue}>{value}{suffix || ''}</div>
    {delta}
  </div>
);

const fmtAxisTick = (iso, bucket) => {
  const d = new Date(iso);
  if (bucket === 'hour') return `${String(d.getHours()).padStart(2, '0')}:00`;
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b'];

const Dashboard = () => {
  const navigate = useNavigate();
  const [preset, setPreset] = useState('month');
  const [customFrom, setCustomFrom] = useState(toInput(new Date()));
  const [customTo, setCustomTo] = useState(toInput(new Date()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [tops, setTops] = useState({
    products: { items: [], hasMore: false, page: 1, loading: false },
    customers: { items: [], hasMore: false, page: 1, loading: false },
    services: { items: [], hasMore: false, page: 1, loading: false }
  });

  const range = useMemo(() => computeRange(preset, customFrom, customTo), [preset, customFrom, customTo]);

  const load = async (r) => {
    setLoading(true);
    try {
      const json = await dashboardApi.get({ from: r.from.toISOString(), to: r.to.toISOString() });
      setData(json);
      setTops({
        products: { items: json.topProducts?.items || [], hasMore: !!json.topProducts?.hasMore, page: 1, loading: false },
        customers: { items: json.topCustomers?.items || [], hasMore: !!json.topCustomers?.hasMore, page: 1, loading: false },
        services: { items: json.topServices?.items || [], hasMore: !!json.topServices?.hasMore, page: 1, loading: false }
      });
    } catch (e) {
      console.error('dashboard load', e);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreTop = async (kind) => {
    const cur = tops[kind];
    if (!cur || cur.loading || !cur.hasMore) return;
    setTops((prev) => ({ ...prev, [kind]: { ...prev[kind], loading: true } }));
    try {
      const nextPage = cur.page + 1;
      const res = await dashboardApi.top(kind, {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        page: nextPage
      });
      setTops((prev) => ({
        ...prev,
        [kind]: {
          items: [...prev[kind].items, ...(res.items || [])],
          hasMore: !!res.hasMore,
          page: nextPage,
          loading: false
        }
      }));
    } catch (e) {
      console.error('top load', e);
      setTops((prev) => ({ ...prev, [kind]: { ...prev[kind], loading: false } }));
    }
  };

  useEffect(() => {
    if (preset !== 'custom') load(range);
  }, [preset]);

  useEffect(() => {
    const id = setInterval(() => load(range), 60_000);
    return () => clearInterval(id);
  }, [range.from?.getTime(), range.to?.getTime()]);

  const handleApplyCustom = () => load(range);

  const goToProduct = (p) => {
    const tab = p.productType === 'GoogleAdsProduct' ? 'google-ads' : p.productType === 'YoutubeProduct' ? 'youtube' : '';
    const qs = new URLSearchParams();
    qs.set('search', p.uid || p.title || '');
    if (tab) qs.set('tab', tab);
    navigate(`/products?${qs.toString()}`);
  };
  const goToCustomer = (c) => navigate(`/clients?search=${encodeURIComponent(c.uid || c.username || '')}`);
  const goToService = (s) => navigate(`/services?search=${encodeURIComponent(s.uid || s.title || '')}`);

  const revenueData = data?.revenueSeries?.points || [];
  const usersData = data?.usersSeries || [];
  const bucket = data?.range?.bucket || 'day';
  const split = data?.revenueSplit || { orders: 0, services: 0, preorders: 0 };
  const splitData = [
    { name: 'Товары', value: split.orders },
    { name: 'Услуги', value: split.services },
    { name: 'Предзаказы', value: split.preorders }
  ].filter((s) => s.value > 0);

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <h1 className={styles.title}>Главная</h1>
        <div className={styles.filter}>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              className={`${styles.pill} ${preset === p.id ? styles.pillActive : ''}`}
              onClick={() => setPreset(p.id)}
            >{p.label}</button>
          ))}
          {preset === 'custom' && (
            <>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className={styles.dateInput} />
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className={styles.dateInput} />
              <button className={styles.apply} onClick={handleApplyCustom}>Применить</button>
            </>
          )}
        </div>
      </div>

      {loading && !data && <div className={styles.loading}>Загрузка статистики...</div>}

      {data && (
        <>
          <div className={styles.kpiGrid}>
            <KpiCard icon={Users} label="Новых пользователей" value={fmtInt(data.kpi.newUsers.value)}
              delta={<Delta cur={data.kpi.newUsers.value} prev={data.kpi.newUsers.prev} />}
              onClick={() => navigate('/clients')} />
            <KpiCard icon={Wifi} label="Сейчас онлайн"
              value={<><span className={styles.dot} />{fmtInt(data.kpi.online.value)}</>} delta={null}
              onClick={() => navigate('/clients')} />
            <KpiCard icon={Wallet} label="Пополнили баланс"
              value={fmtInt(data.kpi.depositors.value)}
              delta={<Delta cur={data.kpi.depositors.value} prev={data.kpi.depositors.prev} />}
              onClick={() => navigate('/transactions')} />
            <KpiCard icon={TrendingUp} label="Сумма пополнений"
              value={fmtMoney(data.kpi.depositSum.value)}
              delta={<Delta cur={data.kpi.depositSum.value} prev={data.kpi.depositSum.prev} />}
              onClick={() => navigate('/transactions')} />

            <KpiCard icon={ShoppingCart} label={`Заказы: ${fmtInt(data.kpi.orders.count)}`}
              value={fmtMoney(data.kpi.orders.sum)}
              delta={<Delta cur={data.kpi.orders.sum} prev={data.kpi.orders.prevSum} />}
              onClick={() => navigate('/orders')} />
            <KpiCard icon={Briefcase} label={`Услуги: ${fmtInt(data.kpi.services.count)}`}
              value={fmtMoney(data.kpi.services.sum)}
              delta={<Delta cur={data.kpi.services.sum} prev={data.kpi.services.prevSum} />}
              onClick={() => navigate('/orders/services')} />
            <KpiCard icon={Clock} label={`Предзаказы: ${fmtInt(data.kpi.preorders.count)}`}
              value={fmtMoney(data.kpi.preorders.sum)}
              delta={<Delta cur={data.kpi.preorders.sum} prev={data.kpi.preorders.prevSum} />}
              onClick={() => navigate('/preorders')} />
            <KpiCard icon={Ticket} label="Открытые тикеты"
              value={fmtInt(data.kpi.openTickets.value)} delta={null}
              onClick={() => navigate('/support')} />
          </div>

          <div className={styles.chartGrid}>
            <div className={styles.card}>
              <h3 className={styles.chartTitle}>Выручка по {bucket === 'hour' ? 'часам' : bucket === 'week' ? 'неделям' : 'дням'}</h3>
              <div className={styles.chartBox}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="gOrd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gSrv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gPre" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="t" tickFormatter={(v) => fmtAxisTick(v, bucket)} stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(v) => fmtMoney(v)} labelFormatter={(v) => new Date(v).toLocaleString('ru-RU')} />
                    <Legend />
                    <Area type="monotone" dataKey="orders" name="Товары" stroke="#0ea5e9" fill="url(#gOrd)" />
                    <Area type="monotone" dataKey="services" name="Услуги" stroke="#10b981" fill="url(#gSrv)" />
                    <Area type="monotone" dataKey="preorders" name="Предзаказы" stroke="#f59e0b" fill="url(#gPre)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={styles.card}>
              <h3 className={styles.chartTitle}>Структура выручки</h3>
              <div className={styles.chartBox}>
                {splitData.length === 0 ? (
                  <div className={styles.empty}>Нет данных за период</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={splitData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                        {splitData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => fmtMoney(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.chartTitle}>Регистрации и пополнения</h3>
            <div className={styles.chartBox}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={usersData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="t" tickFormatter={(v) => fmtAxisTick(v, bucket)} stroke="#94a3b8" fontSize={11} />
                  <YAxis yAxisId="L" stroke="#6366f1" fontSize={11} />
                  <YAxis yAxisId="R" orientation="right" stroke="#10b981" fontSize={11} tickFormatter={(v) => `$${v}`} />
                  <Tooltip labelFormatter={(v) => new Date(v).toLocaleString('ru-RU')} />
                  <Legend />
                  <Line yAxisId="L" type="monotone" dataKey="newUsers" name="Новые юзеры" stroke="#6366f1" strokeWidth={2} dot={false} />
                  <Line yAxisId="R" type="monotone" dataKey="deposits" name="Пополнения, $" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={styles.topsGrid}>
            <div className={styles.card}>
              <h3 className={styles.chartTitle}>Топ-товары</h3>
              {tops.products.items.length === 0 ? <div className={styles.empty}>Нет продаж</div> :
                tops.products.items.map((p) => (
                  <div
                    key={p.id}
                    className={`${styles.topRow} ${styles.topRowClickable}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => goToProduct(p)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToProduct(p); } }}
                  >
                    {p.image ? <img src={resolveMediaUrl(p.image)} className={styles.topThumb} alt="" /> : <div className={styles.topThumb} />}
                    <div className={styles.topName}>{p.title}</div>
                    <div className={styles.topMeta}>
                      <div className={styles.topRevenue}>{fmtMoney(p.revenue)}</div>
                      <div>×{p.qty}</div>
                    </div>
                  </div>
                ))
              }
              {tops.products.hasMore && (
                <button className={styles.loadMore} onClick={() => loadMoreTop('products')} disabled={tops.products.loading}>
                  {tops.products.loading ? <Loader2 size={14} className={styles.spin} /> : null}
                  Показать ещё
                </button>
              )}
            </div>

            <div className={styles.card}>
              <h3 className={styles.chartTitle}>Топ-клиенты</h3>
              {tops.customers.items.length === 0 ? <div className={styles.empty}>Нет покупок</div> :
                tops.customers.items.map((c) => (
                  <div
                    key={c.id}
                    className={`${styles.topRow} ${styles.topRowClickable}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => goToCustomer(c)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToCustomer(c); } }}
                  >
                    <div className={styles.topThumb} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#475569' }}>
                      {(c.username || '?').slice(0, 2).toUpperCase()}
                    </div>
                    <div className={styles.topName}>
                      {c.username}
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{c.uid}</div>
                    </div>
                    <div className={styles.topMeta}>
                      <div className={styles.topRevenue}>{fmtMoney(c.spent)}</div>
                      <div>{c.orders} зак.</div>
                    </div>
                  </div>
                ))
              }
              {tops.customers.hasMore && (
                <button className={styles.loadMore} onClick={() => loadMoreTop('customers')} disabled={tops.customers.loading}>
                  {tops.customers.loading ? <Loader2 size={14} className={styles.spin} /> : null}
                  Показать ещё
                </button>
              )}
            </div>

            <div className={styles.card}>
              <h3 className={styles.chartTitle}>Топ-услуги</h3>
              {tops.services.items.length === 0 ? <div className={styles.empty}>Нет заказов услуг</div> :
                tops.services.items.map((s) => (
                  <div
                    key={s.id}
                    className={`${styles.topRow} ${styles.topRowClickable}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => goToService(s)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToService(s); } }}
                  >
                    {s.image ? <img src={resolveMediaUrl(s.image)} className={styles.topThumb} alt="" /> : <div className={styles.topThumb} />}
                    <div className={styles.topName}>{s.title}</div>
                    <div className={styles.topMeta}>
                      <div className={styles.topRevenue}>{fmtMoney(s.revenue)}</div>
                      <div>×{s.qty}</div>
                    </div>
                  </div>
                ))
              }
              {tops.services.hasMore && (
                <button className={styles.loadMore} onClick={() => loadMoreTop('services')} disabled={tops.services.loading}>
                  {tops.services.loading ? <Loader2 size={14} className={styles.spin} /> : null}
                  Показать ещё
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
