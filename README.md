# Project Week 1 - Image Processing Queue System

Hệ thống xử lý ảnh bất đồng bộ sử dụng **Node.js**, **Express**, **BullMQ**, **Redis** và **Worker Threads**. Dự án minh họa cách xử lý các tác vụ nặng (như nén ảnh) dưới nền (background processing) mà không làm block luồng chính của server, kết hợp với cơ chế caching để tối ưu hiệu suất.

## Công nghệ sử dụng
- **Node.js & Express**: Xây dựng RESTful API.
- **TypeScript**: Hỗ trợ strict typing và hệ thống module ESM.
- **BullMQ**: Quản lý hàng đợi (Queue) tác vụ bất đồng bộ.
- **Redis (ioredis)**: Lưu trữ Queue của BullMQ và Caching kết quả.
- **Worker Threads**: Xử lý tác vụ tính toán nặng (CPU-bound) trên các luồng riêng biệt.

## Yêu cầu hệ thống
- **Node.js** (Khuyên dùng phiên bản LTS)
- **Redis Server** đang chạy tại `localhost:6379` (Nếu chưa có, có thể chạy nhanh qua Docker: `docker run -d -p 6379:6379 redis`)

## Cài đặt và Chạy dự án

1. **Cài đặt các thư viện cần thiết:**
   ```bash
   npm install
   ```

2. **Khởi động Server:**
   Chạy lệnh sau để khởi động server ở chế độ phát triển:
   ```bash
   npx ts-node src/server.ts
   ```
   *(Server sẽ hiển thị thông báo chạy thành công tại `http://localhost:3000`)*

## Hướng dẫn API (Kiểm tra với Postman)

### Gửi yêu cầu nén/xử lý ảnh
- **Method:** `POST`
- **URL:** `http://localhost:3000/api/process-image`
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**
  ```json
  {
      "imageId": "PIC_123"
  }
  ```

### Kết quả trả về (Response)

**Trường hợp 1: Ảnh mới chưa được xử lý (Cache Miss)**
Hệ thống sẽ đẩy tác vụ vào Queue xử lý ngầm và trả về phản hồi ngay lập tức:
```json
{
    "status": "processing",
    "message": "Đang xử lý ngầm",
    "jobId": "img_job_PIC_123"
}
```

**Trường hợp 2: Ảnh đã xử lý xong (Cache Hit)**
Nếu bạn gửi lại cùng một `imageId` sau khi quá trình xử lý hoàn tất, kết quả sẽ được trả về ngay lập tức từ Redis Cache (không cần đưa vào Queue nữa):
```json
{
    "status": "success",
    "source": "cache",
    "data": "Ảnh PIC_123 đã được nén thành công! (Size: 200KB)"
}
```

## Kiến trúc và Luồng hoạt động
1. **API Nhận Request:** Endpoint `/api/process-image` nhận `imageId` từ phía client.
2. **Kiểm tra Cache:** Hệ thống kiểm tra key `cache:image:{imageId}` trong Redis. Nếu có dữ liệu, trả về ngay lập tức (Cache Hit).
3. **Thêm vào Queue:** Nếu chưa có (Cache Miss), công việc (Job) sẽ được đẩy vào `ImageProcessingQueue` thông qua BullMQ.
4. **Worker Xử lý:** `BullMQ Worker` nhận Job và khởi tạo một Node.js `Worker Thread` độc lập (`image-worker.js`) để mô phỏng việc nén ảnh tốn CPU (giúp main thread không bị đứng).
5. **Lưu Caching:** Khi Worker Thread xử lý thành công, kết quả được lưu lại vào Redis Cache với thời gian hết hạn (TTL) là 60 giây. Nếu Worker gặp lỗi mạng giả lập, Job sẽ được ghi nhận là thất bại.
