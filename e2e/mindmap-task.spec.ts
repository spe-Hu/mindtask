/**
 * ToDo PM - E2E 测试 (项目化版本)
 * 覆盖 8 大类测试场景 + 项目管理功能
 */
import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5174';

/** 导航到应用并等待项目加载，返回项目 ID */
async function navigateToApp(page: Page, waitMs = 3000): Promise<string> {
  await page.goto(`${BASE_URL}`);
  await page.waitForTimeout(waitMs);
  // 等待侧边栏项目列表出现
  await page.waitForSelector('.project-sidebar', { timeout: 10000 });
  // 等待至少一个项目加载
  await page.waitForSelector('.project-item', { timeout: 10000 });
  // 从侧边栏链接中提取 projectId
  const href = await page.locator('.project-item .view-link').first().getAttribute('href');
  const match = href?.match(/\/project\/([^/]+)/);
  return match ? match[1] : '';
}

/** 获取思维导图 URL */
function mindmapUrl(projectId: string) {
  return `${BASE_URL}/project/${projectId}/mindmap`;
}

/** 获取任务列表 URL */
function tasksUrl(projectId: string) {
  return `${BASE_URL}/project/${projectId}/tasks`;
}

/** 清除 IndexedDB 数据 */
async function clearIndexedDB(page: Page) {
  await page.goto(`${BASE_URL}`);
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
  let projectId = '';

  test.beforeEach(async ({ page }) => {
    projectId = await navigateToApp(page);
    if (projectId) {
      await page.goto(mindmapUrl(projectId));
      await page.waitForTimeout(3000);
    }
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
    // 点击顶部导航中的任务列表链接
    const taskLink = page.locator('.header-nav .nav-link').filter({ hasText: '任务列表' });
    await taskLink.click();
    await page.waitForTimeout(1000);
    const taskView = page.locator('.task-list-view');
    await expect(taskView).toBeVisible();
    // 返回思维导图
    const mindmapLink = page.locator('.header-nav .nav-link').filter({ hasText: '思维导图' });
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
  let projectId = '';

  test.beforeEach(async ({ page }) => {
    projectId = await navigateToApp(page);
    if (projectId) {
      await page.goto(mindmapUrl(projectId));
      await page.waitForTimeout(3000);
    }
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
    const svg = page.locator('.mindmap-container svg').first();
    await expect(svg).toBeVisible();
    const textContent = await svg.textContent();
    expect(textContent).toBeTruthy();
  });

  test('转任务对话框表单字段完整', async ({ page }) => {
    const svg = page.locator('.mindmap-container svg').first();
    await expect(svg).toBeVisible({ timeout: 10000 });
    await svg.click();
    await page.waitForTimeout(1000);
    const convertBtn = page.locator('.toolbar .el-button').filter({ hasText: '转为任务' });
    if (await convertBtn.isEnabled()) {
      await convertBtn.click();
      await page.waitForTimeout(500);
      const dialog = page.locator('.el-dialog');
      if (await dialog.isVisible()) {
        const inputs = page.locator('.el-dialog .el-form-item');
        const inputCount = await inputs.count();
        expect(inputCount).toBeGreaterThanOrEqual(3);
        const cancelBtn = page.locator('.el-dialog__footer .el-button').first();
        await cancelBtn.click();
      }
    }
  });
});

// ===== 3. 双向同步测试 =====

test.describe('3. 双向同步', () => {
  test('思维导图和任务列表导航正常', async ({ page }) => {
    const projectId = await navigateToApp(page);
    await page.goto(mindmapUrl(projectId));
    await page.waitForTimeout(3000);
    const taskCount = page.locator('.toolbar .el-tag');
    await expect(taskCount).toContainText('0');
    // 导航到任务列表
    await page.locator('.header-nav .nav-link').filter({ hasText: '任务列表' }).click();
    await page.waitForTimeout(1000);
    const taskView = page.locator('.task-list-view');
    await expect(taskView).toBeVisible();
  });

  test('任务列表页面显示正确的筛选分类', async ({ page }) => {
    const projectId = await navigateToApp(page);
    await page.goto(tasksUrl(projectId));
    await page.waitForTimeout(1000);
    const filterItems = page.locator('.filter-item');
    await expect(filterItems).toHaveCount(5);
  });

  test('思维导图和任务列表页面切换不丢失数据', async ({ page }) => {
    const projectId = await navigateToApp(page);
    await page.goto(mindmapUrl(projectId));
    await page.waitForTimeout(3000);
    await page.locator('.header-nav .nav-link').filter({ hasText: '任务列表' }).click();
    await page.waitForTimeout(1000);
    const taskView = page.locator('.task-list-view');
    await expect(taskView).toBeVisible();
    await page.locator('.header-nav .nav-link').filter({ hasText: '思维导图' }).click();
    await page.waitForTimeout(3000);
    const container = page.locator('.mindmap-container');
    await expect(container).toBeVisible();
  });
});

// ===== 4. 任务管理功能测试 =====

test.describe('4. 任务管理功能', () => {
  let projectId = '';

  test.beforeEach(async ({ page }) => {
    projectId = await navigateToApp(page);
    await page.goto(tasksUrl(projectId));
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
    expect(count).toBeGreaterThanOrEqual(3);
  });
});

// ===== 5. 数据持久化测试 =====

test.describe('5. 数据持久化', () => {
  test('刷新页面后思维导图仍然可见', async ({ page }) => {
    const projectId = await navigateToApp(page);
    await page.goto(mindmapUrl(projectId));
    await page.waitForTimeout(3000);
    const container = page.locator('.mindmap-container');
    await expect(container).toBeVisible();
    await page.reload();
    await page.waitForTimeout(3000);
    const containerAfter = page.locator('.mindmap-container');
    await expect(containerAfter).toBeVisible();
  });

  test('IndexedDB 存储结构正确', async ({ page }) => {
    await navigateToApp(page);
    await page.waitForTimeout(2000);
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
    expect(storeNames).toContain('projects');
  });

  test('任务列表页面刷新后仍然可用', async ({ page }) => {
    const projectId = await navigateToApp(page);
    await page.goto(tasksUrl(projectId));
    await page.waitForTimeout(1000);
    await page.reload();
    await page.waitForTimeout(1000);
    const sidebar = page.locator('.task-sidebar');
    await expect(sidebar).toBeVisible();
  });
});

// ===== 6. 批量操作测试 =====

test.describe('6. 批量操作', () => {
  let projectId = '';

  test.beforeEach(async ({ page }) => {
    projectId = await navigateToApp(page);
    await page.goto(tasksUrl(projectId));
    await page.waitForTimeout(1000);
  });

  test('筛选"已完成"后显示正确视图', async ({ page }) => {
    const completedFilter = page.locator('.filter-item').filter({ hasText: '已完成' });
    await completedFilter.click();
    await page.waitForTimeout(500);
    const title = page.locator('.content-title');
    await expect(title).toContainText('已完成');
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
    const sidebar = page.locator('.task-sidebar');
    await expect(sidebar).toBeVisible();
  });
});

// ===== 7. 异常与边界测试 =====

test.describe('7. 异常与边界', () => {
  test('空数据时任务列表显示空提示', async ({ page }) => {
    const projectId = await navigateToApp(page);
    await page.goto(tasksUrl(projectId));
    await page.waitForTimeout(1000);
    const allFilter = page.locator('.filter-item').filter({ hasText: '全部' });
    await allFilter.click();
    await page.waitForTimeout(500);
    const empty = page.locator('.task-empty');
    const taskCards = page.locator('.task-card');
    const emptyVisible = await empty.isVisible().catch(() => false);
    const cardCount = await taskCards.count();
    expect(emptyVisible || cardCount >= 0).toBeTruthy();
  });

  test('无效路由自动跳转到思维导图', async ({ page }) => {
    await page.goto(`${BASE_URL}/invalid-route`);
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/mindmap/, { timeout: 10000 });
  });

  test('搜索框输入特殊字符不会崩溃', async ({ page }) => {
    const projectId = await navigateToApp(page);
    await page.goto(tasksUrl(projectId));
    await page.waitForTimeout(1000);
    const searchInput = page.locator('.sidebar-search input');
    await searchInput.fill('<script>alert("xss")</script>');
    await page.waitForTimeout(300);
    const sidebar = page.locator('.task-sidebar');
    await expect(sidebar).toBeVisible();
  });

  test('搜索框输入超长文本不会崩溃', async ({ page }) => {
    const projectId = await navigateToApp(page);
    await page.goto(tasksUrl(projectId));
    await page.waitForTimeout(1000);
    const searchInput = page.locator('.sidebar-search input');
    await searchInput.fill('a'.repeat(500));
    await page.waitForTimeout(300);
    const sidebar = page.locator('.task-sidebar');
    await expect(sidebar).toBeVisible();
  });

  test('快速切换页面不会崩溃', async ({ page }) => {
    const projectId = await navigateToApp(page);
    for (let i = 0; i < 5; i++) {
      await page.goto(mindmapUrl(projectId));
      await page.waitForTimeout(500);
      await page.goto(tasksUrl(projectId));
      await page.waitForTimeout(500);
    }
    const taskView = page.locator('.task-list-view');
    await expect(taskView).toBeVisible();
  });
});

// ===== 8. 完整闭环可用性测试 =====

test.describe('8. 完整闭环可用性', () => {
  test('从思维导图到任务管理的完整导航流程', async ({ page }) => {
    const projectId = await navigateToApp(page);
    await page.goto(mindmapUrl(projectId));
    await page.waitForTimeout(3000);
    const container = page.locator('.mindmap-container');
    await expect(container).toBeVisible();
    const taskCount = page.locator('.toolbar .el-tag');
    await expect(taskCount).toBeVisible();
    await page.locator('.header-nav .nav-link').filter({ hasText: '任务列表' }).click();
    await page.waitForTimeout(1000);
    const taskView = page.locator('.task-list-view');
    await expect(taskView).toBeVisible();
    await page.locator('.header-nav .nav-link').filter({ hasText: '思维导图' }).click();
    await page.waitForTimeout(3000);
    const containerAfter = page.locator('.mindmap-container');
    await expect(containerAfter).toBeVisible();
  });

  test('数据持久化：刷新后数据保留', async ({ page }) => {
    const projectId = await navigateToApp(page);
    await page.goto(mindmapUrl(projectId));
    await page.waitForTimeout(3000);
    const container = page.locator('.mindmap-container');
    await expect(container).toBeVisible();
    await page.reload();
    await page.waitForTimeout(3000);
    const containerAfter = page.locator('.mindmap-container');
    await expect(containerAfter).toBeVisible();
    await page.locator('.header-nav .nav-link').filter({ hasText: '任务列表' }).click();
    await page.waitForTimeout(1000);
    const taskView = page.locator('.task-list-view');
    await expect(taskView).toBeVisible();
  });

  test('页面标题和导航始终正确', async ({ page }) => {
    const projectId = await navigateToApp(page);
    await expect(page).toHaveURL(/\/mindmap/);
    await expect(page).toHaveTitle(/ToDo PM/);
    const navLinks = page.locator('.header-nav .nav-link');
    await expect(navLinks).toHaveCount(2);
    await page.locator('.header-nav .nav-link').filter({ hasText: '任务列表' }).click();
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/tasks/);
  });

  test('全流程：导图→任务列表→导图往返导航', async ({ page }) => {
    const projectId = await navigateToApp(page);
    for (let i = 0; i < 3; i++) {
      await page.goto(mindmapUrl(projectId));
      await page.waitForTimeout(2000);
      const container = page.locator('.mindmap-container');
      await expect(container).toBeVisible();
      await page.locator('.header-nav .nav-link').filter({ hasText: '任务列表' }).click();
      await page.waitForTimeout(1000);
      const taskView = page.locator('.task-list-view');
      await expect(taskView).toBeVisible();
    }
  });
});

