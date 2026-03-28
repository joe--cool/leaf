import { expect, test, type Page, type Response } from '@playwright/test';
import { signInAsAdmin } from './support/session';
const renamedAdmin = 'E2E Admin Renamed';

test.describe.serial('reflection workflow', () => {
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

    await page.getByLabel('Guide mode').selectOption('passive');
    await page.getByLabel('History access').selectOption('full-history');
    await page.getByLabel('Hidden-item boundary').selectOption('show-existence');
    await expectSuccessfulMutation(page, isRelationshipPatch, async () => {
      await page.getByRole('button', { name: 'Save relationship' }).click();
    });
    await expect(page.getByText('Current: passive guide')).toBeVisible();
    await expect(
      page.getByText('Full history. All visible item, reflection, and audit history stays available.').first(),
    ).toBeVisible();

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
  const reviewButton = page.getByRole('button', { name: `Review ${subjectName}` });
  if (await reviewButton.isVisible().catch(() => false)) {
    await reviewButton.click();
  }
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

function isRelationshipPatch(response: Response) {
  return /\/relationships\/guides\/[^/]+$/.test(response.url()) && response.request().method() === 'PATCH';
}
