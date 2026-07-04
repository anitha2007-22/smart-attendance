const app = require('./app');
const env = require('./config/env');
const { testConnection } = require('./config/db');
const logger = require('./utils/logger');
const autoSessionCron = require('./jobs/autoSession.cron');
const notificationCron = require('./jobs/notification.cron');

async function start() {
  await testConnection();

  const server = app.listen(env.PORT, () => {
    logger.info(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    logger.info(`API base URL: http://localhost:${env.PORT}${env.API_PREFIX}`);
  });

  // Start background cron jobs
  autoSessionCron.schedule();
  notificationCron.schedule();

  process.on('unhandledRejection', (err) => {
    logger.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => process.exit(0));
  });
}

start();