import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

// Import Vant styles
import 'vant/lib/index.css'

// Import global styles
import './styles/global.less'

// Create app
const app = createApp(App)

// Use Pinia
const pinia = createPinia()
app.use(pinia)

// Use Router
app.use(router)

// Mount app
app.mount('#app')
