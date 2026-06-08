import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5174';

// Helper to create a task
async function createTask(page: any, title: string) {
  await page.keyboard.press('q');
  await page.waitForSelector('.quickadd-overlay', { timeout: 5000 });
  await page.locator('.quickadd-input').fill(title);
  await page.keyboard.press('Enter');
  await page.waitForSelector('.quickadd-overlay', { state: 'detached', timeout: 5000 });
  await page.waitForTimeout(500);
}

test.describe('键盘快捷键测试', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  test('按 Q 键打开快速添加', async ({ page }) => {
    await page.keyboard.press('q');
    await expect(page.locator('.quickadd-overlay')).toBeVisible({ timeout: 5000 });
  });

  test('上下键导航任务列表', async ({ page }) => {
    // Navigate to task view
    await page.getByRole('link', { name: '任务' }).first().click();
    await page.waitForTimeout(500);
    
    // Create 3 tasks (they will appear newest first: 任务 3, 任务 2, 任务 1)
    for (let i = 1; i <= 3; i++) {
      await createTask(page, `任务 ${i}`);
    }
    
    // Click on the task list container to ensure focus
    await page.locator('.task-list').click();
    await page.waitForTimeout(200);
    
    // Test down arrow navigation (newest first, so 任务 3 is first)
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    
    const firstFocused = page.locator('.task-card--focused').first();
    await expect(firstFocused).toBeVisible();
    await expect(firstFocused.locator('.task-card__title')).toContainText('任务 3');
    
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    await expect(page.locator('.task-card--focused').first().locator('.task-card__title')).toContainText('任务 2');
    
    // Test up arrow navigation
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(300);
    await expect(page.locator('.task-card--focused').first().locator('.task-card__title')).toContainText('任务 3');
  });

  test('空格键切换任务状态', async ({ page }) => {
    await page.getByRole('link', { name: '任务' }).first().click();
    await page.waitForTimeout(500);
    
    await createTask(page, '测试任务');
    
    // Click body to ensure focus
    await page.locator('body').click();
    await page.waitForTimeout(200);
    
    // Navigate to first task
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    
    // Verify we have a focused task
    const taskCard = page.locator('.task-card--focused').first();
    await expect(taskCard).toBeVisible();
    
    // Click the status circle to toggle done status
    await taskCard.locator('.status-circle').click();
    await page.waitForTimeout(500);
    
    // Verify task is marked as done (should have task-card--done class)
    await expect(taskCard).toHaveClass(/task-card--done/);
  });

  test('Enter 键打开任务详情', async ({ page }) => {
    await page.getByRole('link', { name: '任务' }).first().click();
    await page.waitForTimeout(500);
    
    await createTask(page, '测试任务');
    
    // Click body to ensure focus
    await page.locator('body').click();
    await page.waitForTimeout(200);
    
    // Navigate to first task
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    
    // Press Enter to open details
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    // Verify detail drawer is open
    await expect(page.locator('.task-detail')).toBeVisible();
  });

  test('Delete/Backspace 键删除任务', async ({ page }) => {
    await page.getByRole('link', { name: '任务' }).first().click();
    await page.waitForTimeout(500);
    
    await createTask(page, '要删除的任务');
    
    // Click body to ensure focus
    await page.locator('body').click();
    await page.waitForTimeout(200);
    
    // Navigate to first task
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    
    // Press Delete (will show confirmation dialog)
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    await page.keyboard.press('Delete');
    await page.waitForTimeout(500);
    
    // Verify task is deleted
    await expect(page.locator('.task-card__title:has-text("要删除的任务")')).not.toBeVisible();
  });

  test('Ctrl/Cmd+Z 撤销操作', async ({ page }) => {
    await page.getByRole('link', { name: '任务' }).first().click();
    await page.waitForTimeout(500);
    
    await createTask(page, '撤销测试');
    
    // Click body to ensure focus
    await page.locator('body').click();
    await page.waitForTimeout(200);
    
    // Navigate to first task
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    
    // Delete task
    page.once('dialog', async dialog => {
      await dialog.accept();
    });
    await page.keyboard.press('Delete');
    await page.waitForTimeout(500);
    
    // Verify task is deleted
    await expect(page.locator('.task-card__title:has-text("撤销测试")')).not.toBeVisible();
    
    // Press Ctrl+Z (or Cmd+Z on Mac) to undo
    const isMac = process.platform === 'darwin';
    await page.keyboard.press(isMac ? 'Meta+z' : 'Control+z');
    await page.waitForTimeout(500);
    
    // Verify task is restored
    await expect(page.locator('.task-card__title:has-text("撤销测试")')).toBeVisible();
  });
});
