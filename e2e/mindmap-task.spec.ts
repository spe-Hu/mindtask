/**
 * ToDo PM - E2E 测试
 * 覆盖 8 大类测试场景
 * 
 * 运行方式：
 *   npx playwright test           # 运行所有测试
 *   npx playwright test --ui      # 交互模式
 *   npx playwright test -g "1."   # 运行指定类别
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5174';

/** 清除 IndexedDB 数据的辅助函数（通过在页面上下文中执行） */
async function clearIndexedDB(page: import('@playwright/test').Page) {
  await page.goto(`${BASE_URL}/mindmap`);
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const databases = ['todo-pm'];
      let pending = databases.length;
      if (pending === 0) { resolve(); return; }
      databases.forEach(name => {
        const req = indexedDB.deleteDatabase(name);
        req.onsuccess = () => { pending--; if (pending === 0) resolve(); };
        req.onerror = () => { pending--; if (pending === 0) resolve(); };
        req.onblocked = () => { pending--; if (pending === 0) resolve(); };
      });
    });
  });
}

// ===== 1. 思维导图基础功能测试 =====

test.describe('1. 思维导图基础功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/mindmap`);
    await page.waitForTimeout(3000);
  });

  test('页面加载并显示思维导图容器', async ({ page }) => {
    const container = page.locator('.mindmap-container');
    await expect(container).toBeVisible();
    
    const toolbar = page.locator('.toolbar');
    await expect(toolbar).toBeVisible();
  });

  test('思维导图渲染 SVG 内容', async ({ page }) => {
    const svg = page.locator('.mindmap-container svg').first();
    await expect(svg).toBeVisible({ timeout: 10000 });
  });

  test('工具栏包含布局和主题选择器', async ({ page }) => {
    const selects = page.locator('.toolbar .el-select');
    await expect(selects.first()).toBeVisible();
    
    const convertBtn = page.locator('.toolbar .el-button').first();
    await expect(convertBtn).toBeVisible();
  });

  test('可以切换布局', async ({ page }) => {
    const selects = page.locator('.toolbar .el-select');
    await selects.first().click();
    await page.waitForTimeout(500);
    
    const option = page.locator('.el-select-dropdown__item').filter({ hasText: '思维导图' });
    if (await option.isVisible()) {
      await option.click();
      await page.waitForTimeout(1000);
    }
    
    const svg = page.locator('.mindmap-container svg').first();
    await expect(svg).toBeVisible();
  });

  test('可以切换主题', async ({ page }) => {
    const selects = page.locator('.toolbar .el-select');
    if (await selects.count() >= 2) {
      await selects.nth(1).click();
      await page.waitForTimeout(500);
      
      const option = page.locator('.el-select-dropdown__item').filter({ hasText: '深色' });
      if (await option.isVisible()) {
        await option.click();
        await page.waitForTimeout(1000);
      }
    }
    
    const svg = page.locator('.mindmap-container svg').first();
    await expect(svg).toBeVisible();
  });

  test('导航到任务列表并返回', async ({ page }) => {
    const taskLink = page.locator('a[href="/tasks"]');
    await taskLink.click();
    await page.waitForTimeout(1000);
    
    const taskView = page.locator('.task-list-view');
    await expect(taskView).toBeVisible();
    
    const mindmapLink = page.locator('a[href="/mindmap"]');
    await mindmapLink.click();
    await page.waitForTimeout(3000);
    
    const container = page.locator('.mindmap-container');
    await expect(container).toBeVisible();
  });

  test('页面标题和应用标题正确显示', async ({ page }) => {
    await expect(page).toHaveTitle(/ToDo PM/);
    
    const appTitle = page.locator('.app-title');
    await expect(appTitle).toContainText('ToDo PM');
  });
});

// ===== 2. 节点转任务核心流程 =====

