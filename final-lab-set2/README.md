# 🚀 ENGCE301 Final Lab — Set 2: Microservices Scale-Up + Cloud Deploy (Railway)

**ชื่อนักศึกษา:**
- ปรเมษฐ สุริคำ — รหัส 66543206038-2
- นายเมย์คาร์ สุวรรณวิสุทธิ์ — รหัส 66543206085-3

---

## 🌐 Railway Cloud URLs

| Service | URL |
|---------|-----|
| Auth Service | `https://[AUTH_URL]` |
| Task Service | `https://[TASK_URL]` |
| User Service | `https://[USER_URL]` |

> อัปเดต URL หลัง deploy บน Railway

---

## 🏗️ Architecture Diagram (Cloud)

```
Internet
    │
    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│   🌐 Railway Cloud Platform                                              │
│                                                                          │
│  ┌───────────────────┐  ┌──────────────────────┐  ┌───────────────────┐  │
│  │  🔑 Auth Service  │  │  📋 Task Service      │  │  👤 User Service  │  │
│  │  auth.up.rlwy.net │  │  task.up.rlwy.net    │  │  user.up.rlwy.net │  │
│  │  PORT: 3001       │  │  PORT: 3002          │  │  PORT: 3003       │  │
│  └────────┬──────────┘  └──────────┬───────────┘  └────────┬──────────┘  │
│           │                        │                       │             │
│           ▼                        ▼                       ▼             │
│  ┌────────────────┐   ┌─────────────────────┐  ┌──────────────────────┐  │
│  │  🗄️ auth-db    │   │  🗄️ task-db          │  │  🗄️ user-db          │  │
│  │  PostgreSQL    │   │  PostgreSQL         │  │  PostgreSQL          │  │
│  │  users table   │   │  tasks table        │  │  user_profiles table │  │
│  │  logs table    │   │  logs table         │  │  logs table          │  │
│  └────────────────┘   └─────────────────────┘  └──────────────────────┘  │
│                                                                          │
│  JWT_SECRET ใช้ร่วมกันทุก service                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🔀 Gateway Strategy

เลือก **Option A: Frontend เรียก URL ของแต่ละ service โดยตรง**

**เหตุผล:** เป็นวิธีที่ง่ายและตรงไปตรงมาที่สุดสำหรับ scope ของ lab นี้ โดย Frontend รู้ URL ของแต่ละ service และเรียกตรงได้เลย ทุก service ใช้ JWT_SECRET เดียวกัน ทำให้ token จาก Auth Service ใช้กับ Task และ User Service ได้ทันที

---

## 🚀 วิธีรัน (Local)

```bash
git clone <repo-url>
cd engce301-final-lab2-...
docker compose up --build
```

Services จะรันที่:
- Auth Service: http://localhost:3001
- Task Service: http://localhost:3002
- User Service: http://localhost:3003

---

## 📋 API Endpoints

### Auth Service
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | ❌ | สมัครสมาชิก |
| POST | /api/auth/login | ❌ | Login รับ JWT |
| GET | /api/auth/verify | ❌ | ตรวจสอบ JWT |

### Task Service
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/tasks | ✅ JWT | ดึง tasks |
| POST | /api/tasks | ✅ JWT | สร้าง task |
| PUT | /api/tasks/:id | ✅ JWT | แก้ไข task |
| DELETE | /api/tasks/:id | ✅ JWT | ลบ task |

### User Service
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/users/profile | ✅ JWT | ดู profile |
| PUT | /api/users/profile | ✅ JWT | แก้ไข profile |
| GET | /api/users/all | ✅ JWT | ดู users ทั้งหมด |
| DELETE | /api/users/:id | ✅ JWT | ลบ user |

---

## 🧪 Test Commands (Cloud)

```bash
AUTH_URL="https://[AUTH_URL]"
TASK_URL="https://[TASK_URL]"
USER_URL="https://[USER_URL]"

# Register
curl -X POST $AUTH_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@test.com","password":"pass123"}'

# Login
TOKEN=$(curl -s -X POST $AUTH_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"pass123"}' | \
  grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Create Task
curl -X POST $TASK_URL/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My first cloud task"}'

# Get Tasks
curl $TASK_URL/api/tasks -H "Authorization: Bearer $TOKEN"

# Get Profile
curl $USER_URL/api/users/profile -H "Authorization: Bearer $TOKEN"

# Test 401
curl $TASK_URL/api/tasks
```
