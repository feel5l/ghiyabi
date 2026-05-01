import { test, expect } from '@playwright/test';

test('shows clear configuration-missing message when Supabase env is unset', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('supabase-config-missing')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'إعدادات غير مكتملة' })).toBeVisible();
});
