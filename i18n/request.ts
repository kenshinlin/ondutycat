import { getRequestConfig } from 'next-intl/server';
import { locales, type Locale, defaultLocale } from './config';

// Import all message files directly with type assertion
import enMessages from '../messages/en.json' with { type: 'json' };
import zhCnMessages from '../messages/zh-CN.json' with { type: 'json' };

const messages: Record<Locale, any> = {
  'en': enMessages,
  'zh-CN': zhCnMessages,
};

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  // Type assertion: we've validated the locale above
  const localeKey = locale as Locale;

  return {
    locale: localeKey,
    messages: messages[localeKey],
    timeZone: 'Asia/Shanghai',
    now: new Date(),
  };
});
