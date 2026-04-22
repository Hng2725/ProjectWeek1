import IORedis from 'ioredis';

// Khởi tạo kết nối Redis dùng chung cho cả Cache và BullMQ
export const redisConnection = new IORedis({
    host: '127.0.0.1',
    port: 6379,
    maxRetriesPerRequest: null // Cấu hình bắt buộc của BullMQ
});