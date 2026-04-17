# CSV Export Service

A production-ready backend system that generates large CSV exports (1M+ rows) asynchronously using Node.js, PostgreSQL, Docker, and background workers.

---

## Overview

This service is designed to handle large-scale data exports efficiently without blocking the API. It uses background processing, streaming, and database-driven job management to ensure reliability and scalability.

---

## Features

* Dockerized Node.js and PostgreSQL stack
* Automatic database seeding with 1,000,000 users
* Asynchronous background worker for CSV generation
* Memory-safe streaming for large datasets
* Job queue with concurrency control
* Atomic job locking using `FOR UPDATE SKIP LOCKED`
* Progress tracking stored in database
* Cancelable export jobs
* CSV file download support
* Health check endpoint
* Production-ready error handling and cleanup

---

## Architecture Overview

```
Client → REST API → PostgreSQL (jobs table)
                  ↓
           Background Worker
                  ↓
          CSV File Generation
                  ↓
             File Download
```

---

## Core Concepts

### Async Processing

Exports run in the background so the API remains fast and responsive.

### Streaming CSV

Data is processed and written in batches to avoid memory overflow.

### Atomic Job Claiming

Ensures only one worker processes a job using row-level locking.

### Cancelable Jobs

Workers periodically check job status and stop safely when canceled.

---

## Tech Stack

* Node.js 20
* Express.js
* PostgreSQL 15
* pg (node-postgres)
* csv-stringify
* Docker and Docker Compose

---

## Project Structure

```
src/
  api/
  db/
  jobs/
  index.js

seeds/
  01-schema.sql
  02-seed.sql
  03-million-users.sql

exports/

Dockerfile
docker-compose.yml
README.md
```

---

## Setup and Run

### Clone Repository

```
git clone <your-repo-url>
cd csv-export-service
```

### Start Services

```
docker compose down
docker compose up --build -d
```

### Verify Containers

```
docker compose ps
```

### Verify Database Seeding

```
docker exec -it csv_db psql -U exporter -d exports_db -c "SELECT COUNT(*) FROM users;"
```

Expected output:

```
1000000
```

---

## API Endpoints

### Health Check

```
GET /health
```

```
curl http://localhost:8080/health
```

---

### Create Export Job

```
POST /exports/csv
```

```
curl -X POST http://localhost:8080/exports/csv
```

---

### Get Job Status

```
GET /exports/:id/status
```

```
curl http://localhost:8080/exports/<JOB_ID>/status
```

---

### Cancel Job

```
DELETE /exports/:id
```

```
curl -X DELETE http://localhost:8080/exports/<JOB_ID>
```

---

### Download CSV

```
GET /exports/:id/download
```

```
curl -o export.csv http://localhost:8080/exports/<JOB_ID>/download
```

---

## Testing and Execution Guide

### Step 1: Health Check

```
curl http://localhost:8080/health
```

---

### Step 2: Create Export Job

```
curl -X POST http://localhost:8080/exports/csv
```

Example response:

```
{"exportId":"123e4567-abc"}
```

---

### Step 3: Set Job ID

```
JOB_ID=123e4567-abc
```

---

### Step 4: Check Status

```
curl http://localhost:8080/exports/$JOB_ID/status
```

---

### Step 5: Download File

```
curl -o export.csv http://localhost:8080/exports/$JOB_ID/download
```

---

### Step 6: Test Filters

```
curl -X POST "http://localhost:8080/exports/csv?country_code=IN"
```

---

### Step 7: Test Column Selection

```
curl -X POST "http://localhost:8080/exports/csv?columns=id,name"
```

---

### Step 8: Cancel Job

```
curl -X DELETE http://localhost:8080/exports/$JOB_ID
```

---

### Step 9: Verify Cancellation

```
docker exec -it csv_db psql -U exporter -d exports_db -c "SELECT status FROM exports WHERE id='$JOB_ID';"
```

---

### Step 10: Check Generated Files

```
docker exec -it csv_app ls /app/exports
```

---

### Step 11: Concurrency Test

```
for i in {1..5}; do
  curl -X POST http://localhost:8080/exports/csv &
done
wait
```

---

### Step 12: Check Results

```
docker exec -it csv_db psql -U exporter -d exports_db -c "SELECT status, COUNT(*) FROM exports GROUP BY status;"
```

---

### Step 13: Restart Test

```
docker compose restart
```

---

### Step 14: Error Handling Test

```
curl -X POST "http://localhost:8080/exports/csv?columns=invalid"
```

---

## Background Worker Flow

1. Polls database for pending jobs
2. Locks one job using `FOR UPDATE SKIP LOCKED`
3. Marks job as processing
4. Streams data in batches
5. Updates progress in database
6. Checks for cancellation signal
7. Marks job as completed or failed

---

## Database Tables

### users

Contains large dataset with 1,000,000 records.

### exports

Stores job metadata including:

* status
* progress
* file path
* error messages

---

## Summary

This system demonstrates how to build a scalable, production-grade export service using background workers, streaming, and database-driven job control. It is optimized for handling very large datasets efficiently and safely.

---
