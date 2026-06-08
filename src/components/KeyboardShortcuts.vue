<script setup lang="ts">
import { useLocaleStore } from '@/stores/locale'
const localeStore = useLocaleStore()
const t = localeStore.t

defineProps<{ isOpen: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const sections = [
  {
    titleKey: 'shortcuts.global',
    shortcuts: [
      { keys: ['Q'], labelKey: 'shortcuts.quickAdd' },
      { keys: ['Ctrl/\u2318', 'F'], labelKey: 'shortcuts.search' },
      { keys: ['Ctrl/\u2318', 'Z'], labelKey: 'shortcuts.undo' },
      { keys: ['Ctrl/\u2318', '\u21E7', 'Z'], labelKey: 'shortcuts.redo' },
      { keys: ['?'], labelKey: 'shortcuts.showHelp' },
      { keys: ['Esc'], labelKey: 'shortcuts.close' },
    ],
  },
  {
    titleKey: 'shortcuts.mindmap',
    shortcuts: [
      { keys: ['\u2191', '\u2193', '\u2190', '\u2192'], labelKey: 'shortcuts.navigate' },
      { keys: ['Tab'], labelKey: 'shortcuts.addChild' },
      { keys: ['Enter'], labelKey: 'shortcuts.editNode' },
      { keys: ['Del', 'Backspace'], labelKey: 'shortcuts.deleteNode' },
    ],
  },
  {
    titleKey: 'shortcuts.taskList',
    shortcuts: [
      { keys: ['\u2191', '\u2193'], labelKey: 'shortcuts.taskUp' },
      { keys: ['Space'], labelKey: 'shortcuts.taskToggle' },
      { keys: ['Enter'], labelKey: 'shortcuts.taskOpen' },
      { keys: ['X'], labelKey: 'shortcuts.taskSelect' },
      { keys: ['Del', 'Backspace'], labelKey: 'shortcuts.taskDelete' },
      { keys: ['Ctrl/\u2318', 'A'], labelKey: 'shortcuts.selectAll' },
    ],
  },
]

function onOverlayClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('kb-overlay')) emit('close')
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="kb-overlay" @click="onOverlayClick" @keydown="onKeydown">
      <div class="kb-dialog">
        <div class="kb-header">
          <h2 class="kb-title">{{ t('shortcuts.title') }}</h2>
          <button class="kb-close" @click="emit('close')" :title="t('common.close')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="kb-sections">
          <div v-for="section in sections" :key="section.titleKey" class="kb-section">
            <h3 class="kb-section-title">{{ t(section.titleKey) }}</h3>
            <div class="kb-row" v-for="s in section.shortcuts" :key="s.labelKey">
              <span class="kb-label">{{ t(s.labelKey) }}</span>
              <span class="kb-keys">
                <template v-for="(key, i) in s.keys" :key="i">
                  <kbd class="kb-key">{{ key }}</kbd>
                  <span v-if="i < s.keys.length - 1 && s.keys.length > 1" class="kb-plus">+</span>
                </template>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.kb-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 10001 }
.kb-dialog { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 12px; width: 560px; max-width: 90vw; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5) }
.kb-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--c-border) }
.kb-title { font-size: 18px; font-weight: 600; color: var(--c-text); margin: 0 }
.kb-close { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: none; background: none; color: var(--c-text-3); cursor: pointer; border-radius: 6px; transition: all 0.15s }
.kb-close:hover { background: var(--c-danger-light); color: var(--c-danger) }
.kb-sections { padding: 12px 20px 20px }
.kb-section { margin-bottom: 16px }
.kb-section:last-child { margin-bottom: 0 }
.kb-section-title { font-size: 13px; font-weight: 600; color: var(--c-primary); margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px }
.kb-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0 }
.kb-label { font-size: 13px; color: var(--c-text-2) }
.kb-keys { display: flex; align-items: center; gap: 4px }
.kb-key { display: inline-flex; align-items: center; justify-content: center; min-width: 24px; height: 24px; padding: 0 6px; background: var(--c-bg-3); border: 1px solid var(--c-border-light); border-radius: 4px; font-size: 11px; font-weight: 600; color: var(--c-text); font-family: var(--mono, monospace) }
.kb-plus { font-size: 11px; color: var(--c-text-3) }
</style>