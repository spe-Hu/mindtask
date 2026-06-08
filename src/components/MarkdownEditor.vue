<template>
  <div class="markdown-editor">
    <div class="editor-tabs">
      <button 
        :class="{ active: mode === 'edit' }"
        @click="mode = 'edit'"
      >
        {{ t('common.edit') }}
      </button>
      <button 
        :class="{ active: mode === 'preview' }"
        @click="mode = 'preview'"
      >
        {{ t('common.preview') }}
      </button>
    </div>
    
    <div v-if="mode === 'edit'" class="editor-input">
      <textarea
        v-model="content"
        @input="updateValue"
        :placeholder="t('task.descriptionPlaceholder')"
      ></textarea>
    </div>
    
    <div v-else class="editor-preview markdown-body" v-html="renderedContent"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useLocaleStore } from '@/stores/locale'
import { marked } from 'marked'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const localeStore = useLocaleStore()
const t = localeStore.t

const mode = ref<'edit' | 'preview'>('edit')
const content = ref(props.modelValue)

const renderedContent = computed(() => {
  if (!content.value) return ''
  return marked(content.value)
})

function updateValue() {
  emit('update:modelValue', content.value)
}

watch(() => props.modelValue, (newValue) => {
  if (newValue !== content.value) {
    content.value = newValue
  }
})
</script>

<style scoped>
.markdown-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.editor-tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--c-border);
  padding-bottom: 8px;
}

.editor-tabs button {
  padding: 6px 16px;
  border: none;
  background: transparent;
  color: var(--c-text-2);
  cursor: pointer;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
}

.editor-tabs button:hover {
  background: var(--c-surface-hover);
  color: var(--c-text);
}

.editor-tabs button.active {
  background: var(--c-primary);
  color: white;
}

.editor-input textarea {
  width: 100%;
  min-height: 200px;
  padding: 12px;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  background: var(--c-bg-2);
  color: var(--c-text);
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
}

.editor-input textarea:focus {
  outline: none;
  border-color: var(--c-primary);
}

.editor-preview {
  min-height: 200px;
  padding: 16px;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  background: var(--c-bg-2);
  overflow-y: auto;
}

/* Markdown styles */
.markdown-body {
  line-height: 1.6;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  margin-top: 16px;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--c-text);
}

.markdown-body :deep(h1) { font-size: 24px; }
.markdown-body :deep(h2) { font-size: 20px; }
.markdown-body :deep(h3) { font-size: 18px; }

.markdown-body :deep(p) {
  margin: 8px 0;
  color: var(--c-text);
}

.markdown-body :deep(code) {
  background: var(--c-bg-3);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 13px;
}

.markdown-body :deep(pre) {
  background: var(--c-bg-3);
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 12px 0;
}

.markdown-body :deep(pre code) {
  background: transparent;
  padding: 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 8px 0;
  padding-left: 24px;
}

.markdown-body :deep(li) {
  margin: 4px 0;
  color: var(--c-text);
}

.markdown-body :deep(blockquote) {
  border-left: 4px solid var(--c-primary);
  padding-left: 16px;
  margin: 12px 0;
  color: var(--c-text-2);
  font-style: italic;
}

.markdown-body :deep(a) {
  color: var(--c-primary);
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 12px 0;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid var(--c-border);
  padding: 8px;
  text-align: left;
}

.markdown-body :deep(th) {
  background: var(--c-bg-3);
  font-weight: 600;
}

.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid var(--c-border);
  margin: 16px 0;
}

.markdown-body :deep(img) {
  max-width: 100%;
  border-radius: 8px;
}
</style>
