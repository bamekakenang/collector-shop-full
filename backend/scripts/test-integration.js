#!/usr/bin/env node

/*
 * Integration tests (API + DB) without a full test runner.
 * This is intentionally simple for CI pipelines and educational demos.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const bcrypt = require('bcryptjs');
const request = require('supertest');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const backendRoot = path.resolve(__dirname, '..');

function run(cmd) {
  execSync(cmd, {
    cwd: backendRoot,
    stdio: 'inherit',
    env: process.env,
  });
}

async function main() {
  // Use a temporary SQLite DB so the integration test is isolated
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'collector-backend-it-'));
  const dbPath = path.join(tmpDir, 'test.db');

  // Prisma accepts absolute paths with the sqlite "file:" scheme
  process.env.DATABASE_URL = `file:${dbPath}`;

  console.log(`Integration tests using DATABASE_URL=${process.env.DATABASE_URL}`);

  // Apply migrations on the temp database
  run('npx prisma migrate deploy');

  // Import after DATABASE_URL is set so Prisma uses the right DB
  // eslint-disable-next-line global-require
  const { app } = require('../src/server');
  // eslint-disable-next-line global-require
  const { prisma } = require('../src/prisma');

  // Create an active admin account directly in DB (simplifies auth flow for tests)
  const adminEmail = 'admin@test.local';
  const adminPassword = 'Admin!234';
  const adminHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.create({
    data: {
      name: 'Admin',
      email: adminEmail,
      password: adminHash,
      role: 'ADMIN',
      active: true,
    },
  });

  // Health check
  const healthRes = await request(app).get('/api/health').expect(200);
  if (!healthRes.body || healthRes.body.status !== 'ok') {
    throw new Error('Health check failed');
  }

  // Register a buyer (account should be inactive by policy)
  const buyerEmail = 'buyer@test.local';
  const buyerPassword = 'Buyer!234';

  await request(app)
    .post('/api/auth/register')
    .send({ name: 'Buyer', email: buyerEmail, password: buyerPassword })
    .expect(201);

  // Login should be forbidden until admin approval
  await request(app)
    .post('/api/auth/login')
    .send({ email: buyerEmail, password: buyerPassword })
    .expect(403);

  // Admin can login
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: adminEmail, password: adminPassword })
    .expect(200);

  const token = loginRes.body && loginRes.body.token;
  if (!token) {
    throw new Error('Missing JWT token for admin login');
  }

  // Admin-only endpoint
  const usersRes = await request(app)
    .get('/api/admin/users')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  if (typeof usersRes.body?.total !== 'number' || !Array.isArray(usersRes.body?.items)) {
    throw new Error('Unexpected response shape from /api/admin/users');
  }

  await prisma.$disconnect();

  // Cleanup temp DB folder (best-effort)
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // ignore
  }

  console.log('Integration tests: OK');
}

main().catch(async (err) => {
  console.error(err);
  try {
    // eslint-disable-next-line global-require
    const { prisma } = require('../src/prisma');
    await prisma.$disconnect();
  } catch {
    // ignore
  }
  process.exitCode = 1;
});
