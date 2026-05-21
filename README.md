# Die Pattern Management

A complete Die Pattern Management Web application built with **.NET 6** backend and **Next.js** frontend.

## Quick Start

### 1. Database Setup
Ensure you have **SQL Server Express** (or similar) installed locally. Update `backend/appsettings.json` (or `appsettings.Development.json`) with your connection string.

### 2. Backend (.NET)
```bash
cd backend
dotnet restore
dotnet run
```
*Runs on: https://localhost:3001 (or as configured)*

### 3. Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
*Runs on: http://localhost:3000*

---

## Default Credentials

The system seeds an admin user on first run (defined in `DbInitializer.cs`):

- **Username**: `mitul`
- **Password**: `admin`

---

## 📦 Automated Production Publish
Run this from the **repository root** (the folder containing `publish.ps1`):

```powershell
powershell -ExecutionPolicy Bypass -File .\publish.ps1
```

## Tech Stack

### Backend
- **Framework**: .NET 6 Web API (C#)
- **Database**: SQL Server
- **ORM**: Entity Framework Core
- **Authentication**: JWT Bearer Auth
- **Documentation**: Swagger UI (in Dev mode)

### Frontend
- **Framework**: Next.js 14 App Router + TypeScript
- **Styling**: Tailwind CSS + ShadCN UI
- **State Management**: TanStack Query
- **Validation**: React Hook Form + Zod
- **Type Safety**: Full TypeScript support

---

## Project Structure

```
die_pattern/
├── backend/          # .NET 6 Web API
├── frontend/         # Next.js 14 Frontend
├── .env.example      # Environment configuration template
└── README.md
```

---
## Publish

Create a timestamped `Publish/<stamp>/` folder containing the backend publish output plus the frontend static export copied into `wwwroot`.

Run (PowerShell):
```powershell
.\publish.ps1 -Configuration Release
```
# Project_Order_Tracking
