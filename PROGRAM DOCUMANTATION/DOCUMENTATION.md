# Jikon Grill POS System Documentation

Version: 0.1.0  
Last updated: 10 June 2026

## 1. System Overview

Jikon Grill POS is a restaurant and bar point-of-sale system for managing:

- Table, takeaway, and delivery orders
- Kitchen and bar preparation tickets
- Cash, M-Pesa, card, bank, and split payments
- Receipts, refunds, voids, and discounts
- Products, recipes, inventory, suppliers, and expenses
- Staff accounts and role-based access
- Daily closing, sales reports, profit reports, and audit logs
- PostgreSQL database backups and recovery

The application is built with Next.js, TypeScript, Prisma, and PostgreSQL.

## 2. Opening The POS

Open PowerShell in the project folder:

```powershell
cd "C:\Users\ADMIN\OneDrive - SHA\Desktop\JIKON GRILL POS SYSTEM"
```

Start the production POS:

```powershell
npm run pos:start:prod
```

Open the POS on the main computer:

`http://localhost:3000/login`

Other devices on the same local network can use the computer's network address, for example:

`http://192.168.0.107:3000/login`

The network address may change after restarting the router or computer. Windows Firewall must allow the Node.js server before another device can connect.

Stop the POS:

```powershell
npm run pos:stop
```

## 3. Staff Roles

| Role | Main workspace | Main responsibilities |
| --- | --- | --- |
| Owner | `/owner/dashboard` | Full reporting, approvals, audit logs, configuration, and staff oversight |
| Manager | `/dashboard` | Daily operations, staff, inventory, expenses, refunds, discounts, and closing |
| Cashier | `/pos` | Create bills, record payments, print receipts, and request refunds |
| Waiter | `/tables` | Open table orders, send items, and mark ready items served |
| Kitchen | `/kitchen` | View kitchen tickets and mark food items ready |
| Bartender | `/bar` | View bar tickets and mark drink items ready |
| Admin | `/staff` | Staff and system setup access |

Each staff member must use their own login. Never share the Owner account during normal service.

## 4. Normal Service Workflow

### 4.1 Create An Order

1. Sign in as Waiter, Cashier, Manager, or Owner.
2. Open **Tables** for table service or **POS** for a direct bill.
3. Choose a table or service type.
4. Add products and quantities.
5. Add item notes where required.
6. Send the order.

Food items are routed to the Kitchen workspace. Drinks are routed to the Bar workspace.

### 4.2 Prepare And Serve

1. Kitchen staff open **Kitchen** and mark completed food items ready.
2. Bar staff open **Bar** and mark completed drinks ready.
3. Waiter staff open **Orders** or **Tables**.
4. Mark ready items served.

An order containing both food and drinks is not fully ready until both stations complete their items.

### 4.3 Record Payment

1. Open the bill in **POS**.
2. Confirm all products, quantities, discounts, tax, and service charge.
3. Choose the payment method.
4. Enter the approved M-Pesa, card, or bank reference when applicable.
5. Record the payment.
6. Open or print the receipt.

Paid bills are locked to prevent accidental duplicate payments.

Do not store card numbers in the POS. Record only the payment method and approved external reference.

## 5. Refunds, Voids, And Discounts

### Refund

1. Locate the completed sale.
2. Submit a refund request with the amount and reason.
3. An Owner or Manager reviews and approves or rejects the request.

### Void

An Owner or Manager can void an eligible sale. Voiding reverses the related stock deduction and records the action in the audit log.

### Discount

Only an Owner or Manager can apply or approve a discount. Cashiers cannot apply arbitrary discounts.

Always enter a clear reason for refunds, voids, discounts, and stock adjustments.

## 6. Products And Inventory

### Products

Use **Products** to manage:

- Product name and SKU
- Category
- Selling price and cost price
- Kitchen or bar routing
- Active status
- Stock tracking type

### Stock Tracking

- **None:** The product does not reduce inventory.
- **Direct:** A sold product directly reduces its linked stock item.
- **Recipe:** A sold product reduces the ingredients in its recipe.

