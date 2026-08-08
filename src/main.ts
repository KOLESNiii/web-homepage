import { createApp } from 'vue'
import App from './App.vue'
import { initAnalytics } from './analytics'
import router from './router'
import './style.css'

const app = createApp(App)

initAnalytics()

app.use(router)

app.mount('#app')
