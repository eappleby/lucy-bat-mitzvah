<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { supabase } from '../lib/supabase.js'
import { SITE_URL } from '../../shared/public-config.js'
import { store, toast, failed, loadHouseholds, addressStatus, statusLabel, formatWhen, plural } from './store.js'
import { buildContactEmail, hasInfo } from './emailTemplate.js'
import { copy } from '../content.js'

const props = defineProps({ userEmail: { type: String, default: '' } })

const status = ref(null) // { configured, from } once the server answers
const statusError = ref('')
const audience = ref('unsent')
const picked = ref(new Set())
const previewId = ref(null)
const sending = ref(false)
const confirmSend = ref(false)
const results = ref(null)
// One subject for households we have info for, another for those we don't.
const subjects = reactive({ check: copy.contact.subjectCheck, fresh: copy.contact.subjectNew })
const subjectFor = (h) => (hasInfo(h) ? subjects.check : subjects.fresh)
const build = (household) => buildContactEmail({ household, origin, subject: subjectFor(household) })

const origin = SITE_URL

const candidates = computed(() =>
  store.households.filter((h) => {
    if (!h.email) return false
    if (audience.value === 'unsent') return !h.address_request_sent_at
    if (audience.value === 'unanswered') return addressStatus(h) !== 'confirmed'
    return true
  }),
)
const recipients = computed(() => candidates.value.filter((h) => picked.value.has(h.id)))
const noEmail = computed(() => store.households.filter((h) => !h.email && addressStatus(h) !== 'confirmed').length)
const previewHousehold = computed(
  () => store.households.find((h) => h.id === previewId.value) || candidates.value[0] || store.households.find((h) => h.email) || null,
)
const preview = computed(() => (previewHousehold.value ? build(previewHousehold.value) : null))

watch(audience, () => {
  picked.value = new Set()
  confirmSend.value = false
})

function pickAll(on) {
  picked.value = new Set(on ? candidates.value.map((h) => h.id) : [])
  confirmSend.value = false
}
function toggle(id) {
  const next = new Set(picked.value)
  next.has(id) ? next.delete(id) : next.add(id)
  picked.value = next
  confirmSend.value = false
}

