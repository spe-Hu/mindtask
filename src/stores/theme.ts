import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Theme = 'midnight' | 'ocean' | 'sunset' | 'forest' | 'lavender' | 'coral' | 'slate'

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref<Theme>('midnight')

  const themes = {
    midnight: {
      name: 'midnight',
      label: '午夜蓝',
      colors: {
        primary: '#6366f1',
        'primary-hover': '#4f46e5',
        'primary-light': 'rgba(99, 102, 241, 0.1)',
        bg: '#0f172a',
        'bg-2': '#1e293b',
        'bg-3': '#334155',
        surface: '#1e293b',
        'surface-hover': '#334155',
        border: '#334155',
        'border-light': '#475569',
        text: '#f1f5f9',
        'text-2': '#cbd5e1',
        'text-3': '#94a3b8',
        success: '#10b981',
        'success-light': 'rgba(16, 185, 129, 0.1)',
        warning: '#f59e0b',
        'warning-light': 'rgba(245, 158, 11, 0.1)',
        danger: '#ef4444',
        'danger-light': 'rgba(239, 68, 68, 0.1)',
        info: '#06b6d4',
        'info-light': 'rgba(6, 182, 212, 0.1)',
      },
    },
    ocean: {
      name: 'ocean',
      label: '海洋蓝',
      colors: {
        primary: '#0891b2',
        'primary-hover': '#0e7490',
        'primary-light': 'rgba(8, 145, 178, 0.1)',
        bg: '#0c4a6e',
        'bg-2': '#075985',
        'bg-3': '#0369a1',
        surface: '#075985',
        'surface-hover': '#0369a1',
        border: '#0369a1',
        'border-light': '#0284c7',
        text: '#f0f9ff',
        'text-2': '#bae6fd',
        'text-3': '#7dd3fc',
        success: '#10b981',
        'success-light': 'rgba(16, 185, 129, 0.1)',
        warning: '#f59e0b',
        'warning-light': 'rgba(245, 158, 11, 0.1)',
        danger: '#ef4444',
        'danger-light': 'rgba(239, 68, 68, 0.1)',
        info: '#06b6d4',
        'info-light': 'rgba(6, 182, 212, 0.1)',
      },
    },
    sunset: {
      name: 'sunset',
      label: '日落橙',
      colors: {
        primary: '#f97316',
        'primary-hover': '#ea580c',
        'primary-light': 'rgba(249, 115, 22, 0.1)',
        bg: '#431407',
        'bg-2': '#7c2d12',
        'bg-3': '#9a3412',
        surface: '#7c2d12',
        'surface-hover': '#9a3412',
        border: '#9a3412',
        'border-light': '#c2410c',
        text: '#fff7ed',
        'text-2': '#fed7aa',
        'text-3': '#fdba74',
        success: '#10b981',
        'success-light': 'rgba(16, 185, 129, 0.1)',
        warning: '#fbbf24',
        'warning-light': 'rgba(251, 191, 36, 0.1)',
        danger: '#ef4444',
        'danger-light': 'rgba(239, 68, 68, 0.1)',
        info: '#06b6d4',
        'info-light': 'rgba(6, 182, 212, 0.1)',
      },
    },
    forest: {
      name: 'forest',
      label: '森林绿',
      colors: {
        primary: '#059669',
        'primary-hover': '#047857',
        'primary-light': 'rgba(5, 150, 105, 0.1)',
        bg: '#064e3b',
        'bg-2': '#065f46',
        'bg-3': '#047857',
        surface: '#065f46',
        'surface-hover': '#047857',
        border: '#047857',
        'border-light': '#059669',
        text: '#ecfdf5',
        'text-2': '#a7f3d0',
        'text-3': '#6ee7b7',
        success: '#10b981',
        'success-light': 'rgba(16, 185, 129, 0.1)',
        warning: '#f59e0b',
        'warning-light': 'rgba(245, 158, 11, 0.1)',
        danger: '#ef4444',
        'danger-light': 'rgba(239, 68, 68, 0.1)',
        info: '#06b6d4',
        'info-light': 'rgba(6, 182, 212, 0.1)',
      },
    },
    lavender: {
      name: 'lavender',
      label: '薰衣草紫',
      colors: {
        primary: '#a855f7',
        'primary-hover': '#9333ea',
        'primary-light': 'rgba(168, 85, 247, 0.1)',
        bg: '#3b0764',
        'bg-2': '#581c87',
        'bg-3': '#6b21a8',
        surface: '#581c87',
        'surface-hover': '#6b21a8',
        border: '#6b21a8',
        'border-light': '#7e22ce',
        text: '#faf5ff',
        'text-2': '#e9d5ff',
        'text-3': '#d8b4fe',
        success: '#10b981',
        'success-light': 'rgba(16, 185, 129, 0.1)',
        warning: '#f59e0b',
        'warning-light': 'rgba(245, 158, 11, 0.1)',
        danger: '#ef4444',
        'danger-light': 'rgba(239, 68, 68, 0.1)',
        info: '#06b6d4',
        'info-light': 'rgba(6, 182, 212, 0.1)',
      },
    },
    coral: {
      name: 'coral',
      label: '珊瑚粉',
      colors: {
        primary: '#f43f5e',
        'primary-hover': '#e11d48',
        'primary-light': 'rgba(244, 63, 94, 0.1)',
        bg: '#4c0519',
        'bg-2': '#881337',
        'bg-3': '#9f1239',
        surface: '#881337',
        'surface-hover': '#9f1239',
        border: '#9f1239',
        'border-light': '#be123c',
        text: '#fff1f2',
        'text-2': '#fecdd3',
        'text-3': '#fda4af',
        success: '#10b981',
        'success-light': 'rgba(16, 185, 129, 0.1)',
        warning: '#f59e0b',
        'warning-light': 'rgba(245, 158, 11, 0.1)',
        danger: '#ef4444',
        'danger-light': 'rgba(239, 68, 68, 0.1)',
        info: '#06b6d4',
        'info-light': 'rgba(6, 182, 212, 0.1)',
      },
    },
    slate: {
      name: 'slate',
      label: '石墨灰',
      colors: {
        primary: '#64748b',
        'primary-hover': '#475569',
        'primary-light': 'rgba(100, 116, 139, 0.1)',
        bg: '#0f172a',
        'bg-2': '#1e293b',
        'bg-3': '#334155',
        surface: '#1e293b',
        'surface-hover': '#334155',
        border: '#334155',
        'border-light': '#475569',
        text: '#f8fafc',
        'text-2': '#cbd5e1',
        'text-3': '#94a3b8',
        success: '#10b981',
        'success-light': 'rgba(16, 185, 129, 0.1)',
        warning: '#f59e0b',
        'warning-light': 'rgba(245, 158, 11, 0.1)',
        danger: '#ef4444',
        'danger-light': 'rgba(239, 68, 68, 0.1)',
        info: '#06b6d4',
        'info-light': 'rgba(6, 182, 212, 0.1)',
      },
    },
  }

  function setTheme(theme: Theme) {
    currentTheme.value = theme
    localStorage.setItem('app-theme', theme)
    applyTheme()
  }

  function applyTheme() {
    const theme = themes[currentTheme.value]
    if (!theme) return

    const root = document.documentElement
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--c-${key}`, value)
    })
  }

  function loadTheme() {
    const saved = localStorage.getItem('app-theme') as Theme
    if (saved && themes[saved]) {
      setTheme(saved)
    } else {
      applyTheme()
    }
  }

  return {
    currentTheme,
    themes,
    setTheme,
    loadTheme,
  }
})