### Inventory

Use **Inventory** to review:

- Current stock
- Minimum stock
- Cost per unit
- Low-stock alerts

Use **Stock Adjustments** for purchases, wastage, returns, corrections, and transfers. Every adjustment should include an accurate reason.

Physically count stock before opening and regularly compare the count with the POS.

## 7. Suppliers And Expenses

Use **Suppliers** to maintain supplier names and contact details.

Use **Expenses** to record operational costs such as:

- Food and bar purchases
- Utilities
- Payroll
- Rent
- Other business costs

Record expenses on the day they occur so profit reports remain accurate.

## 8. Staff And Passwords

Owner, Manager, and Admin users can access **Staff**.

- Only the Owner can assign Owner or Admin access.
- A Manager cannot update Owner or Admin accounts.
- The only active Owner account cannot be suspended or assigned another role.
- New passwords must contain at least 8 characters.

Initial launch credentials are stored privately in:

`.launch-credentials.txt`

Distribute each password privately, change passwords from the Staff page, and delete the credentials file after distribution.

To generate new secure launch passwords for all seeded accounts:

```powershell
npm run security:rotate-passwords
```

This command immediately replaces the current passwords.

## 9. Restaurant Settings

Open **Settings** to configure:

- Restaurant name
- Receipt subtitle
- Phone number
- Address
- VAT or tax rate
- Default service charge
- Receipt footer

Confirm these values before processing live sales because they affect bills and printed receipts.

## 10. Daily Closing Procedure

At the end of each business day:

1. Confirm all served orders are paid or correctly resolved.
2. Review pending refunds and voids.
3. Count actual cash.
4. Open **Closing**.
5. Compare expected cash with actual cash.
6. Enter any variance explanation.
7. Save the daily closing.
8. Export required sales and profit reports.
9. Create a database backup.

Create the backup with:

```powershell
npm run db:backup
```

Backups are stored in the `backups` folder.

## 11. Reports And Audit Logs

The Owner workspace includes:

- Sales reports
- Profit reports
- Inventory reports
- Refund review
- Audit logs
- CSV exports

Audit logs record important actions such as staff updates, settings changes, approvals, voids, and launch preparation.

## 12. Backup And Recovery

### Create A Backup

```powershell
npm run db:backup
```

Keep recent backups in a second secure location outside the POS computer.

### Restore A Backup

Restoring replaces database information and can destroy newer records. Only restore when necessary.

1. Stop the POS:

```powershell
npm run pos:stop
```

2. Restore the selected backup:

```powershell
npm run db:restore -- -BackupFile "backups\your-backup-file.dump" -Clean -ConfirmText RESTORE
```

3. Start the POS:

```powershell
npm run pos:start:prod
```

4. Verify login, health, inventory, and one complete service workflow.

## 13. Release And Health Checks

Run the complete release check after code or configuration changes:

```powershell
npm run release:check
```

This checks lint, Prisma schema, database migrations, package security, and the production build.

Check the live application and database:

`http://localhost:3000/api/health`

A healthy response reports:

```json
{
  "status": "ok",
  "database": "connected"
}
```

Server logs are stored in:

- `logs/pos-output.log`
- `logs/pos-error.log`

## 14. Initial Launch Commands

The following cleanup command is only for the initial launch before any real sales:

```powershell
npm run data:prepare-launch -- CLEAN
```

It permanently deletes sales, orders, refunds, expenses, closings, suppliers, stock movements, and audit history. It preserves staff accounts, passwords, products, recipes, settings, and inventory definitions.

Never run this command after live operations begin.

Verify the clean launch state:

```powershell
npm run data:verify-launch
```

## 15. Troubleshooting

### Node Or npm Is Not Recognized

Close PowerShell, open a new PowerShell window, and run:

```powershell
node -v
npm -v
```

If the commands still fail, reinstall Node.js and ensure it is added to the Windows PATH.

### PostgreSQL Connection Fails

1. Confirm PostgreSQL is running in Windows Services.
2. Confirm the database name, user, password, host, and port in `.env`.
3. Check:

```powershell
npx prisma migrate status
```

### POS Does Not Open

1. Run:

```powershell
npm run pos:stop
npm run pos:start:prod
```

2. Check `logs/pos-error.log`.
3. Confirm `http://localhost:3000/api/health`.

### Another Device Cannot Connect

1. Confirm both devices are on the same network.
2. Use the POS computer's network address instead of `localhost`.
3. Allow Node.js through Windows Firewall.
4. Confirm the POS computer is awake and the production server is running.

### Login Fails

- Confirm the email and password are correct.
- Confirm the account is active on the Staff page.
- Wait 15 minutes after repeated failed attempts.
- Ask an authorized user to set a new password.

## 16. Environment Configuration

The `.env` file contains private database and session configuration:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/jikon_grill_pos?schema=public"
NEXTAUTH_SECRET="a-long-unique-random-secret"
NEXTAUTH_URL="http://localhost:3000"
```

Never share or commit `.env`, `.launch-credentials.txt`, or database backups to a public repository.

## 17. Command Reference

| Command | Purpose |
| --- | --- |
| `npm run pos:start:prod` | Build and start the production POS |
| `npm run pos:stop` | Stop the POS server |
| `npm run release:check` | Run release verification |
| `npm run db:backup` | Create a PostgreSQL backup |
| `npm run db:restore -- ...` | Restore a selected backup |
| `npm run security:rotate-passwords` | Generate secure seeded-account passwords |
| `npm run data:verify-launch` | Verify the clean initial-launch state |
| `npm run lint` | Run code lint checks |
| `npm run build` | Build the production application |
| `npx prisma migrate status` | Check database migration status |
| `npm run prisma:studio` | Open Prisma database administration UI |

## 18. Daily Safety Rules

1. Every staff member uses their own account.
2. Never store customer card numbers.
3. Record a reason for every refund, void, discount, and stock adjustment.
4. Confirm the daily closing before leaving.
5. Create a database backup every day.
6. Never run the initial launch cleanup after live sales begin.
7. Keep the Owner password and backup files private.

## 19. Complete Project Setup And Delivery Process

This section records the full process followed to prepare the Jikon Grill POS from the initial local setup through the final production launch.

### Phase 1: Prepare The Windows Computer

1. Open Windows PowerShell.
2. Check whether Node.js is available:

```powershell
node -v
npm -v
```

3. If PowerShell reports that `node` is not recognized, install Node.js and open a new PowerShell window.
4. Confirm Node.js works. The launch computer was verified with Node.js `v24.16.0`.
5. Move into the project directory:

```powershell
cd "C:\Users\ADMIN\OneDrive - SHA\Desktop\JIKON GRILL POS SYSTEM"
```

6. Install all project packages:

```powershell
npm install
```

7. Review installation warnings and run a security audit:

```powershell
npm audit
```

The final online audit completed with zero reported vulnerabilities.

### Phase 2: Prepare PostgreSQL

1. Install PostgreSQL and remember the password assigned to the `postgres` database user.
2. Confirm the PostgreSQL Windows service is running.
3. Create the `jikon_grill_pos` database.
4. Copy `.env.example` to `.env`.
5. Set the real PostgreSQL username and password in `DATABASE_URL`.
6. Set a long, random, private `NEXTAUTH_SECRET`.
7. Keep the local application address in `NEXTAUTH_URL`.

Example structure:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/jikon_grill_pos?schema=public"
NEXTAUTH_SECRET="YOUR_LONG_RANDOM_SECRET"
NEXTAUTH_URL="http://localhost:3000"
```

8. Validate the Prisma schema:

```powershell
npx prisma validate
```

9. Confirm all database migrations are applied:

```powershell
npx prisma migrate status
```

The project currently contains these migrations:

1. `20260525071359_init`
2. `20260526185020_add_document_sequences`
3. `20260527095858_add_app_settings`

