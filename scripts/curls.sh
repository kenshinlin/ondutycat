# 接收一个新的警报
```sh
curl -X POST "http://localhost:3000/api/alerts?receiver_im=devops-slack&tenant_id=your-tenant-id" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "CPU 使用率过高",
    "description": "服务器 CPU 使用率达到 95%",
    "source": "Prometheus",
    "severity": "critical",
    "alert_type": "system"
  }'
```
