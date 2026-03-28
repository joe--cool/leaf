import { test } from '@playwright/test';
import { authStatePath, ensureDemoWorkspace } from './support/session';

test('bootstrap demo workspace and capture authenticated storage state', async ({ page }) => {
  await ensureDemoWorkspace(page);
  await page.context().storageState({ path: authStatePath });
});
