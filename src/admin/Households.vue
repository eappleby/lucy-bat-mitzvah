<script setup>
import { computed, reactive, ref } from 'vue'
import { supabase } from '../lib/supabase.js'
import { store, toast, failed, loadHouseholds, hasAddress, addressLine, guestNames, inviteLink, copyText, plural, addressStatus, statusLabel } from './store.js'
import { parseCsv, rowsToHouseholds, downloadCsv } from './csv.js'

const search = ref('')
const filter = ref('all')
const group = ref('')
const editing = ref(null) // a working copy of the household being edited
const saving = ref(false)
const confirmDelete = ref(false)
const importing = reactive({ open: false, text: '', busy: false })

const groups = computed(() => [...new Set(store.households.map((h) => h.group_tag).filter(Boolean))].sort())

const stats = computed(() => {
  const count = (status) => store.households.filter((h) => addressStatus(h) === status).length
  return {
    total: store.households.length,
    guests: store.households.reduce((n, h) => n + h.guests.length, 0),
    confirmed: count('confirmed'),
    unconfirmed: count('unconfirmed'),
    needed: count('needed'),
  }
})

const rows = computed(() => {
  const q = search.value.trim().toLowerCase()
  return store.households.filter((h) => {
    if (['needed', 'unconfirmed', 'confirmed'].includes(filter.value) && addressStatus(h) !== filter.value) return false
    if (filter.value === 'noemail' && h.email) return false
    if (group.value && h.group_tag !== group.value) return false
    if (!q) return true
    return [h.name, h.greeting, h.email, h.city, h.notes, guestNames(h)].some((v) => (v || '').toLowerCase().includes(q))
  })
})

const sharedForm = window.location.origin + '/address'
const meetLucy = window.location.origin + '/'

function blank() {
  return {
    id: null, name: '', greeting: '', email: '', phone: '', address1: '', address2: '', city: '', state: '',
    postal_code: '', country: 'United States', group_tag: '', notes: '', personal_message: '', guests: [], eventIds: [],
  }
}

function edit(h) {
  confirmDelete.value = false
  editing.value = h
    ? { ...h, guests: h.guests.map((g) => ({ ...g })), eventIds: h.household_events.map((e) => e.event_id) }
    : blank()
}

function addGuest() {
  editing.value.guests.push({ id: null, first_name: '', last_name: '', kind: 'adult' })
}

async function save() {
  const e = editing.value
  if (!e.name.trim()) return toast('Give the household a name first.', 'error')
  saving.value = true
  const fields = {}
  for (const k of ['name', 'greeting', 'email', 'phone', 'address1', 'address2', 'city', 'state', 'postal_code', 'group_tag', 'notes', 'personal_message']) {
    fields[k] = (e[k] || '').trim() || null
  }
  fields.name = e.name.trim()
  fields.country = (e.country || '').trim() || 'United States'

  const before = store.households.find((h) => h.id === e.id)
  // A changed address needs the guest to confirm it again.
  if (!before || addressLine(before) !== addressLine({ ...fields })) {
    fields.address_updated_at = fields.address1 ? new Date().toISOString() : null
    fields.address_confirmed_at = null
  }

  let id = e.id
  if (id) {
    const { error } = await supabase.from('households').update(fields).eq('id', id)
    if (failed(error, 'save the household')) return (saving.value = false)
  } else {
    const { data, error } = await supabase.from('households').insert(fields).select('id').single()
    if (failed(error, 'add the household')) return (saving.value = false)
    id = data.id
  }

  // Guests: remove the ones taken out, then save the rest in order.
  const keepIds = e.guests.filter((g) => g.id).map((g) => g.id)
  const removed = (before?.guests || []).filter((g) => !keepIds.includes(g.id)).map((g) => g.id)
  if (removed.length) await supabase.from('guests').delete().in('id', removed)
  const guests = e.guests
    .filter((g) => g.first_name.trim())
    .map((g, i) => ({
      ...(g.id ? { id: g.id } : {}),
      household_id: id,
      first_name: g.first_name.trim(),
      last_name: (g.last_name || '').trim() || null,
      kind: g.kind || 'adult',
      sort: i,
    }))
  const existing = guests.filter((g) => g.id)
  const fresh = guests.filter((g) => !g.id)
  if (existing.length) failed((await supabase.from('guests').upsert(existing)).error, 'save guests')
  if (fresh.length) failed((await supabase.from('guests').insert(fresh)).error, 'add guests')

  // Events this household is invited to.
  await supabase.from('household_events').delete().eq('household_id', id)
  if (e.eventIds.length) {
    const { error } = await supabase.from('household_events').insert(e.eventIds.map((event_id) => ({ household_id: id, event_id })))
    failed(error, 'save event invitations')
  }

  await loadHouseholds()
  saving.value = false
  editing.value = null
  toast('Saved')
}