async function api(method, body) {
  const { data } = await supabase.auth.getSession()
  const res = await fetch('/api/send-email', {
    method,
    headers: { Authorization: `Bearer ${data.session?.access_token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const type = res.headers.get('content-type') || ''
  if (!type.includes('json')) throw new Error('The email service is not running here. It works on the deployed site, or locally with "npm run preview:cf".')
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'The email service returned an error.')
  return json
}

onMounted(async () => {
  try {
    status.value = await api('GET')
  } catch (e) {
    statusError.value = e.message
  }
})

async function sendTest() {
  if (!preview.value) return
  sending.value = true
  try {
    const msg = { ...preview.value, to: props.userEmail, subject: `Test: ${preview.value.subject}` }
    const out = await api('POST', { messages: [msg] })
    out.results[0].ok ? toast(`Test sent to ${props.userEmail}`) : toast(`CloudMailin said: ${out.results[0].error}`, 'error')
  } catch (e) {
    toast(e.message, 'error')
  }
  sending.value = false
}

async function sendAll() {
  if (!confirmSend.value) return (confirmSend.value = true)
  confirmSend.value = false
  sending.value = true
  const list = recipients.value
  const all = []
  try {
    for (let i = 0; i < list.length; i += 25) {
      const chunk = list.slice(i, i + 25)
      const out = await api('POST', { messages: chunk.map(build) })
      out.results.forEach((r, j) => all.push({ household: chunk[j], ...r }))
    }
  } catch (e) {
    toast(e.message, 'error')
  }
  if (all.length) {
    const log = all.map((r) => ({
      household_id: r.household.id, kind: 'contact-check', to_email: r.household.email,
      subject: subjectFor(r.household), postmark_id: r.id || null, error: r.ok ? null : r.error,
    }))
    failed((await supabase.from('email_log').insert(log)).error, 'write the email log')
    const okIds = all.filter((r) => r.ok).map((r) => r.household.id)
    if (okIds.length) {
      await supabase.from('households').update({ address_request_sent_at: new Date().toISOString() }).in('id', okIds)
    }
    await loadHouseholds()
    results.value = all
    picked.value = new Set()
    toast(`Sent ${okIds.length} of ${all.length}`)
  }
  sending.value = false
}
</script>

<template>
  <section>
    <div class="atools"><h2>Contact info email</h2></div>
    <p class="ahint">Each household gets its own email showing what we have for them (address, phone, email, family). If everything is there, it asks "Still correct?" with Confirm info and Update info buttons. If something is missing, it marks it and asks them to add it. Every answer is saved to the guest list.</p>

    <p v-if="status?.configured" class="anote anote--ok">CloudMailin is connected. Emails go out from {{ status.from }}.</p>
    <div v-else-if="status" class="anote anote--warn">
      CloudMailin is not connected yet. In Cloudflare Pages, open Settings, then Variables and Secrets, and add
      <code>CLOUDMAILIN_SMTP_URL</code> (as a secret) and <code>EMAIL_FROM</code>, then redeploy.
    </div>
    <p v-else-if="statusError" class="anote anote--warn">{{ statusError }}</p>
    <p v-if="status?.testMode" class="anote anote--warn">CloudMailin test mode is on. Messages are checked but not delivered.</p>

    <div class="aemail">
      <div class="aemail__side">
        <form class="apanel" @submit.prevent>
          <label class="afield"><span>Subject when we have their info</span><input v-model="subjects.check" /></label>
          <label class="afield"><span>Subject when we don't</span><input v-model="subjects.fresh" /></label>
          <div class="atools">
            <span class="atools__gap"></span>
            <button type="button" class="abtn abtn--small" :disabled="sending || !status?.configured || !preview" @click="sendTest">Send this preview to {{ userEmail }}</button>
          </div>
        </form>

        <div class="atools">
          <h3>Who gets it</h3>
          <select v-model="audience" aria-label="Which households">
            <option value="unsent">Not emailed yet</option>
            <option value="unanswered">Has not confirmed their info</option>
            <option value="all">Everyone with an email</option>
          </select>
        </div>
        <div class="atools">
          <button class="abtn abtn--small" :disabled="!candidates.length" @click="pickAll(true)">Select all {{ candidates.length }}</button>
          <button class="abtn abtn--small abtn--quiet" @click="pickAll(false)">Clear</button>
          <span class="atools__gap"></span>
          <button class="abtn abtn--primary" :disabled="sending || !recipients.length || !status?.configured" @click="sendAll">
            {{ sending ? 'Sending' : confirmSend ? `Yes, email ${plural(recipients.length, 'household')} now` : `Send to ${plural(recipients.length, 'household')}` }}
          </button>
        </div>
        <p v-if="noEmail" class="ahint">{{ plural(noEmail, 'household') }} that {{ noEmail === 1 ? 'has' : 'have' }} not confirmed {{ noEmail === 1 ? 'has' : 'have' }} no email on file. Text them their personal link from the Guest list tab.</p>

        <div v-if="!candidates.length" class="aempty">
          <h2>No one to email in this group</h2>
          <p>Households need an email address on the Guest list tab to appear here.</p>
        </div>
        <div v-else class="atable-wrap">
          <table class="atable">
            <thead><tr><th></th><th>Household</th><th>Info</th><th>Last emailed</th></tr></thead>
            <tbody>
              <tr v-for="h in candidates" :key="h.id" :class="{ 'is-previewed': previewHousehold?.id === h.id }" @click="previewId = h.id">
                <td><input type="checkbox" :checked="picked.has(h.id)" :aria-label="'Email ' + h.name" @click.stop="toggle(h.id)" /></td>
                <td><strong>{{ h.name }}</strong><small>{{ h.email }}</small></td>
                <td><span class="achip" :class="'achip--' + addressStatus(h)">{{ statusLabel[addressStatus(h)] }}</span></td>
                <td>{{ h.address_request_sent_at ? formatWhen(h.address_request_sent_at) : 'Never' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="results" class="apanel">
          <h3>Last send</h3>
          <p v-for="r in results" :key="r.household.id" class="acard__meta">
            {{ r.household.name }} ({{ r.household.email }}): {{ r.ok ? 'sent' : 'failed, ' + r.error }}
          </p>
        </div>
      </div>

      <div class="aemail__preview">
        <h3>Preview{{ previewHousehold ? ': ' + previewHousehold.name : '' }}</h3>
        <p class="ahint">Click a row to preview that household's email.</p>
        <iframe v-if="preview" class="aemail__frame" :srcdoc="preview.html" title="Email preview"></iframe>
        <div v-else class="aempty"><p>Add a household with an email to see a preview.</p></div>
      </div>
    </div>
  </section>
</template>
