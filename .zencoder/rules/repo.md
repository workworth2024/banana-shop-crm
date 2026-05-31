# Banana Shop — CRM Admin (banana-shop-crm)

React + Vite admin panel. API client `src/api/client.js` is fetch-based, `credentials:'include'`,
BASE_URL ends with `/api/v3`.

## Top navbar tabs
`src/sections/AdminLayout.jsx` has top tabs: **Основное** (`/`) and **Tracking** (`/tracking`).
The global "Поиск по системе" header search was removed.

## Tracking page — `src/pages/Tracking.jsx` (route `/tracking` in App.jsx)
Three sub-tabs: **Ссылки** (Links), **Статистика** (Statistics), **Дашборд** (Dashboard).
API client: `src/api/tracking.js` (`listLinks`, `createLink`, `updateLink`, `deleteLink`,
`linkStats`, `dashboard`); all forward arbitrary query params via `buildQs`.

### Key behaviors
- **Links**: create/edit smart links (name, targetPath, utm.*, subs[] added via "+", isActive toggle).
  Table shows period stats: Клики, Уник., Рег., CR, Покупки, Выручка. Copy buttons for code + url.
- **Date range** (`useDateRange` + `RangePicker`): presets Сегодня/Вчера/Неделя/Текущий месяц/Свой период,
  default = month. Applied to all 3 sub-tabs; sends `from`/`to`.
- **Affiliate filters** (`LinkFilters`, `emptyFilters()`): utm_source/medium/campaign + sub key/value selects
  (options derived from loaded links). Present on **Links** and **Dashboard**.
- **Metrics**: `crOf(s)` = registrations/clicks*100 (registration counts as conversion). `fmtPct`, `fmtMoney`,
  `fmtInt`. Revenue rendered green (`moneyGreen`) everywhere.
- **GeoCell**: real country flags as `<img>` from `flagcdn.com` (Windows can't render flag emoji), globe icon
  fallback for unknown geo.
- **DeviceCell + OS icons**: real brand SVG logos via `OS_BRAND` map / `OsIcon` (Windows/macOS/iOS/Android/Linux,
  Simple Icons paths + brand colors), lucide device icon fallback. `BreakdownTable` takes `kind="geo"|"device"`.

## Conventions
- Inline-style components (no CSS modules in Tracking page). lucide-react for icons (no brand icons → inline SVG).
- Pre-existing baseline lint: `icon: Icon` destructure flagged `no-unused-vars` — not a real issue, doesn't block build.
- Do NOT add code comments unless asked.
