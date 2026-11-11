<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { supabase } from '../lib/supabase.js'
import { store, loadAll } from './store.js'
import '../styles/admin.css'
import Households from './Households.vue'
import Inbox from './Inbox.vue'
import Bottles from './Bottles.vue'
import LucyPosts from './LucyPosts.vue'
import Email from './Email.vue'
import Events from './Events.vue'

const session = ref(null)
const checking = ref(true)
const isAdmin = ref(false)
const tab = ref('households')
const login = ref({ email: '', password: '' })
const loginError = ref('')
const signingIn = ref(false)
let sub

const newCount = computed(() => store.submissions.filter((s) => s.status === 'new').length)
const tabs = computed(() => [
  { id: 'households', label: 'Guest list' },
  { id: 'inbox', label: newCount.value ? `Inbox (${newCount.value})` : 'Inbox' },
  { id: 'email', label: 'Email' },
  { id: 'bottles', label: 'Bottle notes' },
  { id: 'posts', label: "Lucy's sketchbook" },
  { id: 'events', label: 'Events' },
])

async function refresh(newSession) {
  session.value = newSession
  isAdmin.value = false
  if (newSession) {
    const { data } = await supabase.rpc('is_admin')
    isAdmin.value = data === true
    if (isAdmin.value) await loadAll()
  }
  checking.value = false
}

onMounted(async () => {
  document.title = "Admin | Lucy's Bat Mitzvah"
  const { data } = await supabase.auth.getSession()
  await refresh(data.session)
  sub = supabase.auth.onAuthStateChange((event, s) => {
    // Token refreshes keep the same person signed in; nothing to reload.
    if (event === 'SIGNED_IN' && s?.user?.id === session.value?.user?.id) return
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') refresh(s)
  })
})
onUnmounted(() => sub?.data?.subscription?.unsubscribe())

async function signIn() {
  loginError.value = ''
  signingIn.value = true
  const { error } = await supabase.auth.signInWithPassword(login.value)
  signingIn.value = false
  if (error) loginError.value = 'That email and password did not match. Try again.'
}
</script>

<template>
  <div class="admin">
    <p v-if="checking" class="admin__center">Loading</p>

    <form v-else-if="!session" class="login" @submit.prevent="signIn">
      <img src="/art/clam.webp" alt="" />
      <h1>Admin sign in</h1>
      <label class="afield"><span>Email</span><input v-model="login.email" type="email" autocomplete="username" required /></label>
      <label class="afield"><span>Password</span><input v-model="login.password" type="password" autocomplete="current-password" required /></label>
      <p v-if="loginError" class="aerror" role="alert">{{ loginError }}</p>
      <button class="abtn abtn--primary" :disabled="signingIn">{{ signingIn ? 'Signing in' : 'Sign in' }}</button>
    </form>

    <div v-else-if="!isAdmin" class="login">
      <h1>Not on the admin list</h1>
      <p>{{ session.user.email }} is signed in but is not listed in the admins table. Add the email there, then sign in again.</p>
      <button class="abtn" @click="supabase.auth.signOut()">Sign out</button>
    </div>

    <template v-else>
      <header class="abar">
        <a class="abar__brand" href="/" target="_blank" rel="noopener">
          <img src="/art/turtle.webp" alt="" />
          <span>Lucy's Bat Mitzvah</span>
        </a>
        <nav class="abar__tabs" aria-label="Admin sections">
          <button v-for="t in tabs" :key="t.id" :class="{ 'is-on': tab === t.id }" @click="tab = t.id">{{ t.label }}</button>
        </nav>
        <button class="abtn abtn--quiet" @click="supabase.auth.signOut()">Sign out</button>
      </header>

      <main class="amain">
        <Households v-if="tab === 'households'" />
        <Inbox v-else-if="tab === 'inbox'" />
        <Email v-else-if="tab === 'email'" :user-email="session.user.email" />
        <Bottles v-else-if="tab === 'bottles'" />
        <LucyPosts v-else-if="tab === 'posts'" />
        <Events v-else-if="tab === 'events'" />
      </main>
    </template>

    <div v-if="store.toast" class="atoast" :class="'atoast--' + store.toastKind" role="status">{{ store.toast }}</div>
  </div>
</template>