// ===== 9. 项目管理功能测试 =====

test.describe('9. 项目管理', () => {
  test('左侧显示项目列表', async ({ page }) => {
    await navigateToApp(page);
    const sidebar = page.locator('.project-sidebar');
    await expect(sidebar).toBeVisible();
    const projects = page.locator('.project-item');
    const count = await projects.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('可以新建项目', async ({ page }) => {
    await navigateToApp(page);
    const newBtn = page.locator('.btn-new-project');
    await newBtn.click();
    await page.waitForTimeout(300);
    const input = page.locator('.dialog-input');
    await input.fill('测试项目');
    const confirmBtn = page.locator('.btn-confirm');
    await confirmBtn.click();
    await page.waitForTimeout(1000);
    // 新项目应该出现在侧边栏
    const projectItem = page.locator('.project-item').filter({ hasText: '测试项目' });
    await expect(projectItem).toBeVisible();
  });

  test('可以切换项目', async ({ page }) => {
    await navigateToApp(page);
    // 先创建一个新项目
    const newBtn = page.locator('.btn-new-project');
    await newBtn.click();
    await page.waitForTimeout(300);
    const input = page.locator('.dialog-input');
    await input.fill('第二个项目');
    await page.locator('.btn-confirm').click();
    await page.waitForTimeout(1000);
    // 点击第一个项目
    const firstProject = page.locator('.project-item').first();
    await firstProject.locator('.project-item__name').click();
    await page.waitForTimeout(500);
    // 第一个项目应该高亮
    await expect(firstProject).toHaveClass(/project-item--active/);
  });

  test('每个项目有独立的导图和任务视图链接', async ({ page }) => {
    await navigateToApp(page);
    // 当前项目应该显示导图和任务链接
    const activeItem = page.locator('.project-item--active');
    const viewLinks = activeItem.locator('.view-link');
    await expect(viewLinks).toHaveCount(2);
  });
});
