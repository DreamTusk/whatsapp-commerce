const logger = {
  info: (...args: unknown[]): void => {
    console.log(`[INFO] ${new Date().toISOString()}:`, ...args);
  },
  error: (...args: unknown[]): void => {
    console.error(`[ERROR] ${new Date().toISOString()}:`, ...args);
  },
  warn: (...args: unknown[]): void => {
    console.warn(`[WARN] ${new Date().toISOString()}:`, ...args);
  },
  debug: (...args: unknown[]): void => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${new Date().toISOString()}:`, ...args);
    }
  },
};

export default logger;
