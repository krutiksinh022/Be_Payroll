# BE Payroll

A NestJS backend for payroll and employee management.

## Features

- JWT-based authentication
- User and role management
- Employee listing API
- Automatic admin seeding on startup

## Prerequisites

- Node.js 18+
- PostgreSQL database
- npm

## Environment setup

1. Copy the example environment file:
   ```bash
   copy .env.example .env
   ```
2. Update the values in .env for your local database and JWT secrets.

## Run locally

```bash
npm install
npm run start:dev
```

The app will start and automatically create an admin user if one does not already exist.

### Default seeded admin

- Email: admin@yopmail.com
- Password: Admin@123456
- Name: Admin
- User type: Admin

You can override the seed values with these environment variables:

```env
SEED_ADMIN_EMAIL=admin@yopmail.com
SEED_ADMIN_PASSWORD=Admin@123456
SEED_ADMIN_NAME=Admin
```

## Build

```bash
npm run build
```

## Test

```bash
npm run test
```
