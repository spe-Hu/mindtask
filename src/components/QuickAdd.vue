<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useTaskStore } from '@/stores/task'
import { useLocaleStore } from '@/stores/locale'
import { parseQuickAdd } from '@/utils/dateParser'
import { ElMessage } from 'element-plus'

const taskStore = useTaskStore()
const localeStore = useLocaleStore()
const t = localeStore.t

const isOpen = ref(false)
const inputText = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const preview = ref<{ title: string; dueDate: string | null; priority: string | null; tags: string[] } | null>(null)

function open() { 
  isOpen.value = true
  inputText.value = ''
  preview.value = null
  nextTick(() => inputRef.value?.focus()) 
}

function close() { 
  isOpen.value = false
  inputText.value = '' 
}

watch(inputText, (val) => { 
  if (val.trim()) {
    preview.value = parseQuickAdd(val)
  } else {
    preview.value = null
  }
})

async function submit() {
  if (!inputText.value.trim()) return
  const parsed = parseQuickAdd(inputText.value)
  await taskStore.createTask({ 
    title: parsed.title, 
    dueDate: parsed.dueDate, 
    priority: (parsed.priority as any) || 'medium', 
    tags: parsed.tags 
  })
  ElMessage.success(t('task.created') + ': ' + parsed.title)
  close()
}

function onQuickAddOpen(e: Event) { 
  open() 
}

onMounted(() => { 
  document.addEventListener('quickadd:open', onQuickAddOpen) 
})

onUnmounted(() => { 
  document.removeEventListener('quickadd:open', onQuickAddOpen) 
})
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="quickadd-overlay" @click.self="close">
      <div class="quickadd-dialog" @keydown.enter="submit" @keydown.escape="close">
        <div class="quickadd-input-row">
          <span class="quickadd-icon">+</span>
          <input 
            ref="inputRef" 
            v-model="inputText" 
            type="text" 
            class="quickadd-input" 
            :placeholder="t('task.quickAddPlaceholder')" 
            autofocus 
          />
          <button v-if="inputText" class="quickadd-submit" @click="submit">{{ t('common.add') }}</button>
        </div>
        <div v-if="preview" class="quickadd-preview">
          <span class="preview-title">{{ preview.title }}</span>
          <el-tag v-if="preview.dueDate" size="small" type="info">{{ preview.dueDate }}</el-tag>
          <el-tag v-if="preview.priority" size="small" :type="preview.priority === 'urgent' ? 'danger' : preview.priority === 'high' ? 'warning' : 'info'">{{ t('priority.' + preview.priority) }}</el-tag>
          <el-tag v-for="tag in preview.tags" :key="tag" size="small">#{{ tag }}</el-tag>
        </div>
        <div class="quickadd-hints">
          <span>{{ t('shortcuts.quickAddHint') }}</span>
          <span>{{ t('shortcuts.enterToAdd') }}</span>
          <span>{{ t('shortcuts.escToClose') }}</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.quickadd-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); display: flex; align-items: flex-start; justify-content: center; padding-top: 120px; z-index: 10000 }
.quickadd-dialog { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 12px; width: 560px; max-width: 90vw; padding: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.5) }
.quickadd-input-row { display: flex; align-items: center; gap: 8px }
.quickadd-icon { font-size: 24px; color: var(--c-primary); font-weight: 700 }
.quickadd-input { flex: 1; background: transparent; border: none; outline: none; font-size: 18px; color: var(--c-text); padding: 8px 0 }
.quickadd-input::placeholder { color: var(--c-text-3) }
.quickadd-submit { background: var(--c-primary); color: white; border: none; border-radius: 8px; padding: 6px 16px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.15s }
.quickadd-submit:hover { opacity: 0.9; transform: translateY(-1px) }
.quickadd-preview { display: flex; align-items: center; gap: 8px; padding: 8px 0 4px; flex-wrap: wrap }
.preview-title { font-size: 14px; color: var(--c-text-2) }
.quickadd-hints { display: flex; gap: 12px; padding-top: 8px; border-top: 1px solid var(--c-border); margin-top: 8px }
.quickadd-hints span { font-size: 11px; color: var(--c-text-3); background: var(--c-bg-3); padding: 2px 8px; border-radius: 4px }
</style>