async function remove() {
  if (!confirmDelete.value) return (confirmDelete.value = true)
  const { error } = await supabase.from('households').delete().eq('id', editing.value.id)
  if (failed(error, 'delete the household')) return
  await loadHouseholds()
  editing.value = null
  toast('Household deleted')
}

function exportCsv() {
  const header = ['name', 'greeting', 'guests', 'email', 'phone', 'address1', 'address2', 'city', 'state', 'postal_code', 'country', 'address_status', 'group', 'notes', 'personal_link']
  const body = rows.value.map((h) => [
    h.name, h.greeting, h.guests.map((g) => [g.first_name, g.last_name].filter(Boolean).join(' ')).join('; '),
    h.email, h.phone, h.address1, h.address2, h.city, h.state, h.postal_code, h.country, statusLabel[addressStatus(h)], h.group_tag, h.notes, inviteLink(h),
  ])
  downloadCsv('lucy-bat-mitzvah-guest-list.csv', [header, ...body])
}

function template() {
  downloadCsv('guest-list-template.csv', [
    ['name', 'greeting', 'guests', 'email', 'phone', 'address1', 'address2', 'city', 'state', 'zip', 'country', 'group', 'notes'],
    ['The Rivera Family', 'Aunt Dana and Uncle Sam', 'Dana Rivera; Sam Rivera; Max Rivera', 'dana@example.com', '', '12 Garfield Pl', 'Apt 3', 'Brooklyn', 'NY', '11215', 'United States', 'Family', ''],
  ])
}

const importPreview = computed(() => (importing.text.trim() ? rowsToHouseholds(parseCsv(importing.text)) : null))

async function onFile(e) {
  const file = e.target.files[0]
  if (file) importing.text = await file.text()
}

async function runImport() {
  const list = importPreview.value?.households || []
  if (!list.length) return
  importing.busy = true
  // Every row must carry the same columns, or the missing ones are sent as empty and lose their defaults.
  const cols = ['name', 'greeting', 'email', 'phone', 'address1', 'address2', 'city', 'state', 'postal_code', 'group_tag', 'notes']
  const payload = list.map(({ household: h }) => ({
    ...Object.fromEntries(cols.map((c) => [c, h[c] || null])),
    country: h.country || 'United States',
    address_updated_at: h.address1 ? new Date().toISOString() : null,
  }))
  const { data, error } = await supabase.from('households').insert(payload).select('id')
  if (failed(error, 'import households')) return (importing.busy = false)
  const guests = []
  data.forEach((h, i) => list[i].guests.forEach((g) => guests.push({ ...g, kind: 'adult', household_id: h.id })))
  if (guests.length) failed((await supabase.from('guests').insert(guests)).error, 'import guests')
  await loadHouseholds()
  importing.busy = false
  importing.open = false
  importing.text = ''
  toast(`Imported ${plural(list.length, 'household')}`)
}
</script>

