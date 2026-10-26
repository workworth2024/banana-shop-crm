// SEO scoring helpers for the blog editor — a lightweight, client-side checklist
// (not a real SEO audit) to nudge authors toward a publishable article before they hit save.

export const stripHtml = (html = '') => String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export const countWords = (html = '') => {
  const text = stripHtml(html);
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
};

export const countHeadings = (html = '', level = 2) => {
  const re = new RegExp(`<h${level}[\\s>]`, 'gi');
  return (html.match(re) || []).length;
};

export const countInternalLinks = (html = '') => {
  const matches = [...String(html).matchAll(/<a\s+[^>]*href=["']([^"']+)["']/gi)];
  return matches.filter(([, href]) => href.startsWith('/') || href.includes('banana-traff-shop.com')).length;
};

export const hasSignupCta = (html = '') =>
  /href=["'](?:\/register|\/login)["']/i.test(html) || /class=["'][^"']*\b(cta|signup|sign-up)\b/i.test(html);

const MIN_WORDS = 300;
const MIN_H2 = 2;
const MIN_LINKS = 2;

// Returns { checks: [{id, ok, label}], score: 0-100, tips: [string] }
export function computeSeoChecks({ title = '', excerpt = '', metaDescription = '', html = '', hasCover = false, translationLinked = false }) {
  const words = countWords(html);
  const h2 = countHeadings(html, 2);
  const links = countInternalLinks(html);
  const description = (metaDescription || excerpt || '').trim();

  const checks = [
    {
      id: 'title',
      ok: Boolean(title.trim()),
      label: title.trim() ? 'Заголовок заполнен' : 'No title',
    },
    {
      id: 'description',
      ok: Boolean(description),
      label: description ? 'Описание заполнено' : 'No description — Google will pick random text',
    },
    {
      id: 'words',
      ok: words >= MIN_WORDS,
      label: words >= MIN_WORDS ? `${words} words — good length` : `${words} words — thin content rarely ranks`,
    },
    {
      id: 'headings',
      ok: h2 >= MIN_H2,
      label: h2 >= MIN_H2
        ? `${h2} H2 headings — table of contents ready`
        : 'Split the text with 2+ H2 headings (they become the table of contents)',
    },
    {
      id: 'cover',
      ok: hasCover,
      label: hasCover ? 'Cover image set' : 'No cover — no large image in search and previews',
    },
    {
      id: 'links',
      ok: links >= MIN_LINKS,
      label: links >= MIN_LINKS ? `${links} links to other pages` : 'Add 2+ links to other pages of the site',
    },
    {
      id: 'translation',
      ok: translationLinked,
      label: translationLinked ? 'Translation linked — ru + en' : 'No translation linked — a pair doubles the reach',
    },
  ];

  const tips = [];
  if (!hasSignupCta(html)) tips.push('Tip: add a button to sign-up');

  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  return { checks, tips, score, words, h2, links };
}
