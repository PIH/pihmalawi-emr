import { type APIRequestContext, type PlaywrightWorkerArgs, type WorkerFixture } from '@playwright/test';

export const api: WorkerFixture<APIRequestContext, PlaywrightWorkerArgs> = async ({ playwright }, use) => {
  const ctx = await playwright.request.newContext({
    baseURL: `${process.env.E2E_BASE_URL}/ws/rest/v1/`,
    httpCredentials: {
      username: process.env.E2E_USER_ADMIN_USERNAME!,
      password: process.env.E2E_USER_ADMIN_PASSWORD!,
    },
  });

  await use(ctx);
};
