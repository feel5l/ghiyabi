import { test, expect, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@school.test';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'TestPass123!';
const TEACHER_EMAIL = process.env.E2E_TEACHER_EMAIL || 'teacher3a@school.edu';
const TEACHER_PASSWORD = process.env.E2E_TEACHER_PASSWORD || 'TestPass123!';

async function loginWith(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('البريد الإلكتروني').fill(email);
  await page.getByLabel('كلمة المرور').fill(password);
  await page.getByRole('button', { name: /^تسجيل الدخول$/ }).click();
}

async function gotoFirstSession(page: Page) {
  await expect(page.getByRole('heading', { name: 'الرياضيات' }).first()).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole('link', { name: /تسجيل الغياب/ }).first().click();
  await expect(page).toHaveURL(/\/teacher\/session\//, { timeout: 15_000 });
}

function studentRow(page: Page, name: string) {
  return page
    .locator('p.font-semibold', { hasText: name })
    .locator('xpath=ancestor::div[contains(@class,"border-b")][1]');
}

// In several admin forms, <label> has no htmlFor; locate the input/select by the
// label text using a sibling-based xpath. The <label> is inside a wrapper <div>
// that also contains the form control.
function fieldByLabel(page: Page, labelText: string | RegExp, _kind: 'input' | 'select' = 'input') {
  return page.getByLabel(labelText).first();
}

test.describe('Ghiyabi end-to-end', () => {
  test('Login form has bound labels and is keyboard-accessible', async ({ page }) => {
    await page.goto('/login');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.type(TEACHER_EMAIL);
    await page.keyboard.press('Tab');
    await page.keyboard.type('TestPass123!');
    await expect(page.getByLabel('البريد الإلكتروني')).toHaveValue(TEACHER_EMAIL);
    await expect(page.getByLabel('كلمة المرور')).toHaveValue('TestPass123!');
    const emailId = await page.getByLabel('البريد الإلكتروني').getAttribute('id');
    expect(emailId).toBeTruthy();
  });

  test('login screen renders with bound labels and unknown route shows 404', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/غيابي/);
    await expect(page.getByLabel('البريد الإلكتروني')).toBeVisible();
    await expect(page.getByLabel('كلمة المرور')).toBeVisible();

    await page.goto('/this-route-does-not-exist-zzz');
    await expect(page.getByRole('heading', { name: /404 Page Not Found/i })).toBeVisible();
  });

  test('teacher signs in, opens today session, marks attendance, and changes persist after reload', async ({
    page,
  }) => {
    await loginWith(page, TEACHER_EMAIL, TEACHER_PASSWORD);
    await expect(page).toHaveURL(/\/teacher$/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'حصصي اليوم' })).toBeVisible();
    await gotoFirstSession(page);

    const ahmed = studentRow(page, 'أحمد محمد العمري');
    await ahmed.getByRole('button', { name: /غائب/ }).click();
    await expect(ahmed.locator('span', { hasText: 'غائب' }).first()).toBeVisible({ timeout: 10_000 });

    const sara = studentRow(page, 'فاطمة علي الغامدي');
    await sara.getByRole('button', { name: /متأخر/ }).click();
    await expect(sara.locator('span', { hasText: 'متأخر' }).first()).toBeVisible();

    const yousef = studentRow(page, 'محمد سعد القحطاني');
    await yousef.getByRole('button', { name: /معذور/ }).click();
    await expect(yousef.locator('span', { hasText: 'معذور' }).first()).toBeVisible();

    const layla = studentRow(page, 'عبدالله عمر الحربي');
    await expect(layla.locator('span', { hasText: 'حاضر' }).first()).toBeVisible();

    await page.waitForTimeout(1500);

    const url = page.url();
    await page.reload();
    await expect(page).toHaveURL(url);

    await expect(studentRow(page, 'أحمد محمد العمري').locator('span', { hasText: 'غائب' }).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(studentRow(page, 'فاطمة علي الغامدي').locator('span', { hasText: 'متأخر' }).first()).toBeVisible();
    await expect(studentRow(page, 'محمد سعد القحطاني').locator('span', { hasText: 'معذور' }).first()).toBeVisible();
  });

  test('reload on a deep teacher session URL keeps the user on the session page', async ({ page }) => {
    await loginWith(page, TEACHER_EMAIL, TEACHER_PASSWORD);
    await expect(page).toHaveURL(/\/teacher$/, { timeout: 15_000 });
    await gotoFirstSession(page);

    const deepUrl = page.url();
    await page.reload();
    await expect(page).toHaveURL(deepUrl);
    await expect(page.getByRole('link', { name: /رجوع/ })).toBeVisible({ timeout: 15_000 });
  });

  test('admin signs in, sees admin dashboard, and adds a student', async ({ page }) => {
    await loginWith(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /لوحة الإدارة/ })).toBeVisible();

    await page.goto('/admin/students');
    await expect(page.getByRole('heading', { name: 'إدارة الطلاب' })).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: /\+ إضافة طالب/ }).first().click();
    const uniqueName = `طالب اختبار ${Date.now()}`;
    await fieldByLabel(page, 'الاسم الكامل').fill(uniqueName);
    await page.locator('form').getByRole('button', { name: 'حفظ' }).click();

    await expect(page.getByText('تم إضافة الطالب')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(uniqueName, { exact: true }).first()).toBeVisible();
  });

  test('admin can edit and delete a student', async ({ page }) => {
    await loginWith(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 });

    await page.goto('/admin/students');
    await expect(page.getByRole('heading', { name: 'إدارة الطلاب' })).toBeVisible({ timeout: 15_000 });

    const seedName = `طالب للتعديل ${Date.now()}`;
    await page.getByRole('button', { name: /\+ إضافة طالب/ }).first().click();
    await fieldByLabel(page, 'الاسم الكامل').fill(seedName);
    await page.locator('form').getByRole('button', { name: 'حفظ' }).click();
    await expect(page.getByText(seedName, { exact: true }).first()).toBeVisible({ timeout: 10_000 });

    const seedRow = page.locator('tr', { has: page.getByText(seedName, { exact: true }) }).first();
    await seedRow.getByRole('button', { name: 'تعديل' }).click();
    const editedName = `${seedName} (معدل)`;
    await fieldByLabel(page, 'الاسم الكامل').fill(editedName);
    await page.locator('form').getByRole('button', { name: 'حفظ' }).click();
    await expect(page.getByText('تم تحديث بيانات الطالب')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(editedName, { exact: true }).first()).toBeVisible();

    page.once('dialog', (d) => d.accept());
    const editedRow = page.locator('tr', { has: page.getByText(editedName, { exact: true }) }).first();
    await editedRow.getByRole('button', { name: 'حذف' }).click();
    await expect(page.getByText('تم حذف الطالب')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(editedName, { exact: true })).toHaveCount(0);
  });

  test('admin can add a class and a session that shows up for the teacher', async ({ page }) => {
    await loginWith(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 });

    const className = `Class ${Date.now() % 100000}`;

    await page.goto('/admin/classes');
    await expect(page.getByRole('heading', { name: 'إدارة الفصول' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /\+ فصل جديد/ }).click();
    await fieldByLabel(page, 'اسم الفصل').fill(className);
    await fieldByLabel(page, 'بريد المعلم').fill(TEACHER_EMAIL);
    await page.locator('form').getByRole('button', { name: 'حفظ' }).click();
    await expect(page.getByText('تم إضافة الفصل')).toBeVisible({ timeout: 10_000 });

    await page.goto('/admin/sessions');
    await expect(page.getByRole('heading', { name: 'إدارة الحصص' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /\+ حصة جديدة/ }).click();

    const subject = `مادة ${Date.now() % 100000}`;
    const classSelect = fieldByLabel(page, 'الفصل', 'select');
    const optionValue = await classSelect
      .locator(`option:has-text("${className}")`).first().getAttribute('value');
    if (!optionValue) throw new Error(`Class option not found: ${className}`);
    await classSelect.selectOption(optionValue);
    await fieldByLabel(page, 'بريد المعلم').fill(TEACHER_EMAIL);
    await fieldByLabel(page, 'المادة').fill(subject);
    await page.locator('form').getByRole('button', { name: 'حفظ' }).click();
    await expect(page.getByText('تم إضافة الحصة')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(subject, { exact: true }).first()).toBeVisible();

    const adminDashboardLink = page.getByRole('link', { name: /لوحة الإدارة/ }).first();
    if (await adminDashboardLink.isVisible()) {
      await adminDashboardLink.click();
    }
    await page.goto('/admin');
    await page.getByRole('button', { name: 'خروج' }).click();
    await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });

    await loginWith(page, TEACHER_EMAIL, TEACHER_PASSWORD);
    await expect(page).toHaveURL(/\/teacher$/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: subject }).first()).toBeVisible({ timeout: 15_000 });
  });
});
