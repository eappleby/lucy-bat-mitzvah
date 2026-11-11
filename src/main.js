import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import '@fontsource/patrick-hand/400.css'
import '@fontsource-variable/shantell-sans/full.css'
import './styles/base.css'
import App from './App.vue'
import Dive from './Dive.vue'
import AddressPage from './AddressPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Dive },
    // Personal link for one household: "Is this your address?"
    { path: '/i/:token', component: AddressPage, props: true },
    // The same address form for anyone without a personal link.
    { path: '/address', component: AddressPage },
    // The animated save the date, on its own page so it can be shared or exported as a video.
    { path: '/movie', component: () => import('./Movie.vue') },
    { path: '/admin', component: () => import('./admin/Admin.vue') },
    { path: '/:rest(.*)*', redirect: '/' },
  ],
  scrollBehavior: (to, from) => (to.path === from.path ? false : { top: 0 }),
})

createApp(App).use(router).mount('#app')
