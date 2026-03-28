import { expect, test, type Page, type Response } from '@playwright/test';
import { signInAsAdmin } from './support/session';

test.describe.serial('routines flow', () => {
  test('creates a one-time item from the unified flow with keyboard-selectable radios', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/routines');
    await expect(page.getByRole('heading', { name: 'Routines' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Create tracked item' })).toBeVisible();

    const templateRadio = page.getByRole('radio', { name: 'Medication' });
    await expect(templateRadio).toBeChecked();

    const recurringRadio = page.getByRole('radio', { name: 'Recurring item' });
    const oneTimeRadio = page.getByRole('radio', { name: 'One-time item' });
    await recurringRadio.focus();
    await page.keyboard.press('ArrowRight');
    await expect(oneTimeRadio).toBeChecked();

    await page.getByLabel('Item name').fill('Pick up prescription refill');
    await expect(page.getByLabel('When should it happen?')).toHaveValue(/T/);

    await expectSuccessfulMutation(page, isItemCreate, async () => {
      await page.getByRole('button', { name: 'Save item' }).click();
    });

    await expect(page.getByText('Item added')).toBeVisible();
    await expect(page.getByText('Pick up prescription refill')).toBeVisible();
  });

  test('edits an existing seeded item and keeps advanced scheduling visible when required', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/routines');
    await expect(page.getByRole('heading', { name: 'Routines' })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Edit Keep the kitchen reset' })).toBeVisible();
    await page.getByRole('button', { name: 'Edit Keep the kitchen reset' }).click();

    await expect(page.getByRole('heading', { name: 'Edit tracked item' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Advanced options required' })).toBeDisabled();
    await expect(page.getByText('Scheduling details')).toBeVisible();
    await expect(page.getByLabel('Desktop reminders')).toBeChecked();

    const titleField = page.getByLabel('Item name');
    await expect(titleField).toHaveValue('Keep the kitchen reset');
    await titleField.fill('Keep the kitchen reset and sweep');

    await expectSuccessfulMutation(page, isItemUpdate, async () => {
      await page.getByRole('button', { name: 'Save changes' }).click();
    });

    await expect(page.getByText('Item updated')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit Keep the kitchen reset and sweep' })).toBeVisible();
  });
});

async function expectSuccessfulMutation(page: Page, predicate: (response: Response) => boolean, action: () => Promise<void>) {
  const responsePromise = page.waitForResponse(predicate);
  await action();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
}

function isItemCreate(response: Response) {
  return /\/items$/.test(response.url()) && response.request().method() === 'POST';
}

function isItemUpdate(response: Response) {
  return /\/items\/[^/]+$/.test(response.url()) && response.request().method() === 'PUT';
}
