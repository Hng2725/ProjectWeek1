import express from 'express';
import { Queue, Worker, Job } from 'bullmq';
import { Worker as NodeWorker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import { redisConnection } from './config/redis-config.ts';

const app = express();
app.use(express.json());

const QUEUE_NAME = 'ImageProcessingQueue';

const imageQueue = new Queue(QUEUE_NAME, { connection: redisConnection });

const imageWorker = new Worker(QUEUE_NAME, async (job: Job) => {
    console.log(`[BullMQ] Bắt đầu xử lý Job ${job.id} cho ảnh: ${job.data.imageId}`);

    return new Promise((resolve, reject) => {
        // CẬP NHẬT: Trỏ đường dẫn chính xác tới thư mục workers
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const workerPath = path.resolve(__dirname, 'workers', 'image-worker.js');

        const thread = new NodeWorker(workerPath, {
            workerData: { imageId: job.data.imageId }
        });

        thread.on('message', (result) => {
            if (result.success) resolve(result.data);
            else reject(new Error(result.error));
        });
        thread.on('error', reject);
        thread.on('exit', (code) => {
            if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
        });
    });
}, { connection: redisConnection });

imageWorker.on('completed', async (job: Job, returnvalue: any) => {
    console.log(`[BullMQ] Job ${job.id} thành công: ${returnvalue}`);
    await redisConnection.set(`cache:image:${job.data.imageId}`, returnvalue, 'EX', 60);
});

imageWorker.on('failed', (job: Job | undefined, err: Error) => {
    console.log(`[BullMQ] Job ${job?.id} thất bại: ${err.message}`);
});

app.post('/api/process-image', async (req, res) => {
    const { imageId } = req.body;
    if (!imageId) return res.status(400).json({ error: "Vui lòng cung cấp imageId" });

    const cacheKey = `cache:image:${imageId}`;

    try {
        const cachedResult = await redisConnection.get(cacheKey);
        if (cachedResult) {
            console.log(`[API] Cache Hit cho ảnh ${imageId}`);
            return res.json({ status: "success", source: "cache", data: cachedResult });
        }

        console.log(`[API] Cache Miss cho ảnh ${imageId}, đẩy vào Queue...`);
        const job = await imageQueue.add('compress', { imageId }, {
            jobId: `img_job_${imageId}`,
            attempts: 5,
            backoff: { type: 'exponential', delay: 1000 }
        });

        return res.json({ status: "processing", message: "Đang xử lý ngầm", jobId: job.id });
    } catch (error) {
        return res.status(500).json({ error: "Lỗi hệ thống" });
    }
});

app.listen(3000, () => {
    console.log("Server đang chạy tại http://localhost:3000");
});