# ENGCE301 Final Lab — Set 2
## Microservices Scale-Up + Cloud Deploy (Railway)

---

## 1. ข้อมูลนักศึกษา

| ชื่อ-นามสกุล | รหัสนักศึกษา |
|---|---|
| นายปรเมษฐ สุริคำ | 66543206038-2 |
| นายเมย์คาร์ สุวรรณวิสุทธิ์ | 66543206085-3 |

---

## 2. Railway Service URLs

| Service | URL |
|---|---|
| Auth Service | https://auth-service-production-5d4e.up.railway.app |
| Task Service | https://task-service-production-431b.up.railway.app |
| User Service | https://user-service-production-b4cf.up.railway.app |

---

## 3. Architecture Diagram (Cloud)

```
Internet
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│   🌐 Railway Cloud Platform                                      │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  🔑 Auth Service │  │  📋 Task Service │  │  👤 User Service │  │
│  │  PORT: 3001      │  │  PORT: 3002     │  │  PORT: 3003     │  │
│  └────────┬─────────┘  └───────┬─────────┘  └────────┬────────┘  │
│           │                    │                      │           │
│           ▼                    ▼                      ▼           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │  🗄️ auth-db      │  │  🗄️ task-db      │  │  🗄️ user-db    │  │
│  │  users, logs     │  │  tasks, logs     │  │  profiles,logs │  │
│  └──────────────────┘  └──────────────────┘  └────────────────┘  │
│                                                                  │
│   JWT_SECRET ใช้ร่วมกันทุก service (Railway Environment Variables) │
└──────────────────────────────────────────────────────────────────┘
```

### Services
- **Auth Service** — จัดการ register/login ออก JWT token
- **Task Service** — CRUD tasks โดยใช้ JWT ยืนยันตัวตน
- **User Service** — จัดการ user profiles โดยใช้ JWT ยืนยันตัวตน

### Databases (Database-per-Service Pattern)

| Database | Tables | Service |
|---|---|---|
| auth-db | users, logs | Auth Service |
| task-db | tasks, logs | Task Service |
| user-db | user_profiles, logs | User Service |

> เนื่องจากแต่ละ service มี DB ของตัวเอง จึงไม่มี Foreign Key ข้าม Database แต่ใช้ `user_id` เป็น conceptual reference แทน

---

## 4. Gateway Strategy

### Option A — Frontend เรียก URL ของแต่ละ Service โดยตรง

เลือก **Option A** เนื่องจาก:
- ง่ายที่สุด ไม่ต้องตั้งค่า Nginx หรือ config เพิ่มเติม
- เหมาะกับ environment การทดสอบและ academic project
- ลดความซับซ้อนในการ deploy บน Railway
- แต่ละ service มี Public URL ของตัวเองอยู่แล้ว

### ข้อกำหนดที่ปฏิบัติตาม
- `JWT_SECRET` เหมือนกันทุก service
- Task Service ปฏิเสธ request ที่ไม่มี JWT → **401**
- User Service ปฏิเสธ request ที่ไม่มี JWT → **401**
- Auth Service ทำงานได้โดยไม่ต้องมี JWT (login/register)

---

## 5. วิธีทดสอบ (curl commands)

### Register (T2)
```bash
curl -X POST https://auth-service-production-5d4e.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser2","password":"pass123","email":"test2@test.com"}'
```

### Login (T3) — เก็บ token
```bash
TOKEN=$(curl -s -X POST https://auth-service-production-5d4e.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser2","password":"pass123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
```

### Create Task (T4)
```bash
curl -X POST https://task-service-production-431b.up.railway.app/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My first cloud task"}'
```

### Get Tasks (T5)
```bash
curl https://task-service-production-431b.up.railway.app/api/tasks \
  -H "Authorization: Bearer $TOKEN"
```

### Get Profile (T6)
```bash
curl https://user-service-production-b4cf.up.railway.app/api/users/profile \
  -H "Authorization: Bearer $TOKEN"
```

### Update Profile (T7)
```bash
curl -X PUT https://user-service-production-b4cf.up.railway.app/api/users/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"display_name":"Test User","bio":"Hello from Railway!"}'
```

### Test 401 — ไม่มี JWT (T8)
```bash
curl https://task-service-production-431b.up.railway.app/api/tasks
# Expected: {"error":"Unauthorized: No token provided"}
```

---

## 6. ผลการทดสอบ

| Test | รายการ | ผล |
|---|---|---|
| T1 | Railway Dashboard — 3 services + 3 databases Active | ✅ ผ่าน |
| T2 | POST /register บน Railway Auth URL → 201 + user object | ✅ ผ่าน |
| T3 | POST /login บน Railway Auth URL → JWT token | ✅ ผ่าน |
| T4 | POST /tasks บน Railway Task URL (มี JWT) → 201 Created | ✅ ผ่าน |
| T5 | GET /tasks บน Railway Task URL (มี JWT) → tasks list | ✅ ผ่าน |
| T6 | GET /users/profile บน Railway User URL (มี JWT) | ✅ ผ่าน |
| T7 | PUT /users/profile บน Railway → อัปเดตสำเร็จ | ✅ ผ่าน |
| T8 | GET /tasks โดยไม่มี JWT → 401 | ✅ ผ่าน |
| T9 | Railway env page แสดง JWT_SECRET เหมือนกันทุก service | ✅ ผ่าน |
| T10 | README อธิบาย Gateway Strategy + Architecture Cloud | ✅ ผ่าน |