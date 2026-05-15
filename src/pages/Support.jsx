import { useEffect, useRef, useState, useMemo } from 'react';
import { Search, Send, Paperclip, CheckCheck, Check, Lock, RefreshCw, MessageSquare, UserPlus, Image as ImageIcon } from 'lucide-react';
import { useSupportStore } from '../stores/supportStore';
import { useSupportSocket, supportEmit } from '../hooks/useSupportSocket';
import supportApi from '../api/support';
import toast from 'react-hot-toast';
import styles from './Support.module.css';

const STATUS_LABELS = { '': 'Все', open: 'Открытые', pending: 'В работе', closed: 'Закрытые' };
const STATUS_CLASS = { open: styles.statusOpen, pending: styles.statusPending, closed: styles.statusClosed };

const URL_RE = /(https?:\/\/[^\s]+)/g;
const linkify = (text) => {
  if (!text) return null;
  const parts = text.split(URL_RE);
  return parts.map((p, i) => {
    URL_RE.lastIndex = 0;
    if (URL_RE.test(p)) return <a key={i} href={p} target="_blank" rel="noopener noreferrer">{p}</a>;
    return <span key={i}>{p}</span>;
  });
};

const fmtTime = (d) => { try { return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
const fmtDay = (d) => {
  try {
    const dt = new Date(d);
    const today = new Date();
    const yest = new Date(); yest.setDate(yest.getDate() - 1);
    if (dt.toDateString() === today.toDateString()) return 'Сегодня';
    if (dt.toDateString() === yest.toDateString()) return 'Вчера';
    return dt.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' });
  } catch { return ''; }
};
const fmtRowTime = (d) => {
  try {
    const dt = new Date(d);
    const today = new Date();
    if (dt.toDateString() === today.toDateString()) return fmtTime(dt);
    return dt.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  } catch { return ''; }
};

const initials = (name = '') => {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
};

function MessageBubble({ message, isMine, showSender }) {
  if (message.senderRole === 'system') {
    return <div className={styles.bubbleSystem}>{message.text}</div>;
  }
  const otherReadAt = isMine ? message.readByCustomerAt : null;
  return (
    <div className={`${styles.bubble} ${isMine ? styles.bubbleMine : styles.bubbleTheirs}`}>
      {!isMine && showSender && message.senderName && (
        <div className={styles.senderName}>{message.senderName}</div>
      )}
      {message.text && <div>{linkify(message.text)}</div>}
      {message.attachments?.length > 0 && (
        <div className={styles.attList}>
          {message.attachments.map((a, i) => a.kind === 'image' ? (
            <a key={i} href={a.url} target="_blank" rel="noopener noreferrer">
              <img src={a.url} alt={a.name} className={styles.attImg} />
            </a>
          ) : (
            <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className={styles.attFile}>
              📎 {a.name || 'file'}
            </a>
          ))}
        </div>
      )}
      <div className={`${styles.meta} ${isMine ? styles.metaMine : styles.metaTheirs}`}>
        <span>{fmtTime(message.createdAt)}</span>
        {isMine && (
          <span className={`${styles.checks} ${otherReadAt ? styles.checksRead : ''}`}>
            {otherReadAt ? <CheckCheck size={13} /> : <Check size={13} />}
          </span>
        )}
      </div>
    </div>
  );
}

const Support = () => {
  const tickets = useSupportStore((s) => s.tickets);
  const filters = useSupportStore((s) => s.filters);
  const pages = useSupportStore((s) => s.pages);
  const activeTicketId = useSupportStore((s) => s.activeTicketId);
  const messagesByTicket = useSupportStore((s) => s.messagesByTicket);
  const customerOnlineByTicket = useSupportStore((s) => s.customerOnlineByTicket);
  const customerTypingByTicket = useSupportStore((s) => s.customerTypingByTicket);
  const { setFilter, setActive, loadList, loadMessages, appendMessage, upsertTicket } = useSupportStore.getState();

  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);
  const typingTimerRef = useRef(null);

  useSupportSocket();

  useEffect(() => { loadList(); }, [filters.status, filters.q, filters.from, filters.to, filters.page]);

  const active = activeTicketId ? tickets.find((t) => String(t._id) === String(activeTicketId)) : null;
  const messages = active ? (messagesByTicket[active._id] || null) : null;

  useEffect(() => {
    if (!active) return;
    if (messages == null) loadMessages(active._id).catch(() => {});
    supportEmit('ticket:join', { ticketId: active._id });
    if (active.unreadByStaff > 0) supportApi.markRead(active._id).catch(() => {});
    return () => supportEmit('ticket:leave', { ticketId: active._id });
  }, [active?._id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages?.length, customerTypingByTicket[active?._id]]);

  const handleSend = async () => {
    if (!active || sending) return;
    const trimmed = text.trim();
    if (!trimmed && files.length === 0) return;
    setSending(true);
    try {
      const { message } = await supportApi.sendMessage(active._id, { text: trimmed, files });
      appendMessage(active._id, message);
      setText(''); setFiles([]);
    } catch (e) { toast.error(e.message || 'Send failed'); }
    setSending(false);
  };

  const handleClose = async () => {
    if (!active) return;
    try {
      const { ticket } = await supportApi.close(active._id);
      upsertTicket(ticket);
      toast.success('Тикет закрыт');
    } catch (e) { toast.error(e.message || 'Failed'); }
  };

  const handleReopen = async () => {
    if (!active) return;
    try {
      const { ticket } = await supportApi.reopen(active._id);
      upsertTicket(ticket);
      toast.success('Тикет переоткрыт');
    } catch (e) { toast.error(e.message || 'Failed'); }
  };

  const handleAssign = async () => {
    if (!active) return;
    try {
      const { ticket } = await supportApi.assign(active._id);
      upsertTicket(ticket);
      toast.success('Назначено');
    } catch (e) { toast.error(e.message || 'Failed'); }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (active) {
      supportEmit('ticket:typing', { ticketId: active._id, typing: true });
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => supportEmit('ticket:typing', { ticketId: active._id, typing: false }), 1500);
    }
  };

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files || []).filter(f => f.size <= 5 * 1024 * 1024).slice(0, 5 - files.length);
    setFiles((prev) => [...prev, ...picked]);
    e.target.value = '';
  };

  const groupedMessages = useMemo(() => {
    if (!messages) return [];
    const out = [];
    let lastDay = '';
    let lastSender = null;
    messages.forEach((m, i) => {
      const day = m.createdAt ? new Date(m.createdAt).toDateString() : '';
      if (day !== lastDay) {
        out.push({ type: 'sep', key: `sep-${i}`, date: m.createdAt });
        lastDay = day;
        lastSender = null;
      }
      const showSender = m.senderRole !== 'system' && m.senderRole !== lastSender;
      out.push({ type: 'msg', key: m._id || `m-${i}`, message: m, showSender });
      lastSender = m.senderRole;
    });
    return out;
  }, [messages]);

  return (
    <div className={styles.wrap}>
      <aside className={styles.aside}>
        <div className={styles.asideHead}>
          <div className={styles.asideTitle}>
            <strong>Поддержка</strong>
            <span className={styles.asideCount}>{tickets.length}</span>
          </div>
          <div className={styles.search}>
            <Search size={14} style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Поиск (username / email / uid)"
              value={filters.q}
              onChange={(e) => setFilter({ q: e.target.value })}
            />
          </div>
          <div className={styles.filters}>
            {['', 'open', 'pending', 'closed'].map((s) => (
              <button
                key={s || 'all'}
                onClick={() => setFilter({ status: s })}
                className={`${styles.filterBtn} ${filters.status === s ? styles.filterActive : ''}`}
              >{STATUS_LABELS[s]}</button>
            ))}
          </div>
          <div className={styles.dateRow}>
            <input type="date" value={filters.from} onChange={(e) => setFilter({ from: e.target.value })} className={styles.dateInput} />
            <input type="date" value={filters.to} onChange={(e) => setFilter({ to: e.target.value })} className={styles.dateInput} />
          </div>
        </div>
        <div className={styles.list}>
          {tickets.length === 0 && <div className={styles.empty}>Нет тикетов</div>}
          {tickets.map((tk) => {
            const cust = tk.customerId || {};
            const online = customerOnlineByTicket[tk._id];
            const isActive = String(active?._id) === String(tk._id);
            const name = cust.username || cust.email || 'Customer';
            return (
              <button
                key={tk._id}
                onClick={() => setActive(tk._id)}
                className={`${styles.row} ${isActive ? styles.rowActive : ''}`}
              >
                <div className={`${styles.avatar} ${online ? styles.avatarOnline : ''}`}>{initials(name)}</div>
                <div className={styles.rowBody}>
                  <div className={styles.rowHead}>
                    <span className={styles.rowName}>{name}</span>
                    <span className={styles.rowTime}>{fmtRowTime(tk.lastMessageAt)}</span>
                  </div>
                  <div className={styles.rowPreview}>
                    {tk.lastMessageBy === 'staff' ? '↩ ' : ''}{tk.lastMessagePreview || tk.subject}
                  </div>
                  <div className={styles.rowFoot}>
                    <span className={styles.rowMeta}>
                      <span>#{tk.uid?.slice(-6)}</span>
                      <span className={`${styles.statusPill} ${STATUS_CLASS[tk.status] || ''}`}>{tk.status}</span>
                    </span>
                    {tk.unreadByStaff > 0 && <span className={styles.badge}>{tk.unreadByStaff > 99 ? '99+' : tk.unreadByStaff}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {pages > 1 && (
          <div className={styles.pager}>
            <button
              className={styles.pagerBtn}
              onClick={() => setFilter({ page: Math.max(1, filters.page - 1) })}
              disabled={filters.page <= 1}
            >‹</button>
            {Array.from({ length: pages }, (_, i) => i + 1)
              .slice(Math.max(0, filters.page - 3), Math.max(0, filters.page - 3) + 5)
              .map((p) => (
                <button
                  key={p}
                  onClick={() => setFilter({ page: p })}
                  className={`${styles.pagerBtn} ${p === filters.page ? styles.pagerActive : ''}`}
                >{p}</button>
              ))}
            <button
              className={styles.pagerBtn}
              onClick={() => setFilter({ page: Math.min(pages, filters.page + 1) })}
              disabled={filters.page >= pages}
            >›</button>
          </div>
        )}
      </aside>

      <main className={styles.main}>
        {!active ? (
          <div className={styles.placeholder}>
            <MessageSquare size={48} />
            <span>Выберите тикет слева</span>
          </div>
        ) : (
          <>
            <div className={styles.mainHead}>
              <div className={styles.mainHeadLeft}>
                <div className={`${styles.mainAvatar} ${customerOnlineByTicket[active._id] ? styles.mainAvatarOnline : ''}`}>
                  {initials(active.customerId?.username || active.customerId?.email || 'C')}
                </div>
                <div className={styles.mainHeadInfo}>
                  <div className={styles.mainName}>
                    {active.customerId?.username || 'Customer'} · #{active.uid?.slice(-6)}
                  </div>
                  <div className={styles.mainSub}>
                    {active.customerId?.email && <span>{active.customerId.email}</span>}
                    <span className={`${styles.statusPill} ${STATUS_CLASS[active.status] || ''}`}>{active.status}</span>
                    {customerOnlineByTicket[active._id] && <span className={styles.online}>● онлайн</span>}
                    {active.assignedTo && <span>· {active.assignedTo.name || active.assignedTo.email}</span>}
                  </div>
                </div>
              </div>
              <div className={styles.mainActions}>
                {!active.assignedTo && (
                  <button onClick={handleAssign} className={styles.actionBtn}>
                    <UserPlus size={13} /> Взять
                  </button>
                )}
                {active.status === 'closed' ? (
                  <button onClick={handleReopen} className={`${styles.actionBtn} ${styles.actionPrimary}`}>
                    <RefreshCw size={13} /> Переоткрыть
                  </button>
                ) : (
                  <button onClick={handleClose} className={`${styles.actionBtn} ${styles.actionDanger}`}>
                    <Lock size={13} /> Закрыть
                  </button>
                )}
              </div>
            </div>

            <div ref={scrollRef} className={styles.messages}>
              {!messages && <div style={{ margin: 'auto', color: '#94a3b8' }}>Загрузка...</div>}
              {messages && messages.length === 0 && <div style={{ margin: 'auto', color: '#94a3b8' }}>Сообщений пока нет</div>}
              {groupedMessages.map((g) => g.type === 'sep' ? (
                <div key={g.key} className={styles.dateSep}>{fmtDay(g.date)}</div>
              ) : (
                <MessageBubble
                  key={g.key}
                  message={g.message}
                  isMine={g.message.senderRole === 'staff'}
                  showSender={g.showSender}
                />
              ))}
            </div>

            {customerTypingByTicket[active._id] && (
              <div className={styles.typing}>Клиент печатает...</div>
            )}

            {active.status === 'closed' ? (
              <div className={styles.closedNote}>
                Тикет закрыт. Нажмите «Переоткрыть» чтобы продолжить.
              </div>
            ) : (
              <>
                {files.length > 0 && (
                  <div className={styles.previewBar}>
                    {files.map((f, i) => (
                      <span key={i} className={styles.previewItem}>
                        {f.type.startsWith('image/') ? <ImageIcon size={12} /> : <Paperclip size={12} />}
                        {f.name.length > 22 ? f.name.slice(0, 22) + '…' : f.name}
                        <button type="button" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className={styles.previewRemove}>×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className={styles.composer}>
                  <div className={styles.composerWrap}>
                    <button onClick={() => fileInputRef.current?.click()} disabled={files.length >= 5} className={styles.iconBtn} title="Прикрепить">
                      <Paperclip size={18} />
                    </button>
                    <input ref={fileInputRef} type="file" multiple hidden accept="image/*,application/pdf,text/plain" onChange={handleFiles} />
                    <textarea
                      value={text}
                      onChange={handleTextChange}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder="Ответить клиенту..."
                      rows={1}
                      className={styles.composerTextarea}
                      maxLength={4000}
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={sending || (!text.trim() && files.length === 0)}
                    className={styles.sendBtn}
                    title="Отправить"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Support;
