Check Postman:
Method: POST
URL: http://localhost:3000/api/process-image
Phần Body dán:
            {
                "imageId": "PIC_123"
            }
Response (JSON):
        {
            "status": "processing",
            "message": "Đang xử lý ngầm",
            "jobId": "img_job_PIC_123"
        }
