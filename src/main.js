import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import '@fontsource/patrick-hand/400.css'
import '@fontsource-variable/shantell-sans/full.css'
import './styles/base.css'
import App from './App.vue'
import Home from './Home.vue'
import ContactPage from './ContactPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // Meet Lucy, or Coming soon while it is switched off in the admin.
    { path: '/', component: Home },
    // Personal link for one household: "Contact info up to date?"
    { path: '/i/:token', component: ContactPage, props: true },
    // The same contact form for anyone without a personal link.
    { path: '/address', component: ContactPage },
    // The animated save the date, on its own page so it can be shared or exported as a video.
    { path: '/movie', component: () => import('./Movie.vue') },
    { path: '/admin', component: () => import('./admin/Admin.vue') },
    { path: '/:rest(.*)*', redirect: '/' },
  ],
  scrollBehavior: (to, from) => (to.path === from.path ? false : { top: 0 }),
})

createApp(App).use(router).mount('#app')
