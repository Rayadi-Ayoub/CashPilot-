# CashPilot

CashPilot is a simple React/Next.js application for a small company's real cash balance, customer invoices, expenses, forecasts and isolated what-if scenarios. Amounts are shown in Tunisian dinars (DT/TND).

## Requirements

- Windows with PowerShell
- Node.js 22 or newer
- npm 10 or newer

No external database server is needed. Prisma stores persistent data in SQLite at `prisma/dev.db`.

## Installation (PowerShell)

```powershell
npm install
Copy-Item .env.example .env
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open **http://localhost:3000** and sign in with a demo account below.

To create an empty company instead of using demo data, skip `npm run db:seed`, open `/register`, and enter the company and its opening cash balance.

## Configuration

`.env` is local and is not committed. It contains one setting:

```dotenv
DATABASE_URL="file:./dev.db"
```

The SQLite path is relative to `prisma/schema.prisma`. Keep the default value for local development. Uploaded receipts are stored outside the public folder in `data/uploads/` and are downloaded only after an authorization check.

## Demo accounts

All demo accounts use the password **`demo1234`** and belong to **CashPilot Demo SARL**.

| Role | Email | Main permissions |
|---|---|---|
| Owner | `owner@cashpilot.demo` | Indicators, all financial pages, member management, expense approval |
| Financial manager | `manager@cashpilot.demo` | Contacts, invoices, payments, expenses, forecasts and simulations |
| Collaborator | `collaborator@cashpilot.demo` | Submit expenses and view only their own requests |

Run `npm run db:seed` again to reset the demo company and its records. Do not use these accounts or passwords in production.

The demo includes a 3,000 DT invoice with a 1,000 DT partial payment, an overdue invoice, paid/approved/pending/refused expenses, and a saved 20-day customer-delay scenario. Dates are generated relative to the seeding day so the presentation remains reproducible.

## Presentation walkthrough

1. Sign in as the owner and note the opening balance of 5,000 DT.
2. Open **Invoices** and create a draft for a client; open it, validate it, then use **Export PDF**.
3. Open **Customer payments** or the invoice and record a partial payment. Check that the remaining amount decreases. An amount above the remainder is rejected.
4. Sign in as the collaborator and submit an expense with a PDF or image receipt.
5. Sign in as the owner, open **Expenses**, and approve or refuse the request. An approved expense can then be marked paid by the owner or manager; a refused expense cannot.
6. Open **Cash balance** to see realized movements. Opening-balance corrections use a separate, reasoned adjustment instead of rewriting history.
7. Open **Cash forecasts** for the 30/60/90-day projections and their dated assumptions.
8. Open **What-if simulation**, delay an unpaid customer invoice, and optionally add virtual income or an expense. Compare the initial and simulated lines and balances. No real transaction changes.
9. Return to **Overview** for overdue invoices, expenses awaiting approval and negative-forecast alerts.

## Main commands

```powershell
npm run dev          # Development server
npm run typecheck    # TypeScript validation
npm run build        # Production build
npm run start        # Production server, after build
npm run db:seed      # Reset the local demo dataset
npx prisma studio    # Inspect the local database
```

For a new installation or deployment, apply migrations with `npx prisma migrate deploy` before starting the application.

## How the calculations work

- **Invoice remainder** = invoice total − all recorded payments.
- **Real cash** = initial balance + customer payments − paid expenses + traceable cash adjustments.
- **Forecast at a date** = real reference balance + remaining customer receipts expected by that date − approved unpaid expenses expected by that date.
- Received payments are not forecast again: only the unpaid remainder of each validated invoice is used.
- Draft/cancelled invoices and pending/refused/paid expenses do not create future forecast flows. Overdue amounts are expected from today.
- Simulations reuse the same projection function with copied flows and separate assumptions. They never insert payments or expenses and never update invoices.
- Prisma `Decimal` values and two-decimal input validation avoid floating-point rounding errors.

Validated financial operations are preserved rather than edited or deleted. Invoice cancellation records a reason and is blocked after payments; expense decisions and payments record the user and date; cash corrections create a new adjustment.

## Project structure

```text
app/                 Next.js pages and protected receipt/PDF routes
components/          Shared layout, forms, badges and projection chart
lib/actions/         Server Actions for validated writes
lib/                 Authentication, decimal money, cash and forecast engines
prisma/              SQLite schema, migrations and demo seed
data/uploads/        Local protected receipts (not committed)
```

Every company-scoped query begins with the signed-in user's active company membership. Collaborators additionally receive only their own expense records. Server Actions repeat permission checks so hiding navigation links is not the only protection.
