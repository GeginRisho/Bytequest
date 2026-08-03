import Redis from 'ioredis';
import logger from './logger';
import env from './env';

const redisConfig = {
  maxRetriesPerRequest: null,
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

export const redis = new Redis(env.REDIS_URL, redisConfig);
export const redisPub = new Redis(env.REDIS_URL, redisConfig);
export const redisSub = new Redis(env.REDIS_URL, redisConfig);

let mainErrorLogged = false;
let pubErrorLogged = false;
let subErrorLogged = false;

redis.on('connect', () => {
  logger.info('🔌 Main Redis connected successfully.');
  mainErrorLogged = false;
});
redis.on('error', (err) => {
  if (!mainErrorLogged) {
    logger.warn(`⚠️ Main Redis offline (attempting background reconnection): ${err.message}`);
    mainErrorLogged = true;
  }
});

redisPub.on('connect', () => {
  logger.info('🔌 Pub Redis connected successfully.');
  pubErrorLogged = false;
});
redisPub.on('error', (err) => {
  if (!pubErrorLogged) {
    logger.warn(`⚠️ Pub Redis offline (attempting background reconnection): ${err.message}`);
    pubErrorLogged = true;
  }
});

redisSub.on('connect', () => {
  logger.info('🔌 Sub Redis connected successfully.');
  subErrorLogged = false;
});
redisSub.on('error', (err) => {
  if (!subErrorLogged) {
    logger.warn(`⚠️ Sub Redis offline (attempting background reconnection): ${err.message}`);
    subErrorLogged = true;
  }
});

export default redis;
