import { expect, type Page } from '@playwright/test';

export const adminEmail = 'e2e-admin@example.com';
export const adminPassword = 'changeme123';
export const authStatePath = 'test-results/.auth/admin.json';

export async function waitForAuthState(page: Page): Promise<'setup' | 'login' | 'authenticated'> {
  const setupHeading = page.getByRole('heading', { name: 'Create your workspace' });
  const loginEmail = page.locator('#login-email');
  const accountMenu = page.getByRole('button', { name: 'Open account menu' });

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await accountMenu.isVisible().catch(() => false)) return 'authenticated';
    if (await setupHeading.isVisible().catch(() => false)) return 'setup';
    if (await loginEmail.isVisible().catch(() => false)) return 'login';
    await page.waitForTimeout(250);
  }

  throw new Error('Auth state did not settle into setup, login, or authenticated shell');
}

export async function ensureDemoWorkspace(page: Page) {
  await page.goto('/dashboard');

  const authState = await waitForAuthState(page);

  if (authState === 'setup') {
    await page.locator('#setup-name').fill('E2E Admin');
    await page.locator('#setup-email').fill(adminEmail);
    await page.locator('#setup-password').fill(adminPassword);

    const demoMode = page.getByRole('checkbox', { name: 'Enable demo mode' });
    await demoMode.focus();
    await page.keyboard.press('Space');
    await expect(demoMode).toBeChecked();

    const setupResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/setup/first-admin') &&
        response.request().method() === 'POST' &&
        response.status() === 200,
    );
    await page.getByRole('button', { name: 'Create Workspace' }).click();
    await setupResponse;
  } else if (authState === 'authenticated') {
    return;
  } else {
    await signInAsAdmin(page);
    return;
  }

  await expect(page.getByRole('button', { name: 'Open account menu' })).toBeVisible();
}

export async function signInAsAdmin(page: Page) {
  await page.goto('/dashboard');
  const authState = await waitForAuthState(page);
  if (authState === 'authenticated') {
    return;
  }
  if (authState === 'setup') {
    await ensureDemoWorkspace(page);
    return;
  }

  const emailField = page.locator('#login-email');
  await expect(emailField).toBeVisible();
  await emailField.fill(adminEmail);
  const passwordField = page.locator('#login-password');
  await passwordField.fill(adminPassword);
  const loginResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/auth/login') &&
      response.request().method() === 'POST' &&
      response.status() === 200,
  );
  await passwordField.press('Enter');
  await loginResponse;
  await expect(page.getByRole('button', { name: 'Open account menu' })).toBeVisible();
}
