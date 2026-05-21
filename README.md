# Project Order Tracking

End-to-end order tracking software for valve manufacturing — designed for a single division, with strong multi-quantity traceability across every stage:

> **Order → Product → BOM → Item → PI → PO → Inward → QC → Job Work → Production → Delivery**

## Highlights

- **Sales Order management** with customer, multi-product lines, and per-order BOM selection (or inline BOM creation).
- **BOM Master** with per-item process flow (PI → PO → Inward → QC → Machining → Powder Coating → Polishing → Heat Treatment → …).
- **Per-order BOM plan** materialised at order time, with running counters (Indented / Ordered / Inwarded / QC Approved / Rework / Rejected / JobWork Sent / Ready / Consumed) for every BOM item — powering the Gantt-style traceability view.
- **Procurement workflow**: PI (Purchase Order or Job Work purpose) → PO (multi-quantity per line, rate, GST) → Inward (GRN, multi-source) → QC (per-quantity Pass / Rework / Reject decisions).
- **Job Work** linked to a Process Master (Machining, Polishing, Powder Coating, Heat Treatment, Threading, Assembly).
- **Production** consumes ready BOM-item stock and produces finished products (partial production supported).
- **Delivery Challan** dispatches produced products against an order; supports multiple deliveries / partial dispatch.
- **Traceability**: select an order to see the full PI → … → Delivery timeline and per-BOM-item Gantt.
- **Reports**: Order Ledger (per order) with Excel export.
- **Settings**: Software profile (company name, software name, primary colour, logo, address, GST, contact) — stored in the database. Permissions matrix per user. Document control for printed forms.

## Tech Stack

- **Backend** — .NET 6 Web API (C#), Entity Framework Core (SQL Server), JWT in HttpOnly cookie, ClosedXML for Excel.
- **Frontend** — Next.js 14 App Router, TypeScript, Tailwind, custom dialog stack (shadcn-inspired), TanStack Query, react-hook-form + zod, framer-motion, lucide-react.

## Quick Start

### 1. Database
SQL Server Express (or compatible). Edit `backend/appsettings.json` `ConnectionStrings.DefaultConnection` if needed. The schema is created automatically by EF migrations on first run.

### 2. Backend
```bash
cd backend
dotnet restore
dotnet run
```
Runs on https://localhost:3001 (or as configured).

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on http://localhost:3000

## Default Credentials

Seeded admin user (in `Data/DbInitializer.cs`):

- **Username**: `mitul`
- **Password**: `admin`

## Production Publish

From repository root (PowerShell):
```powershell
powershell -ExecutionPolicy Bypass -File .\publish.ps1
```

Outputs a timestamped `Publish/<stamp>/` folder containing the backend publish output plus the frontend static export copied into `wwwroot`.

## Project Structure
```
project_order_tracking/
├── backend/                # .NET 6 Web API + EF Core migrations
├── frontend/               # Next.js 14 (static export in prod)
├── publish.ps1             # Combined backend+frontend publish to Publish/<stamp>/
└── README.md
```
