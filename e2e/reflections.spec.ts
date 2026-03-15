import { expect, test, type Page, type Response } from '@playwright/test';

const adminEmail = 'e2e-admin@example.com';
const adminPassword = 'changeme123';
const renamedAdmin = 'E2E Admin Renamed';

test.describe.serial('reflection workflow', () => {
  test('bootstraps the demo workspace', async ({ page }) => {
    await bootstrapDemoWorkspace(page);
  });

  test('creates scheduled and impromptu reflections and saves prompt and summary changes', async ({
    page,
  }) => {
    await signInAsAdmin(page);

    await openMembers(page);
    await openReflectionFor(page, 'Jordan Ellis');
    await expect(page.getByRole('heading', { name: 'Scheduled Look Back for Jordan Ellis' })).toBeVisible();

    await updateWritingPrompt(
      page,
      'Jordan Ellis',
      'What regained momentum, what still dragged, and what support should change next?',
    );

    await createReflection(page);
    await updateSummary(
      page,
      'Jordan settled into a clearer after-school routine and wants to keep the shorter sessions.',
    );

    await openMembers(page);
    await openReflectionFor(page, 'Jordan Ellis');
    await expect(page.getByRole('heading', { name: 'Impromptu Reflection for Jordan Ellis' })).toBeVisible();

    await chooseImpromptuRange(page);
    await createReflection(page);
    await expect(
      page.getByRole('heading', { name: 'Impromptu Reflection · Jordan Ellis', exact: true }).first(),
    ).toBeVisible();
  });

  test('saves profile changes immediately without a full-session refresh path', async ({ page }) => {
    await signInAsAdmin(page);

    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: 'Profile & Relationships' })).toBeVisible();

    await page.getByLabel('Name').fill(renamedAdmin);
    await expectSuccessfulMutation(page, isPreferencesPatch, async () => {
      await page.getByRole('button', { name: 'Save Profile' }).click();
    });

    await page.getByRole('button', { name: 'Open account menu' }).click();
    await expect(page.getByTestId('account-menu')).toContainText(renamedAdmin);

    await page.getByTestId('account-menu-item-preferences').click();
    await page.getByLabel('Cadence').selectOption('monthly');
    await expectSuccessfulMutation(page, isPreferencesPatch, async () => {
      await page.getByRole('button', { name: 'Save Looking Back Schedule' }).click();
    });

    await page.goto('/my-items');
    await page.getByRole('link', { name: 'Open reflection for myself' }).click();
    await expect(
      page.getByRole('heading', { name: /^(Scheduled Look Back|Impromptu Reflection) for Myself$/ }),
    ).toBeVisible();
    await createReflection(page);
    await expect(page.getByText(new RegExp(`Created by ${renamedAdmin}`))).toBeVisible();
    await expect(page.getByLabel(/Summary for /)).toBeVisible();
  });
});

async function ensureDemoWorkspace(page: Page) {
  await page.goto('/dashboard');

  const authState = await waitForAuthState(page);

  if (authState === 'setup') {
    await page.locator('#setup-name').fill('E2E Admin');
    await page.locator('#setup-email').fill(adminEmail);
    await page.locator('#setup-password').fill(adminPassword);
    await page.getByText('Enable demo mode').click();
    await expect(page.getByRole('checkbox', { name: 'Enable demo mode' })).toBeChecked();
    await page.getByRole('button', { name: 'Create Workspace' }).click();
  } else if (authState === 'authenticated') {
    return;
  } else {
    await signInAsAdmin(page);
  }

  await expect(page.getByRole('button', { name: 'Open account menu' })).toBeVisible();
}

async function bootstrapDemoWorkspace(page: Page) {
  await ensureDemoWorkspace(page);
}

async function signInAsAdmin(page: Page) {
  await page.goto('/dashboard');
  const authState = await waitForAuthState(page);
  if (authState === 'authenticated') {
    return;
  }

  const emailField = page.locator('#login-email');
  await expect(emailField).toBeVisible();
  await emailField.fill(adminEmail);
  const passwordField = page.locator('#login-password');
  await passwordField.fill(adminPassword);
  await passwordField.press('Enter');
  await expect(page.getByRole('button', { name: 'Open account menu' })).toBeVisible();
}

async function waitForAuthState(page: Page): Promise<'setup' | 'login' | 'authenticated'> {
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

async function openMembers(page: Page) {
  const openMembersLink = page.getByRole('link', { name: 'Open Members' }).first();
  if (await openMembersLink.isVisible().catch(() => false)) {
    await openMembersLink.click();
  } else {
    await page.getByRole('link', { name: 'Members', exact: true }).click();
  }
  await page.waitForURL('**/members');
  await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
}

async function openReflectionFor(page: Page, subjectName: string) {
  await page.getByRole('link', { name: `Open reflection for ${subjectName}` }).click();
}

async function updateWritingPrompt(page: Page, subjectName: string, prompt: string) {
  await page.getByRole('button', { name: 'Edit Writing Prompt' }).click();
  const promptDialog = page.getByRole('dialog', { name: 'Edit Writing Prompt' });
  await expect(promptDialog).toBeVisible();
  await page.getByLabel(`Writing prompt for ${subjectName}`).fill(prompt);
  await expectSuccessfulMutation(page, isPreferencesPatch, async () => {
    await page.getByRole('button', { name: 'Save Prompt' }).click();
  });
  await expect(promptDialog).toBeHidden();
  await expect(page.getByText(prompt)).toBeVisible();
}

async function chooseImpromptuRange(page: Page) {
  await page.getByRole('button', { name: 'Choose Date Range' }).click();
  const rangeDialog = page.getByRole('dialog', { name: 'Choose Date Range' });
  await expect(rangeDialog).toBeVisible();
  const selectableDays = page.locator('.leaf-calendar-popup .rdp-day_button:not([disabled])');
  await selectableDays.nth(8).click();
  await selectableDays.nth(11).click();
  await page.getByRole('button', { name: 'Use Range' }).click();
  await expect(rangeDialog).toBeHidden();
}

async function createReflection(page: Page) {
  await expectSuccessfulMutation(page, isRetrospectiveCreate, async () => {
    await page.getByRole('button', { name: 'Create Reflection' }).click();
  });
  await page.waitForURL(/\/retrospectives\/[^/]+$/);
  await expect(page.getByLabel(/Summary for /)).toBeVisible();
}

async function updateSummary(page: Page, value: string) {
  const summaryField = page.getByLabel(/Summary for /);
  await summaryField.fill(value);
  await expectSuccessfulMutation(page, isRetrospectivePatch, async () => {
    await page.getByRole('button', { name: 'Save Summary' }).click();
  });
  await expect(summaryField).toHaveValue(value);
}

async function expectSuccessfulMutation(page: Page, predicate: (response: Response) => boolean, action: () => Promise<void>) {
  const responsePromise = page.waitForResponse(predicate);
  await action();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
}

function isPreferencesPatch(response: Response) {
  return response.url().includes('/me/preferences') && response.request().method() === 'PATCH';
}

function isRetrospectiveCreate(response: Response) {
  return response.url().includes('/retrospectives') && response.request().method() === 'POST';
}

function isRetrospectivePatch(response: Response) {
  return /\/retrospectives\/[^/]+$/.test(response.url()) && response.request().method() === 'PATCH';
}
