# CSV Export Service

Production-ready backend system that generates **large CSV exports (1M+ rows)** asynchronously using **Node.js, PostgreSQL, Docker, and background workers**.

---

#  Features

* Dockerized **Node.js + PostgreSQL** stack
* Automatic **database seeding with 1,000,000 users**
* **Async background worker** for CSV generation
* **Memory-safe streaming** for huge datasets
* **Job queue with concurrency control**
* **Atomic job locking** using `FOR UPDATE SKIP LOCKED`
* **Progress tracking** in database
* **Cancelable export jobs**
* **Download generated CSV files**
* **Health check endpoint**
* Production-ready **error handling & cleanup**

---

# Architecture Overview

```
Client → REST API → PostgreSQL (jobs table)
                    ↓
               Background Worker
                    ↓
              CSV File Generation
                    ↓
                 File Download
```

## Architecture

![System Architecture](./docs/architecture.png)

---

#  Key Concepts

### Async Processing

Exports run in background so API stays fast.

### Streaming CSV

Rows are written in batches → avoids memory crash with millions of records.

### Atomic Job Claiming

Prevents multiple workers from processing same job.

### Cancelable Jobs

Worker checks DB status during processing and stops safely.

---

# 🛠 Tech Stack

* Node.js 20
* Express.js
* PostgreSQL 15
* pg (node-postgres)
* csv-stringify
* Docker & Docker Compose

---

#  Project Structure

```
src/
 ├── api/            # REST endpoints
 ├── db/             # PostgreSQL connection
 ├── jobs/           # Background export worker
 ├── index.js        # Express app entry

seeds/
 ├── 01-schema.sql
 ├── 02-seed.sql
 └── 03-million-users.sql

exports/             # Generated CSV files
Dockerfile
docker-compose.yml
README.md
```

---

#  Setup & Run

## 1️⃣ Clone Repository

```bash
git clone <your-repo-url>
cd csv-export-service
```

---

## 2️⃣ Start System

```bash
docker compose down
docker compose up --build -d
```

---

## 3️⃣ Verify Containers

```bash
docker compose ps
```

Expected:

* csv_db → healthy
* csv_app → running

---

## 4️⃣ Verify Database (1M Users)

```bash
docker exec -it csv_db psql -U exporter -d exports_db -c "SELECT COUNT(*) FROM users;"
```

Expected:

```
1000000
```

---

# 🌐 API Endpoints

### Health Check

```bash
curl http://localhost:8080/health
```

---

### Create Export Job

```bash
curl -X POST "http://localhost:8080/exports/csv"
```

---

### Get Job Status

```bash
curl http://localhost:8080/exports/<JOB_ID>/status
```

---

### Cancel Job

```bash
curl -X DELETE http://localhost:8080/exports/<JOB_ID>
```

---

### Download CSV

```bash
curl -o export.csv http://localhost:8080/exports/<JOB_ID>/download
```

---

#  Testing & Execution (Full Flow)

## 1️⃣ Health Check

```bash
curl http://localhost:8080/health
```

---

## 2️⃣ Create Export

```bash
JOB_ID=$(curl -s -X POST http://localhost:8080/exports/csv | jq -r '.exportId')
echo $JOB_ID
```

---

## 3️⃣ Check Status

```bash
curl http://localhost:8080/exports/$JOB_ID/status
```

---

## 4️⃣ Download File

```bash
curl -o export.csv http://localhost:8080/exports/$JOB_ID/download
```

---

## 5️⃣ Test Filters

```bash
curl -X POST "http://localhost:8080/exports/csv?country_code=IN"
```

---

## 6️⃣ Test Column Selection

```bash
curl -X POST "http://localhost:8080/exports/csv?columns=id,name"
```

---

## 7️⃣ Cancel Job

```bash
JOB_ID=$(curl -s -X POST http://localhost:8080/exports/csv | jq -r '.exportId')

curl -X DELETE http://localhost:8080/exports/$JOB_ID
```

Verify:

```bash
docker exec -it csv_db psql -U exporter -d exports_db -c "SELECT status FROM exports WHERE id='$JOB_ID';"
```

---

## 8️⃣ Check Generated Files

```bash
docker exec -it csv_app ls /app/exports
```

---

## 9️⃣ Concurrency Test

```bash
for i in {1..5}; do
  curl -X POST http://localhost:8080/exports/csv &
done
wait
```

Check:

```bash
docker exec -it csv_db psql -U exporter -d exports_db -c "SELECT status, COUNT(*) FROM exports GROUP BY status;"
```

---

## 🔟 Restart Test

```bash
docker compose restart
```

---

## 1️⃣1️⃣ Error Handling

```bash
curl -X POST "http://localhost:8080/exports/csv?columns=invalid"
```

---

#  How Background Worker Works

1. Polls DB periodically
2. Locks one pending job
3. Marks job as processing
4. Streams data in batches
5. Updates progress
6. Supports cancellation
7. Marks job completed

---

#  Database Tables

## users

* Large dataset (1M rows)

## exports

* job status
* progress
* file path
* error

---

#  Docker Details

### Services

* db → PostgreSQL
* app → Node.js API + worker

### Volumes

* DB data
* CSV exports

---