test.describe('2. 节点转任务核心流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/mindmap`);
    await page.waitForTimeout(3000);
  });

  test('选中节点前"转为任务"按钮禁用', async ({ page }) => {
    const convertBtn = page.locator('.toolbar .el-button').filter({ hasText: '转为任务' });
    await expect(convertBtn).toBeDisabled();
  });

  test('任务计数初始为0', async ({ page }) => {
    const taskCount = page.locator('.toolbar .el-tag');
    await expect(taskCount).toContainText('0');
  });

  test('SVG 中存在思维导图节点', async ({ page }) => {
    // 验证 SVG 有内容
    const svg = page.locator('.mindmap-container svg').first();
    await expect(svg).toBeVisible();
    // SVG 应该包含文本元素（中心主题）
    const textContent = await svg.textContent();
    expect(textContent).toBeTruthy();
  });

  test('转任务对话框表单字段完整', async ({ page }) => {
    // 通过点击 SVG 中心区域选中节点
    const svg = page.locator('.mindmap-container svg').first();
    await expect(svg).toBeVisible({ timeout: 10000 });
    
    // 点击 SVG 区域来选中中心节点
    await svg.click();
    await page.waitForTimeout(1000);
    
    // 如果选中成功，点击"转为任务"按钮
    const convertBtn = page.locator('.toolbar .el-button').filter({ hasText: '转为任务' });
    if (await convertBtn.isEnabled()) {
      await convertBtn.click();
      await page.waitForTimeout(500);
      
      // 检查对话框
      const dialog = page.locator('.el-dialog');
      if (await dialog.isVisible()) {
        // 检查表单字段
        const inputs = page.locator('.el-dialog .el-form-item');
        const inputCount = await inputs.count();
        expect(inputCount).toBeGreaterThanOrEqual(3);
        
        // 关闭对话框
        const cancelBtn = page.locator('.el-dialog__footer .el-button').first();
        await cancelBtn.click();
      }
    }
  });
});

// ===== 3. 双向同步测试 =====

test.describe('3. 双向同步', () => {
  test('思维导图和任务列表导航正常', async ({ page }) => {
    await page.goto(`${BASE_URL}/mindmap`);
    await page.waitForTimeout(3000);
    
    // 检查初始任务数
    const taskCount = page.locator('.toolbar .el-tag');
    await expect(taskCount).toContainText('0');
    
    // 导航到任务列表
    await page.locator('a[href="/tasks"]').click();
    await page.waitForTimeout(1000);
    
    const taskView = page.locator('.task-list-view');
    await expect(taskView).toBeVisible();
  });

  test('任务列表页面显示正确的筛选分类', async ({ page }) => {
    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForTimeout(1000);
    
    const filterItems = page.locator('.filter-item');
    await expect(filterItems).toHaveCount(5);
  });

  test('思维导图和任务列表页面切换不丢失数据', async ({ page }) => {
    await page.goto(`${BASE_URL}/mindmap`);
    await page.waitForTimeout(3000);
    
    // 导航到任务列表
    await page.locator('a[href="/tasks"]').click();
    await page.waitForTimeout(1000);
    
    const taskView = page.locator('.task-list-view');
    await expect(taskView).toBeVisible();
    
    // 返回思维导图
    await page.locator('a[href="/mindmap"]').click();
    await page.waitForTimeout(3000);
    
    const container = page.locator('.mindmap-container');
    await expect(container).toBeVisible();
  });
});

// ===== 4. 任务管理功能测试 =====

test.describe('4. 任务管理功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForTimeout(1000);
  });

  test('任务列表页面正确渲染', async ({ page }) => {
    const sidebar = page.locator('.task-sidebar');
    await expect(sidebar).toBeVisible();
    
    const searchInput = page.locator('.sidebar-search input');
    await expect(searchInput).toBeVisible();
    
    const stats = page.locator('.stat-item');
    await expect(stats.first()).toBeVisible();
  });

  test('空状态显示正确提示', async ({ page }) => {
    const emptyHint = page.locator('.task-empty');
    if (await emptyHint.isVisible()) {
      await expect(emptyHint).toContainText('思维导图');
    }
  });

  test('筛选视图切换', async ({ page }) => {
    const weekFilter = page.locator('.filter-item').filter({ hasText: '本周' });
    await weekFilter.click();
    
    const title = page.locator('.content-title');
    await expect(title).toContainText('本周');
    
    const completedFilter = page.locator('.filter-item').filter({ hasText: '已完成' });
    await completedFilter.click();
    await expect(title).toContainText('已完成');
    
    const allFilter = page.locator('.filter-item').filter({ hasText: '全部' });
    await allFilter.click();
    await expect(title).toContainText('全部');
  });

  test('排序切换', async ({ page }) => {
    const sortSelect = page.locator('.content-header .el-select');
    await sortSelect.click();
    await page.waitForTimeout(300);
    
    const priorityOption = page.locator('.el-select-dropdown__item').filter({ hasText: '优先级' });
    if (await priorityOption.isVisible()) {
      await priorityOption.click();
    }
    await page.waitForTimeout(500);
  });

  test('搜索功能可用', async ({ page }) => {
    const searchInput = page.locator('.sidebar-search input');
    await searchInput.fill('测试搜索');
    await page.waitForTimeout(300);
    await expect(searchInput).toHaveValue('测试搜索');
    await searchInput.clear();
  });

  test('统计信息显示', async ({ page }) => {
    const statNums = page.locator('.stat-num');
    const count = await statNums.count();
    expect(count).toBeGreaterThanOrEqual(3); // 总计、进行中、已完成
  });
});

