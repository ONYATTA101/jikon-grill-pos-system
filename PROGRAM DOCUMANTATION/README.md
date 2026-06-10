# Jikon Grill POS System

Restaurant and bar point-of-sale system built with Next.js, TypeScript, Prisma, and PostgreSQL.

Detailed operating, administration, setup, and delivery instructions are available in [DOCUMENTATION.md](DOCUMENTATION.md).

Project architecture and workflow diagrams are available in [PROJECT_FLOWCHART.md](PROJECT_FLOWCHART.md).

The complete request, response, change, and reasoning record is available in [ALL PROMPTS PROCESSED.md](ALL%20PROMPTS%20PROCESSED.md).

The interactive graphical system and data-transfer presentation is available in [SYSTEM GRAPHICAL PRESENTATION.html](SYSTEM%20GRAPHICAL%20PRESENTATION.html).

A static first-page preview is available in [SYSTEM GRAPHICAL PRESENTATION PREVIEW.png](SYSTEM%20GRAPHICAL%20PRESENTATION%20PREVIEW.png).

Instructions for publishing a live interview demo are available in [LIVE DEMO DEPLOYMENT GUIDE.md](LIVE%20DEMO%20DEPLOYMENT%20GUIDE.md).

## Included Workflows

- Role-based staff login and protected workspaces
- Table, takeaway, and delivery orders
- Kitchen and bar tickets with ready/served workflow
- Cash, M-Pesa, card, bank, and split payment recording
- Receipts, refunds, voids, stock reversal, and audit logs
- Inventory, stock adjustments, suppliers, expenses, and staff management
- Owner sales, profit, inventory, refund, audit, and report views
- Daily closing, CSV exports, dark/light mode, backups, and restore tooling

## Daily Start

Open PowerShell in the project folder and run:

```powershell
npm run pos:start:prod
```

The command builds the production app, verifies the database connection, starts the server, and opens:

`http://localhost:3000/login`

Stop the POS with:

```powershell
npm run pos:stop
```

## Release Check

Before launch or after code changes:

```powershell
npm run release:check
```

This validates configuration, lint, Prisma schema and migrations, package security, and the production build.

## Initial Launch Data

Only before the restaurant begins using the POS, remove test transactions and restore the starter stock baseline:

```powershell
npm run data:prepare-launch -- CLEAN
npm run data:verify-launch
```

This is destructive to sales, orders, refunds, expenses, closings, suppliers, and audit history. Never run it after live operations begin. Staff accounts, passwords, menu products, recipes, settings, and inventory definitions are preserved.

## Database Backup

Create a PostgreSQL backup at the end of every business day:

```powershell
npm run db:backup
```

Backups are written to `backups/`.

Restore is destructive. Stop the POS first, then run:

```powershell
npm run db:restore -- -BackupFile "backups\your-backup-file.dump" -Clean -ConfirmText RESTORE
```

## Initial Staff Accounts

Seeded staff emails:

| Role | Email |
| --- | --- |
| Owner | owner@jikongrill.com |
| Manager | manager@jikongrill.com |
| Cashier | cashier@jikongrill.com |
| Waiter | waiter@jikongrill.com |
| Kitchen | kitchen@jikongrill.com |
| Bartender | bar@jikongrill.com |

Newly seeded accounts are locked until `npm run security:rotate-passwords` is run. Private launch passwords are then stored in `.launch-credentials.txt`; distribute them privately and delete the file afterward.

## Launch Requirements

1. Run `npm run release:check`.
2. Run `npm run db:backup`.
3. Start with `npm run pos:start:prod`.
4. Distribute the private launch passwords and have staff change them after first sign-in.
5. Enter the real restaurant details, tax, and service charge on Settings.
6. Confirm products, prices, recipes, inventory quantities, and tables.
7. Complete one test order through kitchen/bar, payment, receipt, refund, void, and closing.

## Payment Safety

Do not store card numbers in this system. Record only the payment method and approved external payment reference.
