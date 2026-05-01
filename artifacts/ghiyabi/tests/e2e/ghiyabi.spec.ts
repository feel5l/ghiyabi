import { test, expect, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@school.test';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'TestPass123!';
const TEACHER_PHONE = process.env.E2E_TEACHER_PHONE || '0500000001';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: /دخول الإدارة/ }).click();
  await page.getByLabel('البريد الإلكتروني').fill(ADMIN_EMAIL);
  await page.getByLabel('كلمة المرور').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /^دخول الإدارة$/ }).click();
}

async function loginAsTeacher(page: Page, phone: string = TEACHER_PHONE) {
  await page.goto('/login');
  await page.getByLabel('رقم الجوال').fill(phone);
  await page.getByRole('button', { name: /^دخول$/ }).click();
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

function fieldByLabel(page: Page, labelText: string, kind: 'input' | 'select' | 'textarea' = 'input') {
  return page
    .locator(`div:has(> label:has-text("${labelText.replace(/"/g, '\\"')}")) >> ${kind}`)
    .first();
}

test.describe('Ghiyabi end-to-end (phone-only teacher login)', () => {
  test('Login form has bound labels and is keyboard-accessible', async ({ page }) => {
    await page.goto('/login');
    await page.keyboard.press('Tab');
    await page.keyboard.type(TEACHER_PHONE);
    await expect(page.getByLabel('رقم الجوال')).toHaveValue(TEACHER_PHONE);
    const phoneId = await page.getByLabel('رقم الجوال').getAttribute('id');
    expect(phoneId).toBeTruthy();
  });

  test('login screen renders and unknown route shows 404', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/غيابي/);
    await expect(page.getByLabel('رقم الجوال')).toBeVisible();

    await page.goto('/this-route-does-not-exist-zzz');
    await expect(page.getByRole('heading', { name: /404 Page Not Found/i })).toBeVisible();
  });

  test('teacher signs in by phone, marks attendance, and reload preserves it', async ({ page }) => {
    await loginAsTeacher(page);
    await expect(page).toHaveURL(/\/teacher$/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'حصصي اليوم' })).toBeVisible();
    await gotoFirstSession(page);

    const ahmed = studentRow(page, 'أحمد علي');
    await ahmed.getByRole('button', { name: /غائب/ }).click();
    await expect(ahmed.locator('span', { hasText: 'غائب' }).first()).toBeVisible({ timeout: 10_000 });

    const sara = studentRow(page, 'سارة محمد');
    await sara.getByRole('button', { name: /متأخر/ }).click();
    await expect(sara.locator('span', { hasText: 'متأخر' }).first()).toBeVisible();

    const yousef = studentRow(page, 'يوسف خالد');
    await yousef.getByRole('button', { name: /معذور/ }).click();
    await expect(yousef.locator('span', { hasText: 'معذور' }).first()).toBeVisible();

    await page.waitForTimeout(1500);

    const url = page.url();
    await page.reload();
    await expect(page).toHaveURL(url);

    await expect(studentRow(page, 'أحمد علي').locator('span', { hasText: 'غائب' }).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(studentRow(page, 'سارة محمد').locator('span', { hasText: 'متأخر' }).first()).toBeVisible();
    await expect(studentRow(page, 'يوسف خالد').locator('span', { hasText: 'معذور' }).first()).toBeVisible();
  });

  test('teacher login rejects unknown phone with a generic error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('رقم الجوال').fill('0599999999');
    await page.getByRole('button', { name: /^دخول$/ }).click();
    await expect(page.getByText('رقم غير مصرّح له بالدخول')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/login$/);
  });

  test('teacher login rejects malformed phone before contacting the server', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('رقم الجوال').fill('12');
    await page.getByRole('button', { name: /^دخول$/ }).click();
    await expect(page.getByText('الرجاء إدخال رقم جوال سعودي صحيح')).toBeVisible();
  });

  test('admin signs in, sees admin dashboard, and adds a student', async ({ page }) => {
    await loginAsAdmin(page);
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

  test('admin can add a teacher and assign them to a new class & session, teacher sees it', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 });

    // 1. Provision a brand-new teacher.
    const teacherName = `معلم اختبار ${Date.now() % 100000}`;
    const teacherPhone = `0550${(Date.now() % 1000000).toString().padStart(6, '0')}`;
    await page.goto('/admin/teachers');
    await expect(page.getByRole('heading', { name: 'إدارة المعلمين' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /\+ إضافة معلم/ }).click();
    await page.getByLabel('الاسم الكامل').fill(teacherName);
    await page.getByLabel('رقم الجوال').fill(teacherPhone);
    await page.locator('form').getByRole('button', { name: 'حفظ' }).click();
    await expect(page.getByText('تم إضافة المعلم')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(teacherName, { exact: true }).first()).toBeVisible();

    // 2. Create a class assigned to that teacher.
    const className = `Class ${Date.now() % 100000}`;
    await page.goto('/admin/classes');
    await expect(page.getByRole('heading', { name: 'إدارة الفصول' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /\+ فصل جديد/ }).click();
    await fieldByLabel(page, 'اسم الفصل').fill(className);
    const teacherSelect = fieldByLabel(page, 'المعلم المسؤول', 'select');
    const value = await teacherSelect
      .locator(`option:has-text("${teacherName}")`).first().getAttribute('value');
    if (!value) throw new Error('teacher option not found in class form');
    await teacherSelect.selectOption(value);
    await page.locator('form').getByRole('button', { name: 'حفظ' }).click();
    await expect(page.getByText('تم إضافة الفصل')).toBeVisible({ timeout: 10_000 });

    // 3. Create a session for that class.
    const subject = `مادة ${Date.now() % 100000}`;
    await page.goto('/admin/sessions');
    await expect(page.getByRole('heading', { name: 'إدارة الحصص' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /\+ حصة جديدة/ }).click();
    const classSelect = fieldByLabel(page, 'الفصل', 'select');
    const classValue = await classSelect
      .locator(`option:has-text("${className}")`).first().getAttribute('value');
    if (!classValue) throw new Error('class option not found in session form');
    await classSelect.selectOption(classValue);
    const sessTeacherSelect = fieldByLabel(page, 'المعلم', 'select');
    const sessTeacherValue = await sessTeacherSelect
      .locator(`option:has-text("${teacherName}")`).first().getAttribute('value');
    if (!sessTeacherValue) throw new Error('teacher option not found in session form');
    await sessTeacherSelect.selectOption(sessTeacherValue);
    await fieldByLabel(page, 'المادة').fill(subject);
    await page.locator('form').getByRole('button', { name: 'حفظ' }).click();
    await expect(page.getByText('تم إضافة الحصة')).toBeVisible({ timeout: 10_000 });

    // 4. Sign out the admin, sign in as the new teacher, expect their session.
    await page.goto('/admin');
    await page.getByRole('button', { name: 'خروج' }).click();
    await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });

    await loginAsTeacher(page, teacherPhone);
    await expect(page).toHaveURL(/\/teacher$/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: subject }).first()).toBeVisible({ timeout: 15_000 });
  });

  test('deactivated teacher cannot log in', async ({ page }) => {
    // Provision then deactivate a teacher.
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/admin$/, { timeout: 15_000 });

    const teacherName = `معطّل ${Date.now() % 100000}`;
    const teacherPhone = `0559${(Date.now() % 1000000).toString().padStart(6, '0')}`;
    await page.goto('/admin/teachers');
    await page.getByRole('button', { name: /\+ إضافة معلم/ }).click();
    await page.getByLabel('الاسم الكامل').fill(teacherName);
    await page.getByLabel('رقم الجوال').fill(teacherPhone);
    await page.locator('form').getByRole('button', { name: 'حفظ' }).click();
    await expect(page.getByText('تم إضافة المعلم')).toBeVisible({ timeout: 15_000 });
    const row = page.locator('tr', { has: page.getByText(teacherName, { exact: true }) }).first();
    await row.getByRole('button', { name: 'نشط' }).click();
    await expect(row.getByRole('button', { name: 'معطّل' })).toBeVisible();

    // Sign out and try the deactivated teacher.
    await page.goto('/admin');
    await page.getByRole('button', { name: 'خروج' }).click();
    await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });

    await page.getByLabel('رقم الجوال').fill(teacherPhone);
    await page.getByRole('button', { name: /^دخول$/ }).click();
    await expect(page.getByText('رقم غير مصرّح له بالدخول')).toBeVisible({ timeout: 10_000 });
  });
});