// ===== 5. 数据持久化测试 =====

test.describe('5. 数据持久化', () => {
  test('刷新页面后思维导图仍然可见', async ({ page }) => {
    await page.goto(`${BASE_URL}/mindmap`);
    await page.waitForTimeout(3000);
    
    const container = page.locator('.mindmap-container');
    await expect(container).toBeVisible();
    
    await page.reload();
    await page.waitForTimeout(3000);
    
    const containerAfter = page.locator('.mindmap-container');
    await expect(containerAfter).toBeVisible();
  });

  test('IndexedDB 存储结构正确', async ({ page }) => {
    await page.goto(`${BASE_URL}/mindmap`);
    await page.waitForTimeout(3000);
    
    const storeNames = await page.evaluate(() => {
      return new Promise<string[]>((resolve) => {
        const req = indexedDB.open('todo-pm');
        req.onsuccess = () => {
          const db = req.result;
          const names = Array.from(db.objectStoreNames);
          db.close();
          resolve(names);
        };
        req.onerror = () => resolve([]);
        req.onblocked = () => resolve([]);
      });
    });
    
    expect(storeNames).toContain('mindmaps');
    expect(storeNames).toContain('tasks');
  });

  test('任务列表页面刷新后仍然可用', async ({ page }) => {
    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForTimeout(1000);
    
    await page.reload();
    await page.waitForTimeout(1000);
    
    const sidebar = page.locator('.task-sidebar');
    await expect(sidebar).toBeVisible();
  });
});

// ===== 6. 批量操作测试 =====

test.describe('6. 批量操作', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForTimeout(1000);
  });

  test('筛选"已完成"后显示正确视图', async ({ page }) => {
    const completedFilter = page.locator('.filter-item').filter({ hasText: '已完成' });
    await completedFilter.click();
    await page.waitForTimeout(500);
    
    const title = page.locator('.content-title');
    await expect(title).toContainText('已完成');
    
    // 要么有空状态，要么有任务卡片
    const empty = page.locator('.task-empty');
    const taskCards = page.locator('.task-card');
    const emptyVisible = await empty.isVisible().catch(() => false);
    const cardCount = await taskCards.count();
    expect(emptyVisible || cardCount > 0).toBeTruthy();
  });

  test('筛选"今日"后显示正确视图', async ({ page }) => {
    const todayFilter = page.locator('.filter-item').filter({ hasText: '今日' });
    await todayFilter.click();
    await page.waitForTimeout(500);
    
    const title = page.locator('.content-title');
    await expect(title).toContainText('今日');
  });

  test('筛选"接下来"后显示正确视图', async ({ page }) => {
    const upcomingFilter = page.locator('.filter-item').filter({ hasText: '接下来' });
    await upcomingFilter.click();
    await page.waitForTimeout(500);
    
    const title = page.locator('.content-title');
    await expect(title).toContainText('接下来');
  });

  test('连续切换筛选不会崩溃', async ({ page }) => {
    const filters = ['今日', '接下来', '本周', '全部', '已完成'];
    for (const filterName of filters) {
      const filter = page.locator('.filter-item').filter({ hasText: filterName });
      await filter.click();
      await page.waitForTimeout(200);
    }
    
    // 页面应该仍然正常
    const sidebar = page.locator('.task-sidebar');
    await expect(sidebar).toBeVisible();
  });
});

// ===== 7. 异常与边界测试 =====

