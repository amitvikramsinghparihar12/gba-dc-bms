# 🏛️ GBA Corporation — Detailed Contingent (DC) Bill Management System (DC-BMS)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38b2ac.svg)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-Passed_10%2F10-success.svg)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-Apache--2.0-green.svg)](LICENSE)

An enterprise-grade, high-performance financial management web application built for **Greater Bengaluru Authority (GBA Corporation)**, Government of Karnataka.

This platform replaces legacy no-code departmental workflows with an **ACID-compliant, high-concurrency web application** featuring **multi-level Role-Based Access Control (RBAC)**, **strict Drawing and Disbursing Officer (DDO) budget cap tracking**, **statutory tax and deduction schedules**, and **offline RTGS bank advice generation**.

---

## 📑 Table of Contents
1. [Executive Summary & Problem Statement](#-executive-summary--problem-statement)
2. [System Architecture & Invariant Guarantees](#-system-architecture--invariant-guarantees)
3. [7-Tier Role-Based Access Control (RBAC)](#-7-tier-role-based-access-control-rbac)
4. [Statutory Financial Calculation & Deductions](#-statutory-financial-calculation--deductions)
5. [Automated Verification Suite (10 Vitest Specifications)](#-automated-verification-suite-10-vitest-specifications)
6. [PostgreSQL Production Reference Schema](#-postgresql-production-reference-schema)
7. [Getting Started & Local Setup](#-getting-started--local-setup)
8. [Client & Technical Interview Demo Script](#-client--technical-interview-demo-script)
9. [Technical Interview Deep Dive (FAQs)](#-technical-interview-deep-dive-faqs)

---

## 🎯 Executive Summary & Problem Statement

### The Legacy Problem
Government municipal corporations often manage hundreds of crores across civil works, transport infrastructure, and sanitation. Legacy solutions (spreadsheets or dated no-code databases) suffered from critical failure modes:
1. **Budget Over-commitment / Double-Spending:** Multiple Creators in the same DDO could simultaneously submit bills exceeding the authorized budget ceiling due to lack of write isolation.
2. **Lack of Audit Immutability:** Historical bill modifications and password overrides could be overwritten without forensic trace.
3. **DDO Data Leakage:** Officers in Division A could inspect or alter contracts belonging to Division B.
4. **Manual RTGS Generation:** Bank advice letters had to be manually typed, introducing human errors in IFSC codes, bank account numbers, and amount words.

### The Solution: GBA DC-BMS
- **ACID Transaction Engine:** All mutations are executed through a serialized promise queue with automatic rollback on invariant violations.
- **Strict DDO Data Isolation:** Filtered server-side and client-side; operational roles cannot access cross-division records.
- **Gross-Value Reservation:** Budgets are reserved immediately at bill submission using Gross Value ($Base + CGST + SGST + IGST$), preventing over-commitment.
- **Automated Rejection Refunds:** Rejections release reserved amounts back to the DDO allocation instantly.
- **Dual-Signatory Bank Advice:** Electronic RTGS advices generated in 1-click with Indian numbering words and `@media print` layout.

---

## 🏗️ System Architecture & Invariant Guarantees

```
┌────────────────────────────────────────────────────────────────────────┐
│                        REACT 19 SPA CLIENT SHELL                       │
│  - 7-Role Instant Switcher       - Live Sticky Budget Widget           │
│  - Dynamic Sidebar by Tier       - 16 Statutory Deductions Matrix      │
│  - Read-Only Plain-Text Scrutiny - Print-Ready RTGS Advice Generator   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Async Invocations
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        API LAYER (/src/server/api.ts)                  │
│  - Strict DDO Scope Filtering    - Permission Guard (HTTP 403)         │
│  - GSTIN / IFSC / DDO Validators - Financial Calculations & Net Floor  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   TRANSACTION ENGINE (/src/server/db.ts)               │
│  - Serialized Promise Queue      - Snapshot State Cloning              │
│  - Atomic Rollback on Failure    - Invariant Assertion Verification    │
│  - LocalStorage Durability Sync  - Append-Only Audit Logging           │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Invariants Enforced
| Invariant | Implementation Mechanism | Violation Outcome |
|---|---|---|
| **DDO Cap Adherence** | `grossValue <= alloc.remaining` verified inside transaction | Throws exact message: `"Insufficient DDO Budget Balance."` |
| **Allocation Floor** | DDO allocation cannot be set below currently `utilized` amount | Mutation aborted; error returned to Finance Officer |
| **Macro Department Ceiling** | $\sum \text{DDO Allocations} \le \text{Total Department Grant}$ | Blocked; excess allocation rejected |
| **Single RTGS Batching** | Unique constraint on `bill.rtgsBatchId` | Any bill already batched aborts entire multi-select batch |
| **Strict Read-Only Scrutiny** | Verifier and Approver forms render **plain text only** (no `<input>`) | DOM-level tamper protection; server rejects write attempts |
| **Rejection Budget Release** | On reject or revert, `alloc.utilized = alloc.utilized - grossValue` | Budget restored in real-time |
| **Immutable Audit Ledger** | No update or delete methods exist; append-only storage | Forensic before/after diff preserved forever |

---

## 👥 7-Tier Role-Based Access Control (RBAC)

| Role | Classification | Permissions | Prohibited Actions | Seed Profile |
|---|---|---|---|---|
| **Super Admin** | Administrative | CRUD Departments, DDOs, Vendors; User & DDO mappings; Workflow toggle; Audit logs; Password override | Cannot touch budgets or create/approve bills | Rajesh Rao (`rajesh.admin@...`) |
| **Director of Finance** | Macro Fiscal | Create/update Department Budget Head grants per Financial Year (e.g., FY 2025-26) | Cannot allocate to DDOs or touch bills | Suresh Kumar, IAS (`suresh.df@...`) |
| **Finance Officer** | Level-2 Fiscal | Apportion department grants into DDO caps; Decide DDO budget increase/decrease requests | Cannot create or review bills | Meera Nambiar, KAS (`meera.fo@...`) |
| **Creator** | Operational | Draft, edit, and submit DC bills for **mapped DDO only**; Request budget changes | Cannot verify, approve, or disburse bills | Ramesh Gowda (DDO 100234)<br>Anand Kulkarni (DDO 100567)<br>Sunil Hegde (DDO 100235) |
| **Verifier** | Operational | Scrutinize bills from mapped Creators in **strict read-only mode**; Approve or Reject with remarks | Cannot edit any field; cannot authorize payments | Priya Sharma (`priya.vr@...`) |
| **Approver** | Operational | Sanction verified bills in **strict read-only mode**; Accord sanction or Revert with remarks | Cannot edit fields; cannot batch bank advices | Dr. K. Venkatesh (`k.venkatesh@...`) |
| **RTGS Manager** | Executional | Multi-select approved bills, choose debit corporate account, generate and print RTGS advice | Cannot modify bills or approve sanctions | Sunita Patil (`sunita.rtgs@...`) |

---

## 💰 Statutory Financial Calculation & Deductions

### Calculations Engine (`src/utils/calc.ts`)
$$\text{Gross Value} = \text{Base Value} + \text{CGST} + \text{SGST} + \text{IGST}$$
$$\text{Total Deductions} = \sum_{i=1}^{16} \text{Deduction Head}_i$$
$$\text{Net Payable} = \text{Gross Value} - \text{Total Deductions}$$

> **Constraint:** Net Payable cannot be negative. If deductions exceed gross value, submission is blocked.

### 16 Statutory Deductions Supported
1. Income Tax TDS (u/s 194C / 194J)
2. GST TDS (CGST + SGST @ 2%)
3. Labour Welfare Cess (@ 1%)
4. Security Deposit / Retention Money (@ 5%)
5. Performance Security Recovery
6. Mobilization Advance Recovery
7. Material Issue Recovery (Cement/Steel)
8. Penalty / Liquidated Damages for Delay
9. Royalty on Minerals / Earth / Stone
10. Quality Control Testing Charges
11. Karnataka Stamp Duty Recovery
12. Water & Electricity Consumption Charges
13. Equipment & Machinery Hire Recovery
14. Defect Liability Period Retention
15. Safety Violation Fines
16. Other Statutory Miscellaneous Recovery

### Indian Numbering Format & Words
- Currency formatting conforms to the Indian number system: `₹ 1,25,00,000.00` (Crores and Lakhs).
- Cheque/Advice generation includes automated number-to-words conversion:
  *Example:* `₹ 52,31,000.00` $\rightarrow$ *"Fifty-Two Lakh Thirty-One Thousand Rupees Only"*.

---

## 🧪 Automated Verification Suite (10 Vitest Specifications)

The repository includes a comprehensive unit test suite covering all transactional and statutory constraints (`src/server/__tests__/system.test.ts`):

```bash
npx vitest run
```

```
 ✓ src/server/__tests__/system.test.ts (10 tests) 135ms
   ✓ 1. Gross/Net Calculation: correctly aggregates base + taxes, 16 deductions, blocks negative net
   ✓ 2. GSTIN, IFSC & DDO ID statutory format validation
   ✓ 3. Status lifecycle transition state machine
   ✓ 4. Budget check boundary: gross == remaining passes, gross > remaining fails with exact message
   ✓ 5. Reject releases budget: utilized reduces and remaining increases by grossValue
   ✓ 6. Concurrent submission race: promises serialized and second request rejects if balance insufficient
   ✓ 7. Atomic RTGS batch rollback: invalid bill in selection aborts entire batch with zero changes
   ✓ 8. DDO isolation: Creator 1 cannot view or modify DDO 2 bills
   ✓ 9. Permission denial: Verifier role cannot edit bills (HTTP 403 Forbidden)
   ✓ 10. Finance Officer invariant: cannot reduce DDO allocation below current utilized amount

 Test Files  1 passed (1)
      Tests  10 passed (10)
```

> **In-Browser Testing:** Click the **"Run Vitest Suite"** button in the app's top bar to execute and view all 10 tests live with microsecond execution timing and assertion diagnostics!

---

## 🗄️ PostgreSQL Production Reference Schema

For production deployment with PostgreSQL + Node.js, the database schema and SQL transaction design are defined in [`src/server/postgres_reference.sql`](src/server/postgres_reference.sql).

### Key PostgreSQL Constraints
```sql
-- DDO Allocation Floor & Cap Check
CREATE TABLE ddo_allocations (
    id VARCHAR(64) PRIMARY KEY,
    grant_id VARCHAR(64) NOT NULL REFERENCES budget_grants(id),
    ddo_id VARCHAR(7) NOT NULL UNIQUE REFERENCES ddos(id),
    allocated NUMERIC(16, 2) NOT NULL CHECK (allocated >= 0),
    utilized NUMERIC(16, 2) NOT NULL DEFAULT 0.00 CHECK (utilized >= 0),
    CONSTRAINT chk_utilized_within_cap CHECK (utilized <= allocated)
);

-- Atomic SQL Concurrency Query for Bill Submission
UPDATE ddo_allocations
SET utilized = utilized + :gross_value,
    updated_at = NOW()
WHERE ddo_id = :ddo_id
  AND (allocated - utilized) >= :gross_value;
-- If ROW_COUNT = 0, transaction rolls back with 'Insufficient DDO Budget Balance.'
```

---

## 🚀 Getting Started & Local Setup

### Prerequisites
- Node.js 20+
- npm 9+
- A Supabase project

### Installation & Execution
```bash
npm install
cp .env.example .env.local
```

Fill `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

In the Supabase SQL editor, run `supabase/schema.sql`. Then:

```bash
npm run seed
npm run dev
```

The app runs at http://localhost:3000. Every seeded account signs in with password `Demo@12345`.

```bash
npm test
```

The role switcher signs in as that officer through Supabase Auth. Bill submission reserves gross value with an atomic database update, rejection releases it in the same transaction, and RTGS advice generation commits the whole batch or none of it.

---

## 🎭 Client & Technical Interview Demo Script

Use this 5-minute walkthrough to demonstrate end-to-end functionality to clients or technical interviewers:

### Step 1: Macro Budget Grant Setup (Director of Finance)
1. Switch role to **Director of Finance**.
2. Navigate to **Budget Head Master**.
3. View the **₹10 Crore** grant for Transport and **₹25 Crore** for Engineering.
4. Explain how macro grants cap total municipal liability for FY 2025-26.

### Step 2: DDO Budget Apportionment (Finance Officer)
1. Switch role to **Finance Officer**.
2. Navigate to **DDO Budget Caps**.
3. Point out DDO `100235` (Electric Bus Depot): Allocated ₹2 Cr, Utilized ₹1.945 Cr, **Remaining ₹5.50 Lakhs**.
4. Demonstrate the allocation floor rule: Try reducing an allocation below its utilized amount to showcase the validation error.

### Step 3: Bill Creation & Budget Boundary Block (Creator)
1. Switch role to **Creator** $\rightarrow$ select profile **Sunil Hegde (DDO 100235)**.
2. Click **Create New DC Bill**.
3. Enter Base Value `₹6,00,000` (Gross with 18% GST = `₹7,08,000`).
4. Watch the **Sticky Budget Widget** turn red with the exact message:  
   `"Insufficient DDO Budget Balance."`
5. The **Submit for Verification** button is disabled.
6. Now reduce Base Value to `₹3,00,000` (Gross = `₹3,54,000`).
7. Watch the widget turn green $\rightarrow$ Click **Submit for Verification**.
8. Notice that the DDO budget utilized balance increases immediately.

### Step 4: Strict Read-Only Verification (Verifier)
1. Switch role to **Verifier (Priya Sharma)**.
2. Navigate to **Verification Queue**.
3. Click **Scrutinize & Review** on the newly submitted bill.
4. Point out that **all fields are plain text (zero input fields)** to prevent unauthorized modification.
5. Demonstrate **Rejection Budget Release**: Reject a bill with mandatory remarks $\rightarrow$ show that the reserved budget is immediately released back to the DDO.
6. Approve another bill to forward it to the Approver.

### Step 5: Sanction Accordance (Approver)
1. Switch role to **Approver (Dr. K. Venkatesh)**.
2. Review the verified bill in read-only mode.
3. Click **Sanction & Release for RTGS** $\rightarrow$ Bill transitions to `Pending RTGS`.

### Step 6: Batch Generation & Bank Letter Printing (RTGS Manager)
1. Switch role to **RTGS Manager (Sunita Patil)**.
2. View the table of `Pending RTGS` bills.
3. Select multiple bills $\rightarrow$ watch the **Running Total Net Payable** update live in the header bar.
4. Select Corporate Debit Account (**Canara Bank Treasury Account**).
5. Click **Generate RTGS Advice**.
6. The print-ready **GBA Corporation Bank Advice Letter** opens with:
   - Official municipal letterhead
   - Beneficiary table (Vendor, Bank, Account, IFSC, Bill IDs, Net Amount)
   - Amount in figures and words (*Indian numbering system*)
   - Dual-signatory blocks (Senior Accounts Officer & Finance Controller)
   - Click **Print / Save as PDF** to show `@media print` fidelity.

### Step 7: Immutable Audit Trail (Super Admin)
1. Switch role to **Super Admin (Rajesh Rao)**.
2. Navigate to **Immutable Audit Log**.
3. Inspect the before/after JSON diff of each action.
4. Click **Export CSV** to demonstrate regulatory compliance.

---

## 💡 Technical Interview Deep Dive (FAQs)

**Q1: How does the application prevent double-spending in a multi-user environment?**  
*Answer:* In `/src/server/db.ts`, writes pass through a serialized mutation queue (`Promise` chain). State is deep-cloned for transaction isolation. The balance invariant `(allocated - utilized >= grossValue)` is re-evaluated inside the transaction right before committing. In PostgreSQL, this is enforced atomically using `UPDATE ... SET utilized = utilized + :gross WHERE (allocated - utilized) >= :gross`.

**Q2: Why reserve Gross Value rather than Net Payable?**  
*Answer:* Municipal accounting rules dictate that statutory deductions (TDS, GST TDS, Labour Cess, Security Deposit) are liabilities that the corporation must remit to tax and statutory authorities on behalf of the contractor. Therefore, the corporation's committed budget liability is the **Gross Value**.

**Q3: How is strict DDO isolation enforced?**  
*Answer:* Creators, Verifiers, and Approvers have mapped `ddoIds` in their profile. All query functions (`getBills`, `getBillById`, `getDdoAllocations`) enforce strict filtering. Cross-DDO write attempts are rejected with a 403 Forbidden error.

**Q4: How does the RTGS batch transaction maintain atomicity?**  
*Answer:* If any selected bill has already been batched or is not in `Pending RTGS` status, the batch generator aborts and rolls back the entire transaction. No bill is partially updated to `Paid`.

---

## 📜 License
Licensed under the [Apache License, Version 2.0](LICENSE).  
Copyright © 2026 Greater Bengaluru Authority (GBA Corporation).
