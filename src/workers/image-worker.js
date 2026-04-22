import { parentPort, workerData } from 'worker_threads';

function compressImage(imageId) {
    let progress = 0;
    // Giả lập tốn CPU
    for (let i = 0; i < 2_000_000_000; i++) {
        progress += 1;
    }

    // Giả lập tỷ lệ lỗi 20%
    if (Math.random() < 0.2) {
        throw new Error("Lỗi mạng khi tải pixel ảnh!");
    }

    return `Ảnh ${imageId} đã được nén thành công! (Size: 200KB)`;
}

try {
    const result = compressImage(workerData.imageId);
    parentPort.postMessage({ success: true, data: result });
} catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
}