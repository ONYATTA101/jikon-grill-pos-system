# Jikon Grill POS Launch Checklist

## Before Opening

- [ ] Run `npm run release:check`
- [ ] Run `npm run db:backup`
- [ ] Before any live sales, run `npm run data:prepare-launch -- CLEAN` once to remove test transactions
- [ ] Confirm the clean state with `npm run data:verify-launch`
- [ ] Start the production POS with `npm run pos:start:prod`
- [ ] Confirm `http://localhost:3000/api/health` reports a connected database
- [ ] Change all seeded staff passwords from the Staff page
- [ ] Confirm restaurant name, phone, address, receipt footer, tax, and service charge
- [ ] Confirm menu products, prices, kitchen/bar routing, recipes, and stock
- [ ] Confirm restaurant tables and staff roles

## Service Test

- [ ] Waiter creates a mixed kitchen/bar table order
- [ ] Kitchen marks food ready
- [ ] Bar marks drinks ready
- [ ] Waiter marks ready tickets served
- [ ] Cashier records payment and opens receipt
- [ ] Owner/manager tests refund approval
- [ ] Owner/manager tests void and stock reversal
- [ ] Manager saves daily closing
- [ ] Owner downloads sales and profit CSV files

## Daily Operations

Never run `npm run data:prepare-launch -- CLEAN` after live operations begin.

- [ ] Start with `npm run pos:start:prod`
- [ ] Check low-stock alerts
- [ ] Complete daily closing
- [ ] Create a database backup with `npm run db:backup`
- [ ] Stop with `npm run pos:stop`

## Emergency Recovery

1. Stop the POS with `npm run pos:stop`.
2. Locate the latest valid file in `backups/`.
3. Restore only when required:

```powershell
npm run db:restore -- -BackupFile "backups\your-backup-file.dump" -Clean -ConfirmText RESTORE
```

4. Start the POS and repeat the service test.
