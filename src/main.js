import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import '@fontsource/patrick-hand/400.css'
import '@fontsource-variable/shantell-sans/full.css'
import './styles/base.css'
import App from './App.vue'
import Dive from './Dive.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Dive },
    // Personal link for one household. Same page, with a greeting and a linked address form.
    { path: '/i/:token', component: Dive, props: true },
    // The animated save the date, on its own page so it can be shared or exported as a video.
    { path: '/movie', component: () => import('./Movie.vue') },
    { path: '/admin', component: () => import('./admin/Admin.vue') },
    { path: '/:rest(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

createApp(App).use(router).mount('#app')
