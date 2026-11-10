<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { supabase } from '../lib/supabase.js'
import { store, toast, failed, loadHouseholds, hasAddress, inviteLink, formatWhen, plural } from './store.js'

const props = defineProps({ userEmail: { type: String, default: '' } })

const status = ref(null) // { configured, from } once the server answers
const statusError = ref('')
const audience = ref('missing')
const picked = ref(new Set())
const sending = ref(false)
const confirmSend = ref(false)
const results = ref(null)

const message = reactive({
  subject: "Lucy's bat mitzvah: where should we mail your save the date?",
  body: `Hi {{greeting}},

Lucy's bat mitzvah is on March 20, 2027, and save the dates are going out soon. Can you send us your mailing address? It takes about a minute:

{{link}}

While you're there, pop some bubbles and see if you can find all 7 pearls.

Love,
The Applebys`,
})

const candidates = computed(() =>
  store.households.filter((h) => {
    if (!h.email) return false
    if (audience.value === 'missing') return !hasAddress(h)
    if (audience.value === 'unsent') return !hasAddress(h) && !h.address_request_sent_at
    return true
  }),
)
const recipients = computed(() => candidates.value.filter((h) => picked.value.has(h.id)))
const noEmail = computed(() => store.households.filter((h) => !h.email && !hasAddress(h)).length)

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

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function render(h) {
  const greeting = h.greeting || h.name
  const link = inviteLink(h)
  const fill = (s) => s.replaceAll('{{greeting}}', greeting).replaceAll('{{link}}', link)
  const text = fill(message.body)
  const html =
    '<div style="font-family: Georgia, serif; font-size: 17px; line-height: 1.55; color: #12305f; max-width: 34em;">' +
    escapeHtml(message.body)
      .split(/\n{2,}/)
      .map((para) => {
        if (para.trim() === '{{link}}') {
          return `<p><a href="${link}" style="display: inline-block; padding: 12px 22px; background: #003b9d; color: #ffffff; text-decoration: none; border-radius: 999px; font-weight: bold;">Send us your address</a></p><p style="font-size: 13px; color: #5b6f91;">Or paste this into your browser: ${link}</p>`
        }
        return `<p>${fill(para).replace(/\n/g, '<br>')}</p>`
      })
      .join('') +
    '</div>'
  return { to: h.email, subject: fill(message.subject), text, html, tag: 'address-request' }
}

async function sendTest() {
  sending.value = true
  try {
    const sample = { greeting: 'Aunt Dana and Uncle Sam', name: 'Test', invite_token: 'test-link', email: props.userEmail }
    const out = await api('POST', { messages: [render(sample)] })
    out.results[0].ok ? toast(`Test sent to ${props.userEmail}`) : toast(`Postmark said: ${out.results[0].error}`, 'error')
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
    for (let i = 0; i < list.length; i += 50) {
      const chunk = list.slice(i, i + 50)
      const out = await api('POST', { messages: chunk.map(render) })
      out.results.forEach((r, j) => all.push({ household: chunk[j], ...r }))
    }
  } catch (e) {
    toast(e.message, 'error')
  }
  if (all.length) {
    const log = all.map((r) => ({
      household_id: r.household.id, kind: 'address-request', to_email: r.household.email,
      subject: message.subject, postmark_id: r.id || null, error: r.ok ? null : r.error,
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
    <div class="atools"><h2>Ask for addresses by email</h2></div>

    <p v-if="status?.configured" class="anote anote--ok">Postmark is connected. Emails go out from {{ status.from }}.</p>
    <div v-else-if="status" class="anote anote--warn">
      Postmark is not connected yet. In Cloudflare Pages, open Settings, then Variables and Secrets, and add
      <code>POSTMARK_SERVER_TOKEN</code> (as a secret) and <code>POSTMARK_FROM</code>, then redeploy.
    </div>
    <p v-else-if="statusError" class="anote anote--warn">{{ statusError }}</p>

    <form class="apanel" @submit.prevent>
      <label class="afield"><span>Subject</span><input v-model="message.subject" /></label>
      <label class="afield">
        <span>Message. <code v-pre>{{greeting}}</code> becomes each household's greeting, and <code v-pre>{{link}}</code> on its own line becomes a button to their personal link.</span>
        <textarea v-model="message.body" rows="11"></textarea>
      </label>
      <div class="atools">
        <button type="button" class="abtn" :disabled="sending || !status?.configured" @click="sendTest">Send a test to {{ userEmail }}</button>
      </div>
    </form>

    <div class="atools">
      <h3>Who gets it</h3>
      <select v-model="audience" aria-label="Which households" @change="pickAll(false)">
        <option value="missing">Needs an address</option>
        <option value="unsent">Needs an address and has not been emailed</option>
        <option value="all">Everyone with an email</option>
      </select>
      <button class="abtn abtn--small" @click="pickAll(true)">Select all {{ candidates.length }}</button>
      <button class="abtn abtn--small abtn--quiet" @click="pickAll(false)">Clear</button>
      <span class="atools__gap"></span>
      <button class="abtn abtn--primary" :disabled="sending || !recipients.length || !status?.configured" @click="sendAll">
        {{ sending ? 'Sending' : confirmSend ? `Yes, email ${plural(recipients.length, 'household')} now` : `Send to ${plural(recipients.length, 'household')}` }}
      </button>
    </div>
    <p v-if="noEmail" class="ahint">{{ plural(noEmail, 'household') }} still {{ noEmail === 1 ? 'needs' : 'need' }} an address but {{ noEmail === 1 ? 'has' : 'have' }} no email on file. Text them the shared link or their personal link from the Guest list tab.</p>

    <div v-if="!candidates.length" class="aempty">
      <h2>No one to email in this group</h2>
      <p>Households need an email address on the Guest list tab to appear here.</p>
    </div>
    <div v-else class="atable-wrap">
      <table class="atable">
        <thead><tr><th></th><th>Household</th><th>Email</th><th>Last asked</th></tr></thead>
        <tbody>
          <tr v-for="h in candidates" :key="h.id" @click="toggle(h.id)">
            <td><input type="checkbox" :checked="picked.has(h.id)" :aria-label="'Email ' + h.name" @click.stop="toggle(h.id)" /></td>
            <td><strong>{{ h.name }}</strong><small v-if="h.greeting">{{ h.greeting }}</small></td>
            <td>{{ h.email }}</td>
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
  </section>
</template>