#### PostgreSQL Password Setup Or Reset

If the PostgreSQL password is known, place it in the `DATABASE_URL` value in `.env`.

If the password must be changed:

1. Open **SQL Shell (psql)** from the Windows Start menu.
2. Connect using the current PostgreSQL administrator password.
3. Run:

```sql
ALTER USER postgres WITH PASSWORD 'YOUR_NEW_STRONG_PASSWORD';
```

4. Update the password inside `DATABASE_URL` in `.env`.
5. Restart the POS.
6. Confirm the connection:

```powershell
npx prisma migrate status
```

Never write the real PostgreSQL password in documentation, chat messages, or public source control.

### Phase 3: Create Starter Records

Run the seed only for a new database:

```powershell
npm run db:seed
```

The seed creates or updates:

- Roles and permissions
- Six required starter staff accounts
- Product categories
- Starter products
- Inventory definitions and opening baseline quantities
- Product recipes
- Tables 1 through 12

The seed is safe against overwriting existing staff passwords and current inventory quantities. Newly created seeded accounts are locked until secure launch passwords are generated:

```powershell
npm run security:rotate-passwords
```

The generated credentials are saved to `.launch-credentials.txt`.

### Phase 4: Review And Improve The User Interface

The interface was reviewed because the original screens appeared too plain and text-heavy. The following operational and visual improvements were completed:

- Added a more useful POS product grid and bill panel
- Made new bills start empty
- Added a clear new-bill action
- Improved table status and open-order totals
- Added summaries and empty states to order views
- Improved kitchen and bar tickets
- Added dark and light modes
- Improved feedback messages and operational states
- Prevented paid bills from accepting duplicate payments
- Kept screens focused on repeated restaurant workflows

### Phase 5: Complete Core Restaurant Workflows

The following functional areas were reviewed, implemented, or corrected:

1. Role-based staff login and workspace routing
2. Table, takeaway, and delivery order creation
3. Product routing to Kitchen and Bar
4. Kitchen and Bar ready-status workflow
5. Waiter served-status workflow
6. Mixed kitchen/bar order completion
7. Payment recording and receipt access
8. Discount permissions
9. Refund request and approval
10. Void processing and inventory reversal
11. Inventory, stock adjustment, supplier, and expense management
12. Staff management
13. Restaurant settings
14. Daily closing
15. Owner reports, CSV exports, and audit logs

### Phase 6: Harden Permissions And Security

The release review identified and fixed important security risks:

- Protected product API access
- Restricted product creation to Owner and Manager
- Restricted discounts to Owner and Manager
- Restricted daily closing to Owner and Manager
- Recorded the actual signed-in user on closing reports
- Added login throttling after repeated failed attempts
- Removed displayed and prefilled demo passwords
- Rejected the old shared `demo-password`
- Rotated all seeded staff passwords to unique random passwords
- Rotated the session secret to invalidate old sessions
- Required a strong production `NEXTAUTH_SECRET`
- Restricted Owner and Admin role assignment to the Owner
- Prevented Managers from updating Owner or Admin accounts
- Prevented suspension or demotion of the only active Owner
- Raised staff password minimum length to 8 characters
- Added audit records for important actions

### Phase 7: Improve Order And Station Rules

Order-state logic was reviewed and corrected:

- Kitchen staff can update only kitchen items.
- Bar staff can update only bar items.
- Waiter and Cashier staff can mark only ready tickets served.
- A mixed order is not marked ready until every required station completes its items.
- The Tables page calculates accurate open-order totals and statuses.
- The Orders page clearly displays the service type and current state.

### Phase 8: Add Production Operations Tooling

PowerShell scripts and npm commands were added for repeatable operations:

- `scripts/start-pos.ps1` builds, launches, logs, and health-checks the POS.
- `scripts/stop-pos.ps1` stops the tracked POS process.
- `scripts/backup-db.ps1` creates PostgreSQL custom-format backups.
- `scripts/restore-db.ps1` performs guarded database restoration.
- `scripts/release-check.ps1` runs the full release gate.
- `scripts/prepare-launch-credentials.ts` rotates seeded passwords.
- `scripts/prepare-launch-data.ts` removes test operations before initial launch.
- `scripts/verify-launch-data.ts` proves the database is launch-clean.

Runtime files and private data were excluded from source control:

- `.env`
- `.launch-credentials.txt`
- `.pos-server.pid`
- `logs/`
- `backups/`

### Phase 9: Test The Complete System

The final service test covered:

- Health endpoint and database connection
- Every launch credential
- Correct landing workspace for all six roles
- Owner, Manager, Cashier, Waiter, Kitchen, and Bartender pages
- Unauthorized access redirects
- Cashier blocked from Owner pages
- Cashier blocked from product creation
- Cashier blocked from arbitrary discounts
- Manager discount creation
- Mixed kitchen/bar service flow
- Payment and receipt workflow
- Refund request and approval
- Void and stock reversal
- Daily closing
- Owner sales and profit CSV exports
- Cashier blocked from Owner exports
- Login throttling
- Logout
- Rejection of the old shared demo password

### Phase 10: Remove Test Data Before Launch

A safety backup was created before removing test transactions.

The guarded launch cleanup was then run:

```powershell
npm run data:prepare-launch -- CLEAN
```

The cleanup removed test:

- Sales and sale items
- Orders and order items
- Payments
- Refunds and discounts
- Stock movements
- Suppliers
- Expenses
- Daily closings
- Document sequences
- Audit logs

It preserved:

- Staff accounts and secure passwords
- Roles and permissions
- Categories and products
- Inventory definitions
- Recipes
- Application settings

It recreated 12 available restaurant tables and restored the starter stock baseline.

The result was verified:

```powershell
npm run data:verify-launch
```

The verified launch state contained zero operational test records, 12 available tables, six required staff accounts, five active starter products, and eight inventory items.

### Phase 11: Run The Final Release Gate

The final release command was:

```powershell
npm run release:check
```

It confirmed:

- ESLint passed
- Prisma schema was valid
- All three migrations were applied
- TypeScript and production build passed
- Application routes built successfully
- Online `npm audit` reported zero vulnerabilities

### Phase 12: Create And Validate The Final Backup

The final clean launch database was backed up:

```powershell
npm run db:backup
```

The final launch backup created on 10 June 2026 was:

`backups\jikon-grill-pos-20260610-000446.dump`

The archive was validated with PostgreSQL restore tooling and contained 131 archive entries.

### Phase 13: Start And Verify Production

Production was started with:

```powershell
npm run pos:start:prod
```

The final live verification confirmed:

- `http://localhost:3000/api/health` reported `ok`
- PostgreSQL reported `connected`
- All six staff roles signed in successfully
- Every role opened the correct workspace
- Unauthenticated POS access redirected to Login
- The old demo password was rejected
- The production error log was empty
- The database remained launch-clean

## 20. Repeatable Fresh Installation Procedure

Use this procedure when installing the POS on a new Windows computer.

1. Install Node.js and PostgreSQL.
2. Copy the complete project folder to the computer.
3. Open PowerShell in the project folder.
4. Run `npm install`.
5. Create the PostgreSQL database.
6. Create `.env` and enter the correct database URL and a strong session secret.
7. Run `npx prisma migrate deploy`.
8. Run `npm run db:seed`.
9. Run `npm run security:rotate-passwords`.
10. Enter real restaurant settings.
11. Confirm and adjust products, recipes, tables, and physical stock.
12. Before any real sales, run `npm run data:prepare-launch -- CLEAN`.
13. Run `npm run data:verify-launch`.
14. Run `npm run release:check`.
15. Run `npm run db:backup`.
16. Run `npm run pos:start:prod`.
17. Complete the service test in `LAUNCH_CHECKLIST.md`.

For the visual system and workflow diagrams, see [PROJECT_FLOWCHART.md](PROJECT_FLOWCHART.md).