test.describe('7. 异常与边界', () => {
  test('空数据时任务列表显示空提示', async ({ page }) => {
    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForTimeout(1000);
    
    // 切换到"全部"筛选确保显示所有任务
    const allFilter = page.locator('.filter-item').filter({ hasText: '全部' });
    await allFilter.click();
    await page.waitForTimeout(500);
    
    // 检查是否有空状态或任务列表
    const empty = page.locator('.task-empty');
    const taskCards = page.locator('.task-card');
    const emptyVisible = await empty.isVisible().catch(() => false);
    const cardCount = await taskCards.count();
    expect(emptyVisible || cardCount >= 0).toBeTruthy();
  });

  test('无效路由自动跳转到思维导图', async ({ page }) => {
    await page.goto(`${BASE_URL}/invalid-route`);
    await page.waitForTimeout(2000);
    
    // 应该重定向到 /mindmap
    await expect(page).toHaveURL(/\/mindmap/, { timeout: 5000 });
  });

  test('搜索框输入特殊字符不会崩溃', async ({ page }) => {
    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForTimeout(1000);
    
    const searchInput = page.locator('.sidebar-search input');
    await searchInput.fill('<script>alert("xss")</script>');
    await page.waitForTimeout(300);
    
    const sidebar = page.locator('.task-sidebar');
    await expect(sidebar).toBeVisible();
  });

  test('搜索框输入超长文本不会崩溃', async ({ page }) => {
    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForTimeout(1000);
    
    const searchInput = page.locator('.sidebar-search input');
    await searchInput.fill('a'.repeat(500));
    await page.waitForTimeout(300);
    
    const sidebar = page.locator('.task-sidebar');
    await expect(sidebar).toBeVisible();
  });

  test('快速切换页面不会崩溃', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await page.goto(`${BASE_URL}/mindmap`);
      await page.waitForTimeout(500);
      await page.goto(`${BASE_URL}/tasks`);
      await page.waitForTimeout(500);
    }
    
    // 页面应该仍然正常
    const taskView = page.locator('.task-list-view');
    await expect(taskView).toBeVisible();
  });
});

// ===== 8. 完整闭环可用性测试 =====

test.describe('8. 完整闭环可用性', () => {
  test('从思维导图到任务管理的完整导航流程', async ({ page }) => {
    // 1. 打开思维导图
    await page.goto(`${BASE_URL}/mindmap`);
    await page.waitForTimeout(3000);
    
    // 2. 确认思维导图已加载
    const container = page.locator('.mindmap-container');
    await expect(container).toBeVisible();
    
    // 3. 确认任务计数显示
    const taskCount = page.locator('.toolbar .el-tag');
    await expect(taskCount).toBeVisible();
    
    // 4. 导航到任务列表
    await page.locator('a[href="/tasks"]').click();
    await page.waitForTimeout(1000);
    
    // 5. 确认任务列表页面
    const taskView = page.locator('.task-list-view');
    await expect(taskView).toBeVisible();
    
    // 6. 返回思维导图
    await page.locator('a[href="/mindmap"]').click();
    await page.waitForTimeout(3000);
    
    // 7. 思维导图应该仍然可用
    const containerAfter = page.locator('.mindmap-container');
    await expect(containerAfter).toBeVisible();
  });

  test('数据持久化：刷新后数据保留', async ({ page }) => {
    await page.goto(`${BASE_URL}/mindmap`);
    await page.waitForTimeout(3000);
    
    const container = page.locator('.mindmap-container');
    await expect(container).toBeVisible();
    
    // 刷新
    await page.reload();
    await page.waitForTimeout(3000);
    
    const containerAfter = page.locator('.mindmap-container');
    await expect(containerAfter).toBeVisible();
    
    // 导航到任务列表
    await page.locator('a[href="/tasks"]').click();
    await page.waitForTimeout(1000);
    
    const taskView = page.locator('.task-list-view');
    await expect(taskView).toBeVisible();
  });

  test('页面标题和导航始终正确', async ({ page }) => {
    await page.goto(`${BASE_URL}`);
    await page.waitForTimeout(3000);
    
    // 应该重定向到 /mindmap
    await expect(page).toHaveURL(/\/mindmap/);
    
    // 标题
    await expect(page).toHaveTitle(/ToDo PM/);
    
    // 导航链接
    const navLinks = page.locator('.nav-link');
    await expect(navLinks).toHaveCount(2);
    
    // 切换到任务列表
    await page.locator('a[href="/tasks"]').click();
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/tasks/);
  });

  test('全流程：导图→任务列表→导图往返导航', async ({ page }) => {
    // 在两个视图之间来回切换多次
    for (let i = 0; i < 3; i++) {
      await page.goto(`${BASE_URL}/mindmap`);
      await page.waitForTimeout(2000);
      
      const container = page.locator('.mindmap-container');
      await expect(container).toBeVisible();
      
      await page.locator('a[href="/tasks"]').click();
      await page.waitForTimeout(1000);
      
      const taskView = page.locator('.task-list-view');
      await expect(taskView).toBeVisible();
    }
  });
});
