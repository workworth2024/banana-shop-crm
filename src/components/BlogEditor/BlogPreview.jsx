import { useState } from 'react'
import { resolveMediaUrl } from '../../utils/mediaUrl'

// Approximates how the article will actually render on the public site
// (banana-shop-front's Blog.css) — card view for the list, full view for the article page.
function BlogPreview({ title, excerpt, cover, coverFile, tags, authorName, html, readingMinutes, wordCount, lang }) {
  const [tab, setTab] = useState('article')
  const coverUrl = coverFile ? URL.createObjectURL(coverFile) : (cover ? resolveMediaUrl(cover) : null)
  const author = authorName || 'Banana Traff Shop'
  const list = tags || []

  return (
    <div className="blog-preview">
      <div className="blog-preview-tabs">
        <button type="button" className={tab === 'card' ? 'active' : ''} onClick={() => setTab('card')}>Карточка в списке</button>
        <button type="button" className={tab === 'article' ? 'active' : ''} onClick={() => setTab('article')}>Страница статьи</button>
      </div>

      {tab === 'card' ? (
        <div className="blog-preview-frame">
          <a className="blog-preview-card">
            {coverUrl && <div className="blog-preview-card-cover"><img src={coverUrl} alt="" /></div>}
            <div className="blog-preview-card-body">
              <h3>{title || 'Заголовок статьи'}</h3>
              {excerpt && <p>{excerpt}</p>}
              <div className="blog-preview-card-meta">
                <span>{new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <span> · {readingMinutes || 1} {lang === 'en' ? 'min read' : 'мин чтения'}</span>
              </div>
            </div>
          </a>
        </div>
      ) : (
        <div className="blog-preview-frame">
          <article className="blog-preview-article">
            {coverUrl && <div className="blog-preview-article-cover"><img src={coverUrl} alt="" /></div>}
            <header>
              {list.length > 0 && (
                <div className="blog-preview-tags">
                  {list.map((t) => <span key={t}>{t}</span>)}
                </div>
              )}
              <h1>{title || 'Заголовок статьи'}</h1>
              <div className="blog-preview-meta">
                <span>{author}</span>
                <span> · {new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <span> · {readingMinutes || 1} {lang === 'en' ? 'min read' : 'мин чтения'}</span>
                <span> · {wordCount || 0} {lang === 'en' ? 'words' : 'слов'}</span>
              </div>
            </header>
            <div className="blog-preview-content" dangerouslySetInnerHTML={{ __html: html || `<p style="color:#9ca3af">${lang === 'en' ? 'Article body is empty' : 'Текст статьи пока пуст'}</p>` }} />
          </article>
        </div>
      )}

      <style>{`
        .blog-preview-tabs { display: flex; gap: 0.5rem; margin-bottom: 0.9rem; }
        .blog-preview-tabs button {
          padding: 0.4rem 0.9rem; border-radius: 999px; border: 1px solid #e5e7eb; background: white;
          color: #6b7280; font-size: 0.78rem; font-weight: 600; cursor: pointer;
        }
        .blog-preview-tabs button.active { background: #1f2937; color: white; border-color: #1f2937; }
        .blog-preview-frame { background: #f3f4f6; border-radius: 14px; padding: 1.5rem; max-height: 560px; overflow-y: auto; }

        .blog-preview-card {
          display: block; max-width: 340px; margin: 0 auto; border-radius: 16px; border: 1px solid rgba(0,0,0,0.08);
          background: white; overflow: hidden; text-decoration: none; color: inherit;
        }
        .blog-preview-card-cover { width: 100%; aspect-ratio: 16/9; overflow: hidden; background: #e5e7eb; }
        .blog-preview-card-cover img { width: 100%; height: 100%; object-fit: cover; }
        .blog-preview-card-body { padding: 1.1rem 1.25rem 1.3rem; display: flex; flex-direction: column; gap: 0.5rem; }
        .blog-preview-card-body h3 { margin: 0; font-size: 1.05rem; font-weight: 700; color: #111827; }
        .blog-preview-card-body p { margin: 0; color: #4b5563; font-size: 0.85rem; line-height: 1.55; }
        .blog-preview-card-meta { font-size: 0.72rem; color: #9ca3af; }

        .blog-preview-article { max-width: 640px; margin: 0 auto; background: white; border-radius: 14px; padding: 1.75rem 2rem; }
        .blog-preview-article-cover { width: 100%; aspect-ratio: 16/7; border-radius: 12px; overflow: hidden; margin-bottom: 1.5rem; }
        .blog-preview-article-cover img { width: 100%; height: 100%; object-fit: cover; }
        .blog-preview-tags { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.6rem; }
        .blog-preview-tags span { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; color: #92400e; background: #fef3c7; padding: 0.15rem 0.55rem; border-radius: 999px; }
        .blog-preview-article h1 { font-size: 1.7rem; font-weight: 800; color: #111827; margin: 0 0 0.6rem; }
        .blog-preview-meta { color: #9ca3af; font-size: 0.82rem; margin-bottom: 1.5rem; }
        .blog-preview-content { font-size: 0.95rem; line-height: 1.75; color: #1f2937; }
        .blog-preview-content p { margin: 0 0 1.1em; }
        .blog-preview-content h2 { font-size: 1.3rem; font-weight: 700; margin: 1.5em 0 0.6em; }
        .blog-preview-content h3 { font-size: 1.1rem; font-weight: 700; margin: 1.25em 0 0.5em; }
        .blog-preview-content img { max-width: 100%; border-radius: 10px; margin: 1.25em 0; }
        .blog-preview-content a { color: #eab308; }
        .blog-preview-content blockquote { border-left: 4px solid #eab308; padding-left: 1em; margin: 1.25em 0; color: #6b7280; font-style: italic; }
        .blog-preview-content .blog-callout {
          background: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #eab308;
          border-radius: 10px; padding: 1em 1.25em; margin: 1.5em 0;
        }
        .blog-preview-content .blog-callout > *:first-child { margin-top: 0; }
        .blog-preview-content .blog-callout > *:last-child { margin-bottom: 0; }
      `}</style>
    </div>
  )
}

export default BlogPreview
