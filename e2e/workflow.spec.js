import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('register, persist the session, manage a reading, review reports, and log out', async ({
  page,
}) => {
  await page.goto('/register');
  await page.getByLabel('Name').fill('Browser Test');
  await page.getByLabel('Email').fill(`browser-${randomUUID()}@example.com`);
  await page.getByLabel('Password').fill('BrowserTest!2026');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Welcome, Browser.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Add reading', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Save reading' }).click();
  await expect(dialog.getByRole('alert')).toHaveText(
    'Please enter a glucose value.',
  );
  await dialog.getByLabel('Glucose value').fill('111');
  await dialog.getByRole('button', { name: 'Save reading' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Reading added.' }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Manage readings' }).click();
  await page.getByRole('button', { name: 'Edit Morning (fasting)' }).click();
  await dialog.getByLabel('Glucose value').fill('125');
  await dialog.getByRole('button', { name: 'Save reading' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Reading updated.' }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Reports', exact: true }).click();
  await expect(page.getByText('125.0')).toBeVisible();
  await page.getByRole('button', { name: 'Month to date' }).click();
  await expect(page.getByText('125.0')).toBeVisible();
  await page.getByRole('button', { name: 'Previous month' }).click();
  await expect(
    page.getByText('No readings recorded in this period.'),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Readings', exact: true }).click();
  await page.getByRole('button', { name: 'Delete Morning (fasting)' }).click();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'Delete Morning (fasting)' }).click();
  await dialog.getByRole('button', { name: 'Delete reading' }).click();
  await expect(
    page.getByText('No readings recorded for this date.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/reports');
  await expect(page).toHaveURL(/\/login$/);
});

test('capture the seeded desktop and mobile views', async ({ page }) => {
  test.skip(
    process.env.SWEETY_CAPTURE !== '1',
    'Set SWEETY_CAPTURE=1 after running the demo seed.',
  );
  await mkdir('screenshots', { recursive: true });
  await page.goto('/login');
  await page.getByLabel('Email').fill('demo@sweety.example');
  await page.getByLabel('Password').fill('SweetyDemo!2026');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByText('3 of 4 recorded')).toBeVisible();
  await page.screenshot({ path: 'screenshots/dashboard.png', fullPage: true });

  await page.getByRole('link', { name: 'View reports' }).click();
  await page.getByRole('button', { name: 'Previous month' }).click();
  await expect(page.getByText('Average')).toBeVisible();
  await page.screenshot({ path: 'screenshots/reports.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('link', { name: 'Overview' }).click();
  await expect(page.getByText('3 of 4 recorded')).toBeVisible();
  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(viewport.content).toBeLessThanOrEqual(viewport.width);
  await page.screenshot({ path: 'screenshots/mobile.png', fullPage: true });
});
