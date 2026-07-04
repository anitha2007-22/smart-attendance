const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = process.env.LOG_LEVEL
  ? levels[process.env.LOG_LEVEL]
  : process.env.NODE_ENV === 'production'
  ? levels.info
  : levels.debug;

function timestamp() {
  return new Date().toISOString();
}

function log(level, message) {
  if (levels[level] <= currentLevel) {
    const line = `[${timestamp()}] [${level.toUpperCase()}] ${message}`;
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  }
}

module.exports = {
  error: (msg) => log('error', msg),
  warn: (msg) => log('warn', msg),
  info: (msg) => log('info', msg),
  debug: (msg) => log('debug', msg),
};