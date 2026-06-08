import { onMounted, onUnmounted } from 'vue'
import { useShortcuts } from './useShortcuts'

export function useKeyboardShortcuts() {
  const shortcuts = useShortcuts()

  onMounted(() => {
    shortcuts.init()
  })

  onUnmounted(() => {
    shortcuts.destroy()
  })
}
