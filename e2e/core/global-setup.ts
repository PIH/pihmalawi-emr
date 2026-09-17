import { request } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

async function globalSetup() {
  const requestContext = await request.newContext();
  const token = Buffer.from(
    `${process.env.E2E_USER_ADMIN_USERNAME}:${process.env.E2E_USER_ADMIN_PASSWORD}`,
  ).toString('base64');

  const res = await requestContext.post(`${process.env.E2E_BASE_URL}/ws/rest/v1/session`, {
    data: { locale: 'en' },
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${token}`,
    },
  });

  if (!res.ok()) {
    throw new Error(`Global setup login failed: ${res.status()} ${await res.text()}`);
  }

  await requestContext.storageState({ path: 'e2e/storageState.json' });
  await requestContext.dispose();
}

export default globalSetup;
