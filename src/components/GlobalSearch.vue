<script setup lang="ts">
/**
 * 全局搜索组件
 * 支持搜索任务和思维导图节点，使用 Ctrl+F 快捷键打开
 */
import { ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useSearchStore } from '@/stores/search'
import type { SearchResult } from '@/stores/search'

const router = useRouter()
const searchStore = useSearchStore()

const searchInput = ref<HTMLInputElement | null>(null)

// 当搜索框打开时，自动聚焦
watch(() => searchStore.isOpen, async (isOpen) => {
  if (isOpen) {
    await nextTick()
    searchInput.value?.focus()
  }
})

function handleResultClick(result: SearchResult) {
  if (result.route) {
    router.push(result.route)
    searchStore.closeSearch()
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    searchStore.closeSearch()
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="searchStore.isOpen" class="search-overlay" @click.self="searchStore.closeSearch()" @keydown="handleKeydown">
      <div class="search-dialog">
        <div class="search-header">
          <input
            ref="searchInput"
            v-model="searchStore.searchQuery"
            type="text"
            placeholder="搜索任务或思维导图节点..."
            class="search-input"
            @keydown.enter="handleKeydown"
          />
          <button class="search-close" @click="searchStore.closeSearch()">
            <span>ESC</span>
          </button>
        </div>
        
        <div class="search-results">
          <div v-if="!searchStore.searchQuery.trim()" class="search-empty">
            <p>输入关键词开始搜索</p>
            <p class="search-hint">支持搜索任务标题、描述、标签和思维导图节点</p>
          </div>
          
          <div v-else-if="searchStore.results.length === 0" class="search-empty">
            <p>未找到相关结果</p>
            <p class="search-hint">尝试使用不同的关键词</p>
          </div>
          
          <div v-else class="search-list">
            <div
              v-for="result in searchStore.results"
              :key="result.id"
              class="search-item"
              @click="handleResultClick(result)"
            >
              <div class="search-item-icon">
                <span v-if="result.type === 'task'">📋</span>
                <span v-else>🧠</span>
              </div>
              <div class="search-item-content">
                <div class="search-item-title">{{ result.title }}</div>
                <div v-if="result.description" class="search-item-desc">{{ result.description }}</div>
              </div>
              <div class="search-item-type">
                {{ result.type === 'task' ? '任务' : '导图' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.search-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 100px;
  z-index: 10000;
}

.search-dialog {
  background: #1e1e36;
  border: 1px solid #3a3a5c;
  border-radius: 12px;
  width: 600px;
  max-height: 500px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.search-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #2d2d44;
}

.search-input {
  flex: 1;
  background: #0f0f1a;
  border: 1px solid #3a3a5c;
  border-radius: 6px;
  padding: 10px 14px;
  color: #e0e0f0;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #667eea;
}

.search-input::placeholder {
  color: #5a5a78;
}

.search-close {
  background: #2d2d44;
  border: none;
  border-radius: 4px;
  padding: 6px 10px;
  color: #8b8b9e;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.search-close:hover {
  background: #3a3a5c;
  color: #e0e0f0;
}

.search-results {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.search-empty {
  text-align: center;
  padding: 40px 20px;
  color: #8b8b9e;
}

.search-empty p {
  margin: 8px 0;
}

.search-hint {
  font-size: 13px;
  color: #5a5a78;
}

.search-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.search-item:hover {
  background: rgba(102, 126, 234, 0.12);
}

.search-item-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.search-item-content {
  flex: 1;
  min-width: 0;
}

.search-item-title {
  font-size: 14px;
  color: #e0e0f0;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-item-desc {
  font-size: 12px;
  color: #8b8b9e;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-item-type {
  font-size: 11px;
  color: #667eea;
  background: rgba(102, 126, 234, 0.15);
  padding: 3px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}
</style>
