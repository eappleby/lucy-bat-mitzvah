<script setup>
import { computed, reactive, ref } from 'vue'
import { supabase } from '../lib/supabase.js'
import { store, toast, failed, loadHouseholds, loadSubmissions, formatWhen } from './store.js'

const showAll = ref(false)
const pick = reactive({}) // submission id -> chosen household id

const list = computed(() => store.submissions.filter((s) => showAll.value || s.status === 'new'))
const householdName = (id) => store.households.find((h) => h.id === id)?.name || 'a deleted household'

// Likely matches: same email, or a shared word in the name (ignoring "the", "family", and so on).
const STOP = new Set(['the', 'family', 'and', 'mr', 'mrs', 'ms', 'dr', '&'])
function suggestions(s) {
  const words = s.name.toLowerCase().split(/[^a-z']+/).filter((w) => w.length > 2 && !STOP.has(w))
  return store.households
    .filter((h) => {
      if (s.email && h.email && s.email.toLowerCase() === h.email.toLowerCase()) return true
      const hay = (h.name + ' ' + h.guests.map((g) => `${g.first_name} ${g.last_name || ''}`).join(' ')).toLowerCase()
      return words.some((w) => hay.includes(w))
    })
    .slice(0, 4)
}

function addressFields(s) {
  return {
    address1: s.address1, address2: s.address2, city: s.city, state: s.state, postal_code: s.postal_code,
    country: s.country || 'United States', address_updated_at: new Date().toISOString(),
  }
}

async function finish(s, household_id, status, message) {
  const { error } = await supabase.from('address_submissions').update({ status, household_id }).eq('id', s.id)
  if (failed(error, 'update the inbox')) return
  await Promise.all([loadHouseholds(), loadSubmissions()])
  toast(message)
}

async function createHousehold(s) {
  const { data, error } = await supabase
    .from('households')
    .insert({ name: s.name, email: s.email, phone: s.phone, ...addressFields(s) })
    .select('id')
    .single()
  if (failed(error, 'create the household')) return
  await finish(s, data.id, 'merged', `Added ${s.name} to the guest list`)
}

async function mergeInto(s, householdId) {
  if (!householdId) return toast('Pick a household first.', 'error')
  const target = store.households.find((h) => h.id === householdId)
  const fields = addressFields(s)
  if (s.email && !target.email) fields.email = s.email
  if (s.phone && !target.phone) fields.phone = s.phone
  const { error } = await supabase.from('households').update(fields).eq('id', householdId)
  if (failed(error, 'save the address')) return
  await finish(s, householdId, 'merged', `Address saved for ${target.name}`)
}

const confirming = ref(null)
async function remove(s) {
  if (confirming.value !== s.id) return (confirming.value = s.id)
  const { error } = await supabase.from('address_submissions').delete().eq('id', s.id)
  if (failed(error, 'delete the entry')) return
  await loadSubmissions()
  toast('Entry deleted')
}

const ignore = (s) => finish(s, s.household_id, 'ignored', 'Ignored')
const restore = (s) => finish(s, null, 'new', 'Moved back to the inbox')
</script>

<template>
  <section>
    <div class="atools">
      <h2>Addresses sent through the site</h2>
      <span class="atools__gap"></span>
      <label class="acheck"><input v-model="showAll" type="checkbox" /> Show handled ones too</label>
    </div>
    <p class="ahint">People who use their personal link are saved to their household automatically. Everyone else lands here for you to match.</p>

    <div v-if="!list.length" class="aempty">
      <h2>Inbox is clear</h2>
      <p>New addresses from the shared link will show up here.</p>
    </div>

    <article v-for="s in list" :key="s.id" class="acard" :class="'acard--' + s.status">
      <div class="acard__main">
        <h3>{{ s.name }}</h3>
        <p>
          {{ s.address1 }}<template v-if="s.address2">, {{ s.address2 }}</template><br />
          {{ s.city }}<template v-if="s.state">, {{ s.state }}</template> {{ s.postal_code }}
          <template v-if="s.country && s.country !== 'United States'"><br />{{ s.country }}</template>
        </p>
        <p v-if="s.email || s.phone" class="acard__meta">{{ [s.email, s.phone].filter(Boolean).join(' | ') }}</p>
        <blockquote v-if="s.note">{{ s.note }}</blockquote>
        <p class="acard__meta">Sent {{ formatWhen(s.created_at) }}</p>
      </div>

      <div v-if="s.status === 'new'" class="acard__actions">
        <div v-if="suggestions(s).length" class="acard__suggest">
          <span>Looks like:</span>
          <button v-for="h in suggestions(s)" :key="h.id" class="abtn abtn--small" @click="mergeInto(s, h.id)">Save to {{ h.name }}</button>
        </div>
        <div class="acard__row">
          <select v-model="pick[s.id]" aria-label="Choose a household">
            <option :value="undefined" disabled>Choose a household</option>
            <option v-for="h in store.households" :key="h.id" :value="h.id">{{ h.name }}</option>
          </select>
          <button class="abtn abtn--small" @click="mergeInto(s, pick[s.id])">Save to this household</button>
        </div>
        <div class="acard__row">
          <button class="abtn abtn--small abtn--primary" @click="createHousehold(s)">Add as a new household</button>
          <button class="abtn abtn--small abtn--quiet" @click="ignore(s)">Ignore</button>
          <button class="abtn abtn--small abtn--danger" @click="remove(s)">{{ confirming === s.id ? 'Yes, delete' : 'Delete' }}</button>
        </div>
      </div>
      <div v-else class="acard__actions">
        <span class="achip" :class="s.status === 'merged' ? 'achip--ok' : ''">
          {{ s.status === 'merged' ? 'Saved to ' + householdName(s.household_id) : 'Ignored' }}
        </span>
        <button class="abtn abtn--small abtn--quiet" @click="restore(s)">Move back to inbox</button>
        <button class="abtn abtn--small abtn--danger" @click="remove(s)">{{ confirming === s.id ? 'Yes, delete' : 'Delete' }}</button>
      </div>
    </article>
  </section>
</template>
