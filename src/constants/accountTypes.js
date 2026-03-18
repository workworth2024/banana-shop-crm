const ACCOUNT_TYPES = {
  'self-reg-farm-no-num': {
    ru: 'Фарм без номера (14+ дней прогрева)',
    en: 'Farm without number (14+ days warm-up)'
  },
  'self-reg-farm-rent-num': {
    ru: 'Фарм + Арендный номер',
    en: 'Farm + Rented number'
  },
  'verif-identity-only': {
    ru: 'Ads + Верификация (без спенда)',
    en: 'Ads + Verification (no spend)'
  },
  'low-bill-spend-10': {
    ru: 'Вериф + спенд до 10$',
    en: 'Verified + spend up to $10'
  },
  'high-bill-spend-20': {
    ru: 'Вериф + спенд 10-20$ (Лимит 50€+)',
    en: 'Verified + spend $10–20 (Limit 50€+)'
  },
  'high-bill-wp-spend': {
    ru: 'Вериф + спенд + White Page',
    en: 'Verified + spend + White Page'
  },
  'g2rs-finance-spend': {
    ru: 'Сертификат G2RS + Спенд + Домен',
    en: 'G2RS Certificate + Spend + Domain'
  },
  'old-spended-heavy': {
    ru: 'Старые аккаунты (1 год+, спенд 50$+)',
    en: 'Old accounts (1+ year, spend $50+)'
  },
  'no-farm': {
    ru: 'Без фарма',
    en: 'No Farm'
  }
}

export function getAccountTypeLabel(typeKey, lang = 'ru') {
  if (!typeKey) return null
  const entry = ACCOUNT_TYPES[typeKey]
  if (!entry) return typeKey
  return entry[lang] || entry.ru || typeKey
}

export default ACCOUNT_TYPES
