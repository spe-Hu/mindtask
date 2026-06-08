import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import App from './App.vue'
import router from './router'
import { useThemeStore } from './stores/theme'
import { useLocaleStore } from './stores/locale'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus)

// Initialize theme and locale before mounting
const themeStore = useThemeStore(pinia)
const localeStore = useLocaleStore(pinia)

themeStore.loadTheme()
localeStore.loadLocale()

app.mount('#app')
