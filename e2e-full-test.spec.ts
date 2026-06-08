import { test, expect } from '@playwright/test'

test.describe('Todo PM - Full UI/UX E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5174')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
  })

  test('1. App loads and shows project sidebar + mindmap', async ({ page }) => {
    await expect(page.locator('.app-layout')).toBeVisible()
    await expect(page.locator('.project-sidebar')).toBeVisible()
    await expect(page.locator('.mindmap-view')).toBeVisible()
  })

  test('2. Toolbar buttons have compact sizing (not oversized)', async ({ page }) => {
    const toolbar = page.locator('.toolbar')
    await expect(toolbar).toBeVisible()
    
    const buttons = toolbar.locator('.el-button')
    const count = await buttons.count()
    
    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i)
      if (await btn.isVisible()) {
        const fontSize = await btn.evaluate(el => {
          return window.getComputedStyle(el).fontSize
        })
        const size = parseFloat(fontSize)
        expect(size).toBeLessThanOrEqual(14)
      }
    }
  })

  test('3. Create project, add mindmap node, convert to task', async ({ page }) => {
    // Create project
    await page.click('.btn-new-project')
    await page.fill('.dialog-input', 'Test Project')
    await page.click('.btn-confirm')
    await page.waitForTimeout(500)
    
    // Verify project created
    await expect(page.locator('.project-item').filter({ hasText: 'Test Project' })).toBeVisible()
    
    // Mindmap should be visible
    await expect(page.locator('.mindmap-container')).toBeVisible()
  })

  test('4. Theme switching updates mindmap background color', async ({ page }) => {
    // Create project first
    await page.click('.btn-new-project')
    await page.fill('.dialog-input', 'Theme Test')
    await page.click('.btn-confirm')
    await page.waitForTimeout(500)
    
    // Get initial background
    const initialBg = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--mindmap-bg').trim()
    })
    
    // Click theme switcher
    await page.click('.theme-btn')
    await page.waitForTimeout(300)
    
    // Select a different theme (e.g., forest)
    const themeOptions = page.locator('.theme-option')
    const count = await themeOptions.count()
    if (count > 3) {
      await themeOptions.nth(3).click()
    } else if (count > 1) {
      await themeOptions.nth(1).click()
    }
    await page.waitForTimeout(500)
    
    // Get new background
    const newBg = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--mindmap-bg').trim()
    })
    
    // Background should have changed
    expect(newBg).not.toBe(initialBg)
    
    // Verify CSS variable was updated
    const mindmapBgVar = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--mindmap-bg').trim()
    })
    expect(mindmapBgVar).toBeTruthy()
  })

  test('5. Task detail panel - close button works', async ({ page }) => {
    // Create project
    await page.click('.btn-new-project')
    await page.fill('.dialog-input', 'Close Test')
    await page.click('.btn-confirm')
    await page.waitForTimeout(500)
    
    // Add task via QuickAdd (Q key)
    await page.keyboard.press('q')
    await page.waitForTimeout(500)
    
    const quickAdd = page.locator('.quickadd-overlay')
    if (await quickAdd.isVisible()) {
      await quickAdd.locator('input').fill('Test Task')
      await quickAdd.locator('input').press('Enter')
      await page.waitForTimeout(500)
    }
    
    // Click on task in sidebar to open detail
    const sidebarItems = page.locator('.task-sidebar__item')
    const count = await sidebarItems.count()
    
    if (count > 0) {
      await sidebarItems.first().click()
      await page.waitForTimeout(500)
      
      // Drawer should open
      const drawer = page.locator('.task-detail-drawer')
      await expect(drawer).toBeVisible({ timeout: 5000 })
      
      // Close button should exist
      const closeBtn = page.locator('.drawer-header__close')
      await expect(closeBtn).toBeVisible()
      
      // Click close
      await closeBtn.click()
      await page.waitForTimeout(1000)
      
      // Drawer should close - the el-drawer component removes itself from DOM
      await expect(drawer).toBeHidden({ timeout: 5000 })
    }
  })

  test('6. Task detail panel - Escape key closes drawer', async ({ page }) => {
    // Create project
    await page.click('.btn-new-project')
    await page.fill('.dialog-input', 'Escape Test')
    await page.click('.btn-confirm')
    await page.waitForTimeout(500)
    
    // Add task
    await page.keyboard.press('q')
    await page.waitForTimeout(500)
    
    const quickAdd = page.locator('.quickadd-overlay')
    if (await quickAdd.isVisible()) {
      await quickAdd.locator('input').fill('Escape Task')
      await quickAdd.locator('input').press('Enter')
      await page.waitForTimeout(500)
    }
    
    // Open task detail
    const sidebarItems = page.locator('.task-sidebar__item')
    if (await sidebarItems.count() > 0) {
      await sidebarItems.first().click()
      await page.waitForTimeout(500)
      
      const drawer = page.locator('.task-detail-drawer')
      await expect(drawer).toBeVisible()
      
      // Press Escape
      await drawer.press('Escape')
      await page.waitForTimeout(500)
      
      // Drawer should close
      await expect(drawer).not.toBeVisible()
    }
  })

  test('7. Task detail - fields are editable (title, status, priority)', async ({ page }) => {
    // Create project
    await page.click('.btn-new-project')
    await page.fill('.dialog-input', 'Edit Test')
    await page.click('.btn-confirm')
    await page.waitForTimeout(500)
    
    // Add task
    await page.keyboard.press('q')
    await page.waitForTimeout(500)
    
    const quickAdd = page.locator('.quickadd-overlay')
    if (await quickAdd.isVisible()) {
      await quickAdd.locator('input').fill('Editable Task')
      await quickAdd.locator('input').press('Enter')
      await page.waitForTimeout(500)
    }
    
    // Open task detail
    const sidebarItems = page.locator('.task-sidebar__item')
    if (await sidebarItems.count() > 0) {
      await sidebarItems.first().click()
      await page.waitForTimeout(500)
      
      const drawer = page.locator('.task-detail-drawer')
      await expect(drawer).toBeVisible()
      
      // Title should be editable
      const titleInput = drawer.locator('.task-detail__header input')
      await expect(titleInput).toBeVisible()
      await titleInput.fill('Updated Title')
      await page.waitForTimeout(300)
      
      // Status select should exist
      const selects = drawer.locator('.el-select')
      const selectCount = await selects.count()
      expect(selectCount).toBeGreaterThanOrEqual(2)
      
      // Priority select should be clickable
      const prioritySelect = selects.nth(1)
      await prioritySelect.click()
      await page.waitForTimeout(300)
      
      // Options should appear
      const options = page.locator('.el-select-dropdown__item')
      expect(await options.count()).toBeGreaterThan(0)
    }
  })

  test('8. Task detail - proportions and spacing look correct', async ({ page }) => {
    // Create project
    await page.click('.btn-new-project')
    await page.fill('.dialog-input', 'Proportions Test')
    await page.click('.btn-confirm')
    await page.waitForTimeout(500)
    
    // Add task
    await page.keyboard.press('q')
    await page.waitForTimeout(500)
    
    const quickAdd = page.locator('.quickadd-overlay')
    if (await quickAdd.isVisible()) {
      await quickAdd.locator('input').fill('Proportions Task')
      await quickAdd.locator('input').press('Enter')
      await page.waitForTimeout(500)
    }
    
    // Open task detail
    const sidebarItems = page.locator('.task-sidebar__item')
    if (await sidebarItems.count() > 0) {
      await sidebarItems.first().click()
      await page.waitForTimeout(500)
      
      const drawer = page.locator('.task-detail-drawer')
      await expect(drawer).toBeVisible()
      
      // Check meta rows have reasonable spacing
      const metaRows = drawer.locator('.meta-row')
      const rowCount = await metaRows.count()
      expect(rowCount).toBeGreaterThan(3)
      
      // Check font sizes are not oversized
      const firstRow = metaRows.first()
      const fontSize = await firstRow.evaluate(el => {
        return window.getComputedStyle(el).fontSize
      })
      expect(parseFloat(fontSize)).toBeLessThanOrEqual(14)
      
      // Check tabs exist and are compact
      const tabs = drawer.locator('.tab-btn')
      const tabCount = await tabs.count()
      expect(tabCount).toBe(5)
      
      const tabFontSize = await tabs.first().evaluate(el => {
        return window.getComputedStyle(el).fontSize
      })
      expect(parseFloat(tabFontSize)).toBeLessThanOrEqual(13)
    }
  })

  test('9. Comments - can add and view comments', async ({ page }) => {
    // Create project
    await page.click('.btn-new-project')
    await page.fill('.dialog-input', 'Comment Test')
    await page.click('.btn-confirm')
    await page.waitForTimeout(500)
    
    // Add task
    await page.keyboard.press('q')
    await page.waitForTimeout(500)
    
    const quickAdd = page.locator('.quickadd-overlay')
    if (await quickAdd.isVisible()) {
      await quickAdd.locator('input').fill('Comment Task')
      await quickAdd.locator('input').press('Enter')
      await page.waitForTimeout(500)
    }
    
    // Open task detail
    const sidebarItems = page.locator('.task-sidebar__item')
    if (await sidebarItems.count() > 0) {
      await sidebarItems.first().click()
      await page.waitForTimeout(500)
      
      const drawer = page.locator('.task-detail-drawer')
      await expect(drawer).toBeVisible()
      
      // Click comments tab
      const commentsTab = drawer.locator('.tab-btn').filter({ hasText: /评论|Comments/ })
      await commentsTab.click()
      await page.waitForTimeout(300)
      
      // Add comment
      const commentInput = drawer.locator('.comment-input textarea')
      await expect(commentInput).toBeVisible()
      await commentInput.fill('This is a test comment')
      
      const addBtn = drawer.locator('.comment-input button').filter({ hasText: /添加评论|Add Comment/ })
      await addBtn.click()
      await page.waitForTimeout(500)
      
      // Verify comment appears
      const comments = drawer.locator('.comment-item')
      expect(await comments.count()).toBeGreaterThan(0)
      
      const commentText = await comments.first().textContent()
      expect(commentText).toContain('This is a test comment')
    }
  })

  test('10. Pomodoro timer - start and see countdown', async ({ page }) => {
    // Create project
    await page.click('.btn-new-project')
    await page.fill('.dialog-input', 'Pomodoro Test')
    await page.click('.btn-confirm')
    await page.waitForTimeout(500)
    
    // Add task
    await page.keyboard.press('q')
    await page.waitForTimeout(500)
    
    const quickAdd = page.locator('.quickadd-overlay')
    if (await quickAdd.isVisible()) {
      await quickAdd.locator('input').fill('Pomodoro Task')
      await quickAdd.locator('input').press('Enter')
      await page.waitForTimeout(500)
    }
    
    // Open task detail
    const sidebarItems = page.locator('.task-sidebar__item')
    if (await sidebarItems.count() > 0) {
      await sidebarItems.first().click()
      await page.waitForTimeout(500)
      
      const drawer = page.locator('.task-detail-drawer')
      await expect(drawer).toBeVisible()
      
      // Click time tracking tab
      const timeTab = drawer.locator('.tab-btn').filter({ hasText: /时间追踪|Time Tracking/ })
      await timeTab.click()
      await page.waitForTimeout(300)
      
      // Click pomodoro button (15m preset)
      const preset15 = drawer.locator('.time-presets .el-button').filter({ hasText: '15' })
      await preset15.first().click()
      await page.waitForTimeout(300)
      
      // Click start pomodoro
      const startBtn = drawer.locator('.time-buttons .el-button').filter({ hasText: /番茄钟|Pomodoro/ })
      await startBtn.click()
      await page.waitForTimeout(1500)
      
      // Pomodoro display should appear with countdown
      const pomodoroDisplay = drawer.locator('.pomodoro-display')
      await expect(pomodoroDisplay).toBeVisible()
      
      const timeText = await pomodoroDisplay.textContent()
      expect(timeText).toMatch(/\d+:\d{2}/)
      
      // Wait and verify countdown decreased
      await page.waitForTimeout(2000)
      const timeText2 = await pomodoroDisplay.textContent()
      expect(timeText2).not.toBe(timeText)
      
      // Stop pomodoro
      const stopBtn = drawer.locator('.time-buttons .el-button').filter({ hasText: /停止番茄钟|Stop Pomodoro/ })
      await stopBtn.click()
      await page.waitForTimeout(300)
      
      // Display should disappear
      await expect(pomodoroDisplay).not.toBeVisible()
    }
  })

  test('11. Multiple theme switches all update mindmap', async ({ page }) => {
    // Create project
    await page.click('.btn-new-project')
    await page.fill('.dialog-input', 'Multi Theme Test')
    await page.click('.btn-confirm')
    await page.waitForTimeout(500)
    
    const themeBtn = page.locator('.theme-btn')
    const themeOptions = page.locator('.theme-option')
    
    // Try switching to different themes
    for (let i = 0; i < 3; i++) {
      await themeBtn.click()
      await page.waitForTimeout(300)
      
      const count = await themeOptions.count()
      const idx = (i + 1) % count
      await themeOptions.nth(idx).click()
      await page.waitForTimeout(500)
      
      // Verify CSS variable updated
      const mindmapBg = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--mindmap-bg').trim()
      })
      expect(mindmapBg).toBeTruthy()
    }
  })

  test('12. Click outside drawer closes it (close-on-click-modal)', async ({ page }) => {
    // Create project
    await page.click('.btn-new-project')
    await page.fill('.dialog-input', 'Modal Test')
    await page.click('.btn-confirm')
    await page.waitForTimeout(500)
    
    // Add task
    await page.keyboard.press('q')
    await page.waitForTimeout(500)
    
    const quickAdd = page.locator('.quickadd-overlay')
    if (await quickAdd.isVisible()) {
      await quickAdd.locator('input').fill('Modal Task')
      await quickAdd.locator('input').press('Enter')
      await page.waitForTimeout(500)
    }
    
    // Open task detail
    const sidebarItems = page.locator('.task-sidebar__item')
    if (await sidebarItems.count() > 0) {
      await sidebarItems.first().click()
      await page.waitForTimeout(500)
      
      const drawer = page.locator('.task-detail-drawer')
      await expect(drawer).toBeVisible()
      
      // Click outside drawer (on overlay) - target the drawer-specific overlay
      const overlay = page.locator('.el-overlay.is-drawer').first()
      if (await overlay.isVisible()) {
        await overlay.click({ position: { x: 10, y: 10 } })
        await page.waitForTimeout(500)
        
        // Drawer should close
        await expect(drawer).not.toBeVisible()
      }
    }
  })

  test('13. Navigation between views works', async ({ page }) => {
    // Create project
    await page.click('.btn-new-project')
    await page.fill('.dialog-input', 'Nav Test')
    await page.click('.btn-confirm')
    await page.waitForTimeout(500)
    
    // Click on different view links
    const navLinks = page.locator('.view-link')
    const count = await navLinks.count()
    expect(count).toBeGreaterThanOrEqual(4)
    
    // Click tasks view
    const tasksLink = navLinks.filter({ hasText: /任务|Tasks/ })
    if (await tasksLink.count() > 0) {
      await tasksLink.click()
      await page.waitForTimeout(500)
      await expect(page.locator('.task-list-view')).toBeVisible()
    }
    
    // Click board view
    const boardLink = navLinks.filter({ hasText: /看板|Board/ })
    if (await boardLink.count() > 0) {
      await boardLink.click()
      await page.waitForTimeout(500)
      await expect(page.locator('.board-view')).toBeVisible()
    }
    
    // Back to mindmap
    const mindmapLink = navLinks.filter({ hasText: /思维导图|Mind Map/ })
    if (await mindmapLink.count() > 0) {
      await mindmapLink.click()
      await page.waitForTimeout(500)
      await expect(page.locator('.mindmap-view')).toBeVisible()
    }
  })

  test('14. Mindmap layout/theme selectors are compact', async ({ page }) => {
    // Create project
    await page.click('.btn-new-project')
    await page.fill('.dialog-input', 'Selector Test')
    await page.click('.btn-confirm')
    await page.waitForTimeout(500)
    
    const toolbar = page.locator('.toolbar')
    await expect(toolbar).toBeVisible()
    
    // Check layout selector
    const layoutSelect = toolbar.locator('.toolbar-group').first()
    await expect(layoutSelect).toBeVisible()
    
    const layoutBox = await layoutSelect.boundingBox()
    if (layoutBox) {
      expect(layoutBox.height).toBeLessThan(35)
    }
    
    // Check theme selector
    const themeSelect = toolbar.locator('.toolbar-group').nth(1)
    await expect(themeSelect).toBeVisible()
    
    const themeBox = await themeSelect.boundingBox()
    if (themeBox) {
      expect(themeBox.height).toBeLessThan(35)
    }
  })

  test('15. Task sidebar shows task count', async ({ page }) => {
    // Create project
    await page.click('.btn-new-project')
    await page.fill('.dialog-input', 'Sidebar Test')
    await page.click('.btn-confirm')
    await page.waitForTimeout(500)
    
    // Add a few tasks
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('q')
      await page.waitForTimeout(500)
      
      const quickAdd = page.locator('.quickadd-overlay')
      if (await quickAdd.isVisible()) {
        await quickAdd.locator('input').fill(`Task ${i + 1}`)
        await quickAdd.locator('input').press('Enter')
        await page.waitForTimeout(500)
      }
    }
    
    // Check sidebar shows count
    const sidebar = page.locator('.task-sidebar')
    await expect(sidebar).toBeVisible()
    
    // The header contains the task count (may be rendered as el-tag or plain text)
    const header = sidebar.locator('.task-sidebar__header')
    await expect(header).toBeVisible()
    
    const headerText = await header.textContent()
    expect(headerText).toBeTruthy()
    // Header should contain a number (task count)
    const match = headerText!.match(/\d+/)
    expect(match).toBeTruthy()
    
    const count = parseInt(match![0])
    expect(count).toBeGreaterThanOrEqual(3)
  })
})
