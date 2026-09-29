import React, { useState, useEffect, useCallback } from 'react';
import { Bell, ExternalLink, Users, X, Mail, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { getSubscriptionsSummary, getSubscribersForProduct } from '../api/productSubscriptions';

const SITE_URL = (import.meta.env.VITE_API_URL || 'https://banana-traff-shop.com').replace(/\/api\/v3\/?$/, '');
const TYPE_LABELS = { GoogleAdsProduct: 'Google Ads', YoutubeProduct: 'YouTube' };
const TYPE_SLUG = { GoogleAdsProduct: 'google-ads', YoutubeProduct: 'youtube' };

const productLink = (productId, productType) =>
  `${SITE_URL}/services/${TYPE_SLUG[productType]}/product/${productId}`;

const localized = (field) => field?.ru || field?.en || '';

const fmtDate = (d) => d ? new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const ProductSubscriptions = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState(null); // { productId, productType, title }
  const [subscribers, setSubscribers] = useState([]);
  const [subLoading, setSubLoading] = useState(false);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSubscriptionsSummary();
      setItems(data.items || []);
    } catch (err) {
      toast.error(err.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const openDrillDown = async (item) => {
    setDrillDown(item);
    setSubLoading(true);
    try {
      const data = await getSubscribersForProduct(item.productId, item.productType);
      setSubscribers(data.subscribers || []);
    } catch (err) {
      toast.error(err.message || 'Ошибка загрузки подписчиков');
    } finally {
      setSubLoading(false);
    }
  };

  const totalSubscribers = items.reduce((s, i) => s + i.subscriberCount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: 'var(--text-main)' }}>Подписки на товары</h1>
        <p style={{ color: 'var(--text-dim)', marginTop: '0.25rem' }}>
          Клиенты, ожидающие пополнения/появления в наличии — уведомляются автоматически на сайте и в Telegram, когда количество товара увеличивается
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.8rem', fontWeight: '600' }}>
            <Bell size={16} /> Товаров с подписками
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '0.4rem' }}>{items.length}</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.8rem', fontWeight: '600' }}>
            <Users size={16} /> Всего подписок
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '0.4rem' }}>{totalSubscribers}</div>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Товар</th>
              <th style={{ width: '120px', padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Тип</th>
              <th style={{ width: '110px', padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>В наличии</th>
              <th style={{ width: '130px', padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Подписчиков</th>
              <th style={{ width: '170px', padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Последняя подписка</th>
              <th style={{ width: '160px', padding: '1rem 1.5rem', textAlign: 'right' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Загрузка...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Пока никто ни на что не подписался</td></tr>
            ) : items.map((item) => (
              <tr key={`${item.productType}:${item.productId}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-main)' }}>
                  {localized(item.product.title) || '—'}
                </td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <span style={{
                    display: 'inline-flex', padding: '0.25rem 0.7rem', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '700',
                    backgroundColor: item.productType === 'GoogleAdsProduct' ? '#eff6ff' : '#fef2f2',
                    color: item.productType === 'GoogleAdsProduct' ? '#2563eb' : '#dc2626'
                  }}>
                    {TYPE_LABELS[item.productType]}
                  </span>
                </td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <span style={{ fontWeight: '700', color: item.product.counts > 0 ? '#16a34a' : '#dc2626' }}>
                    {item.product.counts || 0}
                  </span>
                </td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: '700', color: 'var(--text-main)' }}>
                    <Bell size={14} style={{ color: '#f59e0b' }} />
                    {item.subscriberCount}
                  </span>
                </td>
                <td style={{ padding: '1rem 1.5rem', color: '#6b7280', fontSize: '0.85rem' }}>{fmtDate(item.lastSubscribedAt)}</td>
                <td style={{ padding: '1rem 1.5rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button onClick={() => openDrillDown(item)} title="Список подписчиков" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.75rem', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', marginRight: '0.5rem', fontSize: '0.8rem', fontWeight: '600' }}>
                    <Users size={14} /> Список
                  </button>
                  <a href={productLink(item.productId, item.productType)} target="_blank" rel="noreferrer" title="Открыть на сайте" style={{ display: 'inline-flex', padding: '0.5rem', backgroundColor: '#f3f4f6', color: '#374151', borderRadius: '8px' }}>
                    <ExternalLink size={16} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {drillDown && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem', overflowY: 'auto' }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setDrillDown(null); }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '620px', maxWidth: '100%', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main)' }}>
                  {localized(drillDown.product.title) || 'Товар'}
                </h2>
                <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                  {TYPE_LABELS[drillDown.productType]} · подписчиков: {drillDown.subscriberCount}
                </p>
              </div>
              <button onClick={() => setDrillDown(null)} style={{ padding: '0.5rem', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px' }}>
                <X size={18} />
              </button>
            </div>

            {subLoading ? (
              <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>Загрузка...</p>
            ) : subscribers.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>Нет подписчиков</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '55vh', overflowY: 'auto' }}>
                {subscribers.map((s) => (
                  <div key={s._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)' }}>{s.customer?.username || '—'}</div>
                      <div style={{ display: 'flex', gap: '0.9rem', marginTop: '0.2rem', fontSize: '0.78rem', color: '#6b7280' }}>
                        {s.customer?.email && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Mail size={12} /> {s.customer.email}</span>
                        )}
                        {s.customer?.telegramUsername && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Send size={12} /> @{s.customer.telegramUsername}</span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>{fmtDate(s.subscribedAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductSubscriptions;
