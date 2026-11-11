<script setup>
// The page at /. Shows Meet Lucy when it is switched on in the admin, and Coming soon
// with a small game when it is off. Signed in admins always see Meet Lucy, with a note.
//
// Meet Lucy is loaded only when it will be shown, so its code is not sent to visitors
// while the page is off. Its photos in public/photos stay reachable by exact address.
import { defineAsyncComponent, onMounted, ref } from 'vue'
import { supabase } from './lib/supabase.js'

const Dive = defineAsyncComponent(() => import('./Dive.vue'))
const ComingSoon = defineAsyncComponent(() => import('./ComingSoon.vue'))

const view = ref('loading') // loading | open | preview | soon

onMounted(async () => {
  const [{ data: status }, { data: auth }] = await Promise.all([supabase.rpc('get_site_status'), supabase.auth.getSession()])
  if (status?.meet_lucy_open) return (view.value = 'open')
  if (auth.session) {
    const { data: admin } = await supabase.rpc('is_admin')
    if (admin === true) return (view.value = 'preview')
  }
  view.value = 'soon'
})
</script>

<template>
  <div v-if="view === 'loading'" class="home-wait" aria-busy="true"></div>
  <template v-else-if="view === 'open' || view === 'preview'">
    <p v-if="view === 'preview'" class="home-preview">Only admins can see this page right now. Everyone else sees Coming soon. Turn it on in the admin under Guest list.</p>
    <Dive />
  </template>
  <ComingSoon v-else />
</template>

<style>
.home-wait { min-height: 100svh; background: linear-gradient(180deg, #d9f3fb 0%, #a8e2f2 45%, #62c4e7 100%); }
.home-preview {
  position: fixed;
  left: 50%;
  bottom: 0.8rem;
  z-index: 80;
  max-width: calc(100% - 2rem);
  margin: 0;
  padding: 0.5rem 0.9rem;
  background: var(--ink);
  border-radius: 10px;
  color: #fff;
  font-size: 1rem;
  text-align: center;
  transform: translateX(-50%);
}
</style>