<template>
  <section>
    <div class="astats">
      <div><strong>{{ stats.total }}</strong> households</div>
      <div><strong>{{ stats.guests }}</strong> guests</div>
      <div><strong>{{ stats.confirmed }}</strong> confirmed</div>
      <div><strong>{{ stats.unconfirmed }}</strong> not confirmed yet</div>
      <div :class="{ 'is-warn': stats.needed }"><strong>{{ stats.needed }}</strong> addresses needed</div>
    </div>

    <div class="ashare">
      <span>Address form for anyone without a personal link:</span>
      <code>{{ sharedForm }}</code>
      <button class="abtn abtn--small" @click="copyText(sharedForm, 'Link copied')">Copy</button>
    </div>
    <div class="ashare">
      <span>Meet Lucy page, for the save the date card:</span>
      <code>{{ meetLucy }}</code>
      <button class="abtn abtn--small" @click="copyText(meetLucy, 'Link copied')">Copy</button>
    </div>

    <div class="atools">
      <input v-model="search" class="asearch" type="search" placeholder="Search names, emails, cities" aria-label="Search the guest list" />
      <select v-model="filter" aria-label="Filter by address">
        <option value="all">Everyone</option>
        <option value="needed">Address needed</option>
        <option value="unconfirmed">Address not confirmed</option>
        <option value="confirmed">Address confirmed</option>
        <option value="noemail">No email</option>
      </select>
      <select v-if="groups.length" v-model="group" aria-label="Filter by group">
        <option value="">All groups</option>
        <option v-for="g in groups" :key="g">{{ g }}</option>
      </select>
      <span class="atools__gap"></span>
      <button class="abtn" @click="importing.open = true">Import a spreadsheet</button>
      <button class="abtn" :disabled="!rows.length" @click="exportCsv">Export for mailing labels</button>
      <button class="abtn abtn--primary" @click="edit(null)">Add a household</button>
    </div>

    <div v-if="!store.households.length && !store.loading" class="aempty">
      <h2>No one on the list yet</h2>
      <p>Add a household, or import a spreadsheet of everyone you plan to invite. Addresses people send through the site show up under Address inbox.</p>
    </div>

    <div v-else class="atable-wrap">
      <table class="atable">
        <thead>
          <tr><th>Household</th><th>Guests</th><th>Email</th><th>Mailing address</th><th>Group</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="h in rows" :key="h.id" tabindex="0" @click="edit(h)" @keydown.enter="edit(h)">
            <td><strong>{{ h.name }}</strong><small v-if="h.greeting">{{ h.greeting }}</small></td>
            <td>{{ guestNames(h) || '' }}</td>
            <td>{{ h.email }}</td>
            <td>
              <template v-if="hasAddress(h)">{{ addressLine(h) }}<br /></template>
              <span class="achip" :class="'achip--' + addressStatus(h)">{{ statusLabel[addressStatus(h)] }}</span>
            </td>
            <td>{{ h.group_tag }}</td>
            <td><button class="abtn abtn--small" @click.stop="copyText(inviteLink(h), 'Personal link copied')">Copy link</button></td>
          </tr>
          <tr v-if="!rows.length"><td colspan="6" class="atable__none">Nothing matches that search.</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Editor -->
    <div v-if="editing" class="adrawer" role="dialog" aria-modal="true" aria-label="Edit household" @click.self="editing = null">
      <form class="adrawer__panel" @submit.prevent="save">
        <header>
          <h2>{{ editing.id ? 'Edit household' : 'Add a household' }}</h2>
          <button type="button" class="abtn abtn--quiet" @click="editing = null">Close</button>
        </header>

        <div class="agrid">
          <label class="afield afield--2"><span>Name for the envelope</span><input v-model="editing.name" required placeholder="The Rivera Family" /></label>
          <label class="afield afield--2"><span>Greeting on the site</span><input v-model="editing.greeting" placeholder="Aunt Dana and Uncle Sam" /></label>
          <label class="afield afield--2"><span>Email</span><input v-model="editing.email" type="email" /></label>
          <label class="afield afield--2"><span>Phone</span><input v-model="editing.phone" /></label>
          <label class="afield afield--4"><span>Street address</span><input v-model="editing.address1" /></label>
          <label class="afield afield--4"><span>Apartment or unit</span><input v-model="editing.address2" /></label>
          <label class="afield afield--2"><span>City</span><input v-model="editing.city" /></label>
          <label class="afield"><span>State</span><input v-model="editing.state" /></label>
          <label class="afield"><span>ZIP</span><input v-model="editing.postal_code" /></label>
          <label class="afield afield--2"><span>Country</span><input v-model="editing.country" /></label>
          <label class="afield afield--2"><span>Group</span><input v-model="editing.group_tag" list="group-options" placeholder="Family, School friends" /></label>
          <datalist id="group-options"><option v-for="g in groups" :key="g" :value="g" /></datalist>
        </div>

        <h3>People in this household</h3>
        <div v-for="(g, i) in editing.guests" :key="i" class="aguest">
          <input v-model="g.first_name" placeholder="First name" aria-label="First name" />
          <input v-model="g.last_name" placeholder="Last name" aria-label="Last name" />
          <select v-model="g.kind" aria-label="Adult or kid"><option value="adult">Adult</option><option value="kid">Kid</option></select>
          <button type="button" class="abtn abtn--small abtn--quiet" @click="editing.guests.splice(i, 1)">Remove</button>
        </div>
        <button type="button" class="abtn abtn--small" @click="addGuest">Add a person</button>

        <h3>Invited to</h3>
        <div class="achecks">
          <label v-for="ev in store.events" :key="ev.id"><input v-model="editing.eventIds" type="checkbox" :value="ev.id" /> {{ ev.name }}</label>
        </div>

        <label class="afield"><span>Personal message for their invitation page</span><textarea v-model="editing.personal_message" rows="3"></textarea></label>
        <label class="afield"><span>Private notes</span><textarea v-model="editing.notes" rows="2"></textarea></label>

        <div v-if="editing.id" class="ashare">
          <span>Personal link:</span>
          <code>{{ inviteLink(editing) }}</code>
          <button type="button" class="abtn abtn--small" @click="copyText(inviteLink(editing), 'Personal link copied')">Copy</button>
        </div>

        <footer>
          <button v-if="editing.id" type="button" class="abtn abtn--danger" @click="remove">{{ confirmDelete ? 'Yes, delete this household' : 'Delete' }}</button>
          <span class="atools__gap"></span>
          <button type="button" class="abtn" @click="editing = null">Cancel</button>
          <button class="abtn abtn--primary" :disabled="saving">{{ saving ? 'Saving' : 'Save' }}</button>
        </footer>
      </form>
    </div>

    <!-- Import -->
    <div v-if="importing.open" class="adrawer" role="dialog" aria-modal="true" aria-label="Import a spreadsheet" @click.self="importing.open = false">
      <div class="adrawer__panel">
        <header>
          <h2>Import a spreadsheet</h2>
          <button type="button" class="abtn abtn--quiet" @click="importing.open = false">Close</button>
        </header>
        <p>Choose a CSV file, or copy rows from Google Sheets or Excel and paste them below. The first row must be column names. Only <code>name</code> is required.</p>
        <p>Recognized columns: name, greeting, guests (separated by semicolons), email, phone, address1, address2, city, state, zip, country, group, notes.</p>
        <div class="atools">
          <input type="file" accept=".csv,text/csv,text/plain" @change="onFile" />
          <button type="button" class="abtn abtn--small" @click="template">Download a template</button>
        </div>
        <label class="afield"><span>Or paste here</span><textarea v-model="importing.text" rows="8" spellcheck="false"></textarea></label>
        <p v-if="importPreview">
          Found <strong>{{ plural(importPreview.households.length, 'household') }}</strong>.
          <span v-if="importPreview.unknown.length">Skipping columns: {{ importPreview.unknown.join(', ') }}.</span>
        </p>
        <footer>
          <span class="atools__gap"></span>
          <button type="button" class="abtn" @click="importing.open = false">Cancel</button>
          <button type="button" class="abtn abtn--primary" :disabled="importing.busy || !importPreview?.households.length" @click="runImport">
            {{ importing.busy ? 'Importing' : 'Import ' + plural(importPreview?.households.length || 0, 'household') }}
          </button>
        </footer>
      </div>
    </div>
  </section>
</template>
