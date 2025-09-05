import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

export const redis = globalForRedis.redis ?? 
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    lazyConnect: true,
    maxRetriesPerRequest: null,
  })

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis

// Cache utilities
export const cacheKeys = {
  user: (id: string) => `user:${id}`,
  subscription: (userId: string) => `subscription:${userId}`,
  project: (id: string) => `project:${id}`,
  usage: (userId: string, period: string) => `usage:${userId}:${period}`,
  renderQueue: () => 'render:queue',
  systemConfig: () => 'system:config',
  analytics: (type: string, period: string) => `analytics:${type}:${period}`,
} as const

export const cacheService = {
  async set(key: string, value: any, ttl = 3600) {
    await redis.setex(key, ttl, JSON.stringify(value))
  },
  
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key)
    return value ? JSON.parse(value) : null
  },
  
  async del(key: string) {
    await redis.del(key)
  },
  
  async increment(key: string, value = 1) {
    return await redis.incrby(key, value)
  },
  
  async expire(key: string, ttl: number) {
    await redis.expire(key, ttl)
  },
  
  async exists(key: string) {
    return await redis.exists(key)
  },
}