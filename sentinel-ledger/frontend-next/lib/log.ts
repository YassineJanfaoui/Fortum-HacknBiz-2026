const isDev = process.env.NODE_ENV !== 'production';

export const log = {
  debug: (...args: unknown[]) => { if (isDev) console.debug('[SL]', ...args); },
  warn:  (...args: unknown[]) => { if (isDev) console.warn('[SL]', ...args); },
  error: (...args: unknown[]) => { if (isDev) console.error('[SL]', ...args); },
};
