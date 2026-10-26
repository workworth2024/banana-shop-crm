import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Edit2, Trash2, Pin, Globe, EyeOff, Eye, Tag, Hash
} from 'lucide-react';
import { getBlogPosts, deleteBlogPost } from '../api/blog';
import { getBlogTags } from '../api/blogTags';
import { useAuthStore } from '../stores/authStore';
import BlogEditor from '../components/BlogEditor/BlogEditor';
import BlogTagManagerModal from '../components/BlogEditor/BlogTagManagerModal';
import { useConfirm } from '../components/ConfirmDialog';
import toast from 'react-hot-toast';

const STATUS_LABELS = { draft: 'Черновик', published: 'Опубликован', scheduled: 'Запланирован' };
const STATUS_COLORS = { draft: '#9ca3af', published: '#16a34a', scheduled: '#f59e0b' };
const REACTION_EMOJI = { like: '👍', love: '❤️', fire: '🔥', clap: '👏', wow: '😮' };

const Blog = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [tags, setTags] = useState([]);
  const [tagModalOpen, setTagModalOpen] = useState(false);

  // null = list view; otherwise { postId, lang } of the article being edited/created
  const [editorTarget, setEditorTarget] = useState(undefined);

  const { user } = useAuthStore();
  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const { confirm, ConfirmNode } = useConfirm();

  const fetchTags = useCallback(async () => {
    try {
      setTags(await getBlogTags());
    } catch (err) {
      console.error('Fetch blog tags error:', err);
    }
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: currentPage, limit: 20, search });
      if (langFilter) params.set('lang', langFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (tagFilter) params.set('tag', tagFilter);
      const res = await getBlogPosts(params);
      setPosts(res.data.items);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      toast.error(err.message || 'Ошибка загрузки постов');
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, langFilter, statusFilter, tagFilter]);

  useEffect(() => { fetchTags(); }, [fetchTags]);
  useEffect(() => { if (editorTarget === undefined) fetchPosts(); }, [fetchPosts, editorTarget]);

  const handleDelete = async (id) => {
    const ok = await confirm('Удалить этот пост безвозвратно?');
    if (!ok) return;
    try {
      await deleteBlogPost(id);
      fetchPosts();
      toast.success('Пост удалён');
    } catch (err) {
      toast.error(err.message || 'Ошибка удаления');
    }
  };

  if (editorTarget !== undefined) {
    return (
      <BlogEditor
        postId={editorTarget?.postId || null}
        initialLang={editorTarget?.lang || 'ru'}
        onClose={() => setEditorTarget(undefined)}
        onSaved={() => fetchPosts()}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {ConfirmNode}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '700', color: 'var(--text-main)' }}>Блог</h1>
          <p style={{ color: 'var(--text-dim)', marginTop: '0.25rem' }}>
            Статьи блога — публикуются отдельной записью на каждый язык (⚠️ доступен в паблике только по ссылке с <code>?param=testing</code>, пока тестируется)
          </p>
        </div>
        {canManage && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => setTagModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f3f4f6', color: '#374151' }}>
              <Tag size={18} />
              Управление тегами
            </button>
            <button onClick={() => setEditorTarget(null)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={20} />
              Новая статья
            </button>
          </div>
        )}
      </div>

      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input type="text" placeholder="Поиск по заголовку/slug..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} style={{ paddingLeft: '2.5rem' }} />
        </div>
        <select value={langFilter} onChange={(e) => { setLangFilter(e.target.value); setCurrentPage(1); }} style={{ width: 'auto', padding: '0.6rem 1rem' }}>
          <option value="">Все языки</option>
          <option value="ru">RU</option>
          <option value="en">EN</option>
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} style={{ width: 'auto', padding: '0.6rem 1rem' }}>
          <option value="">Все статусы</option>
          <option value="draft">Черновик</option>
          <option value="published">Опубликован</option>
          <option value="scheduled">Запланирован</option>
        </select>
        <select value={tagFilter} onChange={(e) => { setTagFilter(e.target.value); setCurrentPage(1); }} style={{ width: 'auto', padding: '0.6rem 1rem' }}>
          <option value="">Все теги</option>
          {tags.map((tg) => <option key={tg._id} value={tg._id}>{tg.name.ru || tg.name.en}</option>)}
        </select>
        <span style={{ fontSize: '0.8125rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>Всего: {total}</span>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1100px' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Заголовок</th>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Языки</th>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Теги</th>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Статус</th>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Публикация</th>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Просмотры</th>
              <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Реакции</th>
              <th style={{ width: '110px', padding: '1rem 1.5rem', textAlign: 'right' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Загрузка...</td></tr>
            ) : posts.length === 0 ? (
              <tr><td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>Постов пока нет</td></tr>
            ) : posts.map((p) => {
              const langsPresent = new Set([p.lang, ...(p.translations || []).map((t) => t.lang)]);
              const reactionEntries = Object.entries(p.reactions || {}).filter(([, v]) => v > 0);
              return (
                <tr key={p._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-main)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {p.pinned && <Pin size={13} color="#f59e0b" />}
                      {p.noindex && <EyeOff size={13} color="#9ca3af" title="noindex" />}
                      {p.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace', marginTop: '0.15rem' }}>{p.slug}</div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      {['ru', 'en'].map((lang) => (
                        <span
                          key={lang}
                          title={langsPresent.has(lang) ? `Есть версия на ${lang.toUpperCase()}` : `Нет перевода на ${lang.toUpperCase()}`}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.68rem', fontWeight: 700,
                            padding: '0.2rem 0.45rem', borderRadius: '6px',
                            backgroundColor: langsPresent.has(lang) ? '#dcfce7' : '#f3f4f6',
                            color: langsPresent.has(lang) ? '#166534' : '#9ca3af'
                          }}
                        >
                          <Globe size={11} /> {lang.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    {p.tag_ids?.length ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {p.tag_ids.map((tg) => (
                          <span key={tg._id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.55rem', borderRadius: '8px', backgroundColor: '#eab30810', color: '#b45309', border: '1px solid #eab30830', fontSize: '0.7rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                            <Hash size={10} />
                            {tg.name?.ru || tg.name?.en}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '700', backgroundColor: `${STATUS_COLORS[p.status]}18`, color: STATUS_COLORS[p.status] }}>
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.8125rem', color: '#6b7280' }}>
                    {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('ru-RU') : '—'}
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{p.readingMinutes} мин · {p.wordCount} слов</div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.8125rem', color: '#6b7280' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Eye size={13} /> {p.views || 0}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.8125rem', color: '#6b7280' }}>
                    {reactionEntries.length === 0 ? '—' : reactionEntries.map(([k, v]) => (
                      <span key={k} style={{ marginRight: '0.5rem', whiteSpace: 'nowrap' }}>{REACTION_EMOJI[k] || k} {v}</span>
                    ))}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    {canManage && (
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditorTarget({ postId: p._id, lang: p.lang })} style={{ padding: '0.5rem', backgroundColor: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => handleDelete(p._id)} style={{ padding: '0.5rem', backgroundColor: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map((pg) => (
            <button
              key={pg}
              onClick={() => setCurrentPage(pg)}
              style={{
                padding: '0.5rem 0.9rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                backgroundColor: pg === currentPage ? '#1f2937' : '#f3f4f6',
                color: pg === currentPage ? 'white' : '#374151', fontWeight: '600'
              }}
            >
              {pg}
            </button>
          ))}
        </div>
      )}

      {tagModalOpen && (
        <BlogTagManagerModal onClose={() => setTagModalOpen(false)} onChange={setTags} />
      )}
    </div>
  );
};

export default Blog;
