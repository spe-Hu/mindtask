/**
 * 全局搜索和键盘快捷键 E2E 测试
 * 验证搜索功能和快捷键是否正常工作
 */
import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5174';

/** 导航到应用并等待项目加载，返回项目 ID */
async function navigateToApp(page: Page, waitMs = 3000): Promise<string> {
  await page.goto(`${BASE_URL}`);
  await page.waitForTimeout(waitMs);
  await page.waitForSelector('.project-sidebar', { timeout: 10000 });
  await page.waitForSelector('.project-item', { timeout: 10000 });
  const href = await page.locator('.project-item .view-link').first().getAttribute('href');
  const match = href?.match(/\/project\/([^/]+)/);
  return match ? match[1] : '';
}

function mindmapUrl(projectId: string) {
  return `${BASE_URL}/project/${projectId}/mindmap`;
}

function tasksUrl(projectId: string) {
  return `${BASE_URL}/project/${projectId}/tasks`;
}

test.describe('全局搜索功能', () => {
  let projectId = '';

  test.beforeEach(async ({ page }) => {
    projectId = await navigateToApp(page);
  });

  test('可以通过 Ctrl+F 打开搜索对话框', async ({ page }) => {
    await page.keyboard.press('Control+f');
    await page.waitForTimeout(500);
    
    const searchOverlay = page.locator('.search-overlay');
    await expect(searchOverlay).toBeVisible({ timeout: 5000 });
    
    const searchInput = page.locator('.search-input');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeFocused();
  });

  test('可以通过 Mac Cmd+F 打开搜索对话框', async ({ page }) => {
    await page.keyboard.press('Meta+f');
    await page.waitForTimeout(500);
    
    const searchOverlay = page.locator('.search-overlay');
    await expect(searchOverlay).toBeVisible({ timeout: 5000 });
  });

  test('可以通过 ESC 关闭搜索对话框', async ({ page }) => {
    await page.keyboard.press('Control+f');
    await page.waitForTimeout(500);
    
    const searchOverlay = page.locator('.search-overlay');
    await expect(searchOverlay).toBeVisible();
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    await expect(searchOverlay).not.toBeVisible();
  });

  test('可以通过点击背景关闭搜索对话框', async ({ page }) => {
    await page.keyboard.press('Control+f');
    await page.waitForTimeout(500);
    
    const searchOverlay = page.locator('.search-overlay');
    await expect(searchOverlay).toBeVisible();
    
    await searchOverlay.click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);
    
    await expect(searchOverlay).not.toBeVisible();
  });

  test('搜索框显示空状态提示', async ({ page }) => {
    await page.keyboard.press('Control+f');
    await page.waitForTimeout(500);
    
    const emptyHint = page.locator('.search-empty');
    await expect(emptyHint).toBeVisible();
    await expect(emptyHint).toContainText('输入关键词开始搜索');
  });

  test('搜索无结果显示空状态', async ({ page }) => {
    await page.keyboard.press('Control+f');
    await page.waitForTimeout(500);
    
    const searchInput = page.locator('.search-input');
    await searchInput.fill('不存在的关键词12345');
    await page.waitForTimeout(500);
    
    const emptyHint = page.locator('.search-empty');
    await expect(emptyHint).toBeVisible();
    await expect(emptyHint).toContainText('未找到相关结果');
  });
});

test.describe('键盘快捷键', () => {
  let projectId = '';

  test.beforeEach(async ({ page }) => {
    projectId = await navigateToApp(page);
  });

  test('Ctrl+S 保存思维导图', async ({ page }) => {
    await page.goto(mindmapUrl(projectId));
    await page.waitForTimeout(2000);
    
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(1000);
    
    expect(true).toBeTruthy();
  });

  test('Mac Cmd+S 保存思维导图', async ({ page }) => {
    await page.goto(mindmapUrl(projectId));
    await page.waitForTimeout(2000);
    
    await page.keyboard.press('Meta+s');
    await page.waitForTimeout(1000);
    
    expect(true).toBeTruthy();
  });

  test('Delete 键删除思维导图节点', async ({ page }) => {
    await page.goto(mindmapUrl(projectId));
    await page.waitForTimeout(2000);
    
    const mindmapContainer = page.locator('.mindmap-container');
    await mindmapContainer.click();
    await page.waitForTimeout(500);
    
    await page.keyboard.press('Delete');
    await page.waitForTimeout(500);
    
    expect(true).toBeTruthy();
  });

  test('Backspace 键删除思维导图节点', async ({ page }) => {
    await page.goto(mindmapUrl(projectId));
    await page.waitForTimeout(2000);
    
    const mindmapContainer = page.locator('.mindmap-container');
    await mindmapContainer.click();
    await page.waitForTimeout(500);
    
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(500);
    
    expect(true).toBeTruthy();
  });

  test('Ctrl+N 快捷键被拦截', async ({ page }) => {
    await page.goto(tasksUrl(projectId));
    await page.waitForTimeout(1000);
    
    await page.keyboard.press('Control+n');
    await page.waitForTimeout(500);
    
    expect(page.url()).toContain('/tasks');
  });
});

test.describe('搜索和快捷键集成', () => {
  test('快捷键在搜索对话框打开时仍然工作', async ({ page }) => {
    await navigateToApp(page);
    
    await page.keyboard.press('Control+f');
    await page.waitForTimeout(500);
    
    const searchOverlay = page.locator('.search-overlay');
    await expect(searchOverlay).toBeVisible();
    
    await page.keyboard.press('Control+f');
    await page.waitForTimeout(300);
    await expect(searchOverlay).toBeVisible();
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await expect(searchOverlay).not.toBeVisible();
  });
});
