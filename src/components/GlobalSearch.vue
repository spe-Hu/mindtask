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
                <span v-if="result.type === 'task'" class="search-type-icon search-type-icon--task">T</span>
                <span v-else class="search-type-icon search-type-icon--mind">M</span>
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
.global-search {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 100px;
  z-index: 10000;
  cursor: pointer;
}

.search-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 100px;
  z-index: 10000;
  cursor: pointer;
}

.global-search__dialog {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--r-xl);
  width: 600px;
  max-width: 90vw;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-xl);
  animation: slideUp var(--t-slow) cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.global-search__input-wrapper {
  display: flex;
  align-items: center;
  padding: var(--s-4) var(--s-5);
  border-bottom: 1px solid var(--c-border);
}

.global-search__icon {
  font-size: var(--fs-xl);
  color: var(--c-text-2);
  margin-right: var(--s-3);
}

.global-search__input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: var(--fs-lg);
  color: var(--c-text);
}

.global-search__input::placeholder {
  color: var(--c-text-3);
}

.global-search__close {
  font-size: var(--fs-sm);
  color: var(--c-text-3);
  padding: var(--s-1) var(--s-2);
  background: var(--c-bg-3);
  border-radius: var(--r-sm);
  cursor: pointer;
  transition: all var(--t-fast);
}

.global-search__close:hover {
  background: var(--c-bg);
  color: var(--c-text);
}

.global-search__results {
  flex: 1;
  overflow-y: auto;
  padding: var(--s-3);
}

.global-search__result {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-3) var(--s-4);
  border-radius: var(--r-md);
  cursor: pointer;
  transition: all var(--t-fast);
  margin-bottom: var(--s-1);
}

.global-search__result:hover {
  background: var(--c-surface-hover);
}

.global-search__result-icon {
  font-size: var(--fs-lg);
  color: var(--c-text-2);
  flex-shrink: 0;
}

.global-search__result-content {
  flex: 1;
  min-width: 0;
}

.global-search__result-title {
  font-size: var(--fs-base);
  color: var(--c-text);
  font-weight: 500;
  margin-bottom: var(--s-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-search__result-meta {
  font-size: var(--fs-sm);
  color: var(--c-text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-search__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--s-12) var(--s-6);
  color: var(--c-text-3);
  text-align: center;
}

.global-search__empty-icon {
  font-size: 48px;
  margin-bottom: var(--s-4);
  opacity: 0.5;
}

.global-search__empty-text {
  font-size: var(--fs-base);
}

.global-search__footer {
  padding: var(--s-3) var(--s-5);
  border-top: 1px solid var(--c-border);
  display: flex;
  gap: var(--s-4);
  font-size: var(--fs-sm);
  color: var(--c-text-3);
}

.global-search__hint {
  display: flex;
  align-items: center;
  gap: var(--s-2);
}

.global-search__kbd {
  padding: 2px var(--s-2);
  background: var(--c-bg-3);
  border-radius: var(--r-sm);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
}
</style>
