# Jikon Grill POS Live Demo Deployment Guide

This guide publishes the POS as a live interview demonstration using:

- **Vercel** for the Next.js application
- **Neon PostgreSQL** for a separate cloud demonstration database

Do not connect the live demonstration to the restaurant's local production database.

## Current Live Demonstration

The deployed interview demonstration is available at:

<https://jikon-grill-pos-demo.vercel.app>

It uses a separate Neon demonstration database and the temporary reviewer account.

## 1. Accounts Required

Create free accounts:

1. Vercel: <https://vercel.com/signup>
2. Neon: <https://console.neon.tech/signup>

## 2. Create The Demonstration Database

1. Sign in to Neon.
2. Create a project named `jikon-grill-pos-demo`.
3. Open the project and click **Connect**.
4. Copy both PostgreSQL connection strings:
   - Pooled connection for `DATABASE_URL`
   - Direct connection for `DIRECT_URL`
5. Keep both connection strings private.

The connection string will resemble:

```text
postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
```

## 3. Deploy The Application To Vercel

Open PowerShell in the project folder:

```powershell
cd "C:\Users\ADMIN\OneDrive - SHA\Desktop\JIKON GRILL POS SYSTEM"
```

Run:

```powershell
npx vercel
```

Follow the prompts:

1. Sign in to Vercel.
2. Set up and deploy the current project.
3. Use the default Next.js settings.
4. Name the project `jikon-grill-pos-demo`.

The first deployment may fail until the required environment variables are added. This is expected.

## 4. Add Vercel Environment Variables

In Vercel:

1. Open the `jikon-grill-pos-demo` project.
2. Open **Settings**.
3. Open **Environment Variables**.
4. Add these values for **Production**:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | The private Neon pooled connection string containing `-pooler` |
| `DIRECT_URL` | The private Neon direct connection string without `-pooler` |
| `NEXTAUTH_SECRET` | A new long random secret created only for the cloud demo |
| `NEXTAUTH_URL` | The final Vercel URL, such as `https://jikon-grill-pos-demo.vercel.app` |
| `DEMO_REVIEW_PASSWORD` | A temporary password for the `reviewer` username |
| `DEMO_STAFF_PASSWORD` | One temporary password used by the seven role-demonstration accounts |

Do not copy the local `.env` file to Vercel.

Create a new random session secret in PowerShell:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

## 5. Redeploy And Apply The Database Schema

From the Vercel project dashboard, open **Deployments** and redeploy the latest deployment.

The configured Vercel build command will:

1. Generate Prisma Client.
2. Apply committed Prisma migrations.
3. Seed safe starter configuration and the reviewer account.
4. Build the Next.js application.

## 6. Test The Hosted Demonstration

Open:

```text
https://YOUR-VERCEL-PROJECT.vercel.app/api/health
```

Confirm it reports:

```json
{
  "status": "ok",
  "database": "connected"
}
```

Then test:

1. Reviewer login
2. Owner dashboard
3. Create a table order
4. Kitchen and Bar workflow
5. Payment and receipt
6. Inventory deduction
7. Reports and audit logs

## 7. Share With The Interviewer

Send only:

- Hosted Vercel URL
- Reviewer email
- Temporary reviewer password
- Graphical presentation or documentation link if required

Do not send:

- `.env`
- Local staff credentials
- Database connection strings
- Local database backups

## 8. After The Interview

Suspend the reviewer account or delete the Neon demonstration project.

To suspend the reviewer account while connected to the demo database:

```powershell
$env:DATABASE_URL="YOUR_PRIVATE_NEON_CONNECTION_STRING"
npm run security:remove-reviewer
Remove-Item Env:DATABASE_URL
```

## 9. Deployment Notes

- Vercel environment-variable changes require a redeployment.
- Keep Preview deployments disconnected from the Production database unless a separate preview database is configured.
- The cloud demo database is separate from the local restaurant database.
- The Vercel build uses `prisma migrate deploy`, which is the production migration command.
