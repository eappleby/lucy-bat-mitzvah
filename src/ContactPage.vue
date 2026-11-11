<script setup>
// The page everyone lands on from their email (/i/<token>), plus a shared version
// for anyone without a personal link (/address).
//
// With a personal link and an address on file, it shows everything we have for the
// household and asks "Still correct?". Confirm info saves that it is right; Update info
// opens the form, filled in with what we have. The email's two buttons link here with
// ?answer=yes or ?answer=no. With no address on file, the form opens right away.
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { copy } from './content.js'
import { supabase, friendlyError } from './lib/supabase.js'
import { MONTHS, RELATIONSHIPS, addressLines, birthdayText, familyLine } from './lib/contact.js'
import './styles/address.css'

const props = defineProps({ token: { type: String, default: '' } })
const route = useRoute()
const t = copy.contact

// loading | check | form | done
const step = ref('loading')
const unknown = ref(false)
const household = ref(null)
const error = ref('')
const busy = ref(false)
const thanksName = ref('')

const form = reactive({
  first_name: '', last_name: '', name: '', address1: '', address2: '', city: '', state: '', postal_code: '',
  country: 'United States', phone: '', email: '', birthday_month: '', birthday_day: '', family: [], note: '', website: '',
})

const h = computed(() => household.value)
const hasInfo = computed(() => !!h.value?.has_address)
const heading = computed(() => (hasInfo.value ? t.checkHeading : t.newHeading))
const intro = computed(() => (hasInfo.value ? t.checkIntro : t.newIntro))
const thanksHeading = computed(() => t.thanksHeading.replace(' {name}', thanksName.value ? ` ${thanksName.value}` : ''))

// What we have, in the order the email shows it. Empty blocks are left out.
const blocks = computed(() => {
  const x = h.value
  if (!x) return []
  const bday = birthdayText(x.contact?.birthday_month, x.contact?.birthday_day)
  return [
    { label: t.labels.address, lines: [x.name, ...addressLines(x.address)] },
    { label: t.labels.phone, lines: x.phone ? [x.phone] : [] },
    { label: t.labels.email, lines: x.email ? [x.email] : [] },
    { label: t.labels.birthday, lines: bday ? [bday] : [] },
    { label: t.labels.family, lines: (x.family || []).map(familyLine) },
  ].filter((b) => b.lines.length)
})

const days = computed(() => {
  const m = Number(form.birthday_month)
  const n = m ? new Date(2024, m, 0).getDate() : 31
  return Array.from({ length: n }, (_, i) => i + 1)
})

function fillForm() {
  const x = h.value || {}
  const a = x.address || {}
  Object.assign(form, {
    first_name: x.contact?.first_name || '',
    last_name: x.contact?.last_name || '',
    name: x.name || '',
    address1: a.address1 || '',
    address2: a.address2 || '',
    city: a.city || '',
    state: a.state || '',
    postal_code: a.postal_code || '',
    country: a.country || 'United States',
    phone: x.phone || '',
    email: x.email || '',
    birthday_month: x.contact?.birthday_month || '',
    birthday_day: x.contact?.birthday_day || '',
    family: (x.family || []).map((p) => ({ ...p })),
  })
}

function openForm() {
  fillForm()
  error.value = ''
  step.value = 'form'
}

const addPerson = () => form.family.push({ id: null, first_name: '', last_name: form.last_name, relationship: '' })

async function confirmInfo() {
  busy.value = true
  error.value = ''
  const { data, error: err } = await supabase.rpc('confirm_info', { p_token: props.token })
  busy.value = false
  if (err || !data?.ok) {
    error.value = friendlyError(err)
    step.value = 'check'
    return
  }
  thanksName.value = h.value.contact?.first_name || ''
  step.value = 'done'
}

async function save() {
  error.value = ''
  if (form.website) return // honeypot: real people never see this field
  if (!form.first_name.trim() || !form.address1.trim() || !form.city.trim()) {
    error.value = 'We need your first name, a street address, and a city.'
    return
  }
  if (!form.birthday_month !== !form.birthday_day) {
    error.value = 'Pick both the month and the day of your birthday, or leave both blank.'
    return
  }
  busy.value = true
  const info = { ...form, family: form.family.filter((p) => p.first_name.trim()) }
  delete info.website
  const { error: err } = await supabase.rpc('submit_contact', {
    p_info: info,
    p_token: household.value ? props.token : null,
  })
  busy.value = false
  if (err) {
    error.value = friendlyError(err)
    return
  }
  thanksName.value = form.first_name.trim()
  // Keep the page in step with what was just saved, so Update info shows it again.
  if (household.value) {
    Object.assign(household.value, {
      name: form.name.trim() || `${form.first_name} ${form.last_name}`.trim(),
      has_address: true,
      address: { address1: form.address1, address2: form.address2, city: form.city, state: form.state, postal_code: form.postal_code, country: form.country },
      phone: form.phone,
      email: form.email || household.value.email,
      contact: { first_name: form.first_name, last_name: form.last_name, birthday_month: Number(form.birthday_month) || null, birthday_day: Number(form.birthday_day) || null },
      family: info.family,
    })
  }
  step.value = 'done'
}

onMounted(async () => {
  document.title = "Lucy's Bat Mitzvah"
  if (!props.token) return openForm()
  const { data } = await supabase.rpc('get_invite', { p_token: props.token })
  if (!data) {
    unknown.value = true
    return openForm()
  }
  household.value = data
  const answer = route.query.answer
  if (!data.has_address || answer === 'no') openForm()
  else if (answer === 'yes') {
    step.value = 'check'
    confirmInfo()
  } else step.value = 'check'
})
</script>

<template>
  <div class="ap">
    <div class="ap-card">
      <img class="ap-art ap-art--coral" src="/art/coral-orange-a.webp" alt="" />
      <img class="ap-art ap-art--turtle" src="/art/turtle.webp" alt="" />
      <img class="ap-art ap-art--star" src="/art/starfish.webp" alt="" />
      <img class="ap-art ap-art--shell" src="/art/shell-big.webp" alt="" />
      <img class="ap-art ap-art--weed" src="/art/seaweed-pearls.webp" alt="" />
      <img class="ap-art ap-art--coral2" src="/art/coral-orange-b.webp" alt="" />

      <header v-if="step !== 'done'" class="ap-head">
        <h1 class="ap-title">{{ heading }}</h1>
        <img class="ap-wave" src="/art/wave.webp" alt="" />
        <p class="ap-intro">{{ intro }}</p>
      </header>

      <main class="ap-body" aria-live="polite">
        <p v-if="step === 'loading'" class="ap-note">Loading</p>

        <template v-else-if="step === 'check'">
          <dl class="ap-info">
            <div v-for="b in blocks" :key="b.label" class="ap-info__block">
              <dt>{{ b.label }}</dt>
              <dd v-for="(line, i) in b.lines" :key="i">{{ line }}</dd>
            </div>
          </dl>
          <h2 class="ap-q">{{ t.stillHeading }}</h2>
          <p class="ap-intro">{{ t.stillBody }}</p>
          <p v-if="error" class="form-error" role="alert">{{ error }}</p>
          <div class="ap-choice">
            <button class="btn btn--big" :disabled="busy" @click="confirmInfo">{{ busy ? t.saving : t.confirm }}</button>
            <button class="btn btn--big ap-no" :disabled="busy" @click="openForm">{{ t.update }}</button>
          </div>
        </template>

        <form v-else-if="step === 'form'" class="ap-form" @submit.prevent="save">
          <p v-if="unknown" class="ap-note">{{ t.unknownLink }}</p>

          <fieldset class="ap-set">
            <legend>Your name</legend>
            <label class="field field--half"><span>First name</span><input v-model="form.first_name" type="text" maxlength="100" autocomplete="given-name" /></label>
            <label class="field field--half"><span>Last name</span><input v-model="form.last_name" type="text" maxlength="100" autocomplete="family-name" /></label>
          </fieldset>

          <fieldset class="ap-set">
            <legend>{{ t.labels.address }}</legend>
            <label class="field field--wide"><span>Name on the envelope</span><input v-model="form.name" type="text" maxlength="200" placeholder="The Rivera Family" /></label>
            <label class="field field--wide"><span>Street address</span><input v-model="form.address1" type="text" maxlength="200" autocomplete="address-line1" /></label>
            <label class="field field--wide"><span>Apartment or unit (optional)</span><input v-model="form.address2" type="text" maxlength="200" autocomplete="address-line2" /></label>
            <label class="field"><span>City</span><input v-model="form.city" type="text" maxlength="120" autocomplete="address-level2" /></label>
            <label class="field field--small"><span>State</span><input v-model="form.state" type="text" maxlength="80" autocomplete="address-level1" /></label>
            <label class="field field--small"><span>ZIP</span><input v-model="form.postal_code" type="text" maxlength="30" autocomplete="postal-code" /></label>
            <label class="field field--wide"><span>Country</span><input v-model="form.country" type="text" maxlength="80" autocomplete="country-name" /></label>
          </fieldset>

          <fieldset class="ap-set">
            <legend>Phone and email</legend>
            <label class="field"><span>{{ t.labels.phone }}</span><input v-model="form.phone" type="tel" maxlength="40" autocomplete="tel" /></label>
            <label class="field"><span>{{ t.labels.email }}</span><input v-model="form.email" type="email" maxlength="200" autocomplete="email" /></label>
          </fieldset>

          <fieldset class="ap-set">
            <legend>{{ t.labels.birthday }}</legend>
            <label class="field field--half">
              <span>Month</span>
              <select v-model="form.birthday_month" autocomplete="bday-month">
                <option value=""></option>
                <option v-for="(m, i) in MONTHS" :key="m" :value="i + 1">{{ m }}</option>
              </select>
            </label>
            <label class="field field--half">
              <span>Day</span>
              <select v-model="form.birthday_day" autocomplete="bday-day">
                <option value=""></option>
                <option v-for="d in days" :key="d" :value="d">{{ d }}</option>
              </select>
            </label>
          </fieldset>

          <fieldset class="ap-set">
            <legend>{{ t.labels.family }}</legend>
            <div v-for="(p, i) in form.family" :key="i" class="ap-person">
              <label class="field"><span>First name</span><input v-model="p.first_name" type="text" maxlength="100" /></label>
              <label class="field"><span>Last name</span><input v-model="p.last_name" type="text" maxlength="100" /></label>
              <label class="field"><span>Relationship to you</span><input v-model="p.relationship" type="text" maxlength="60" list="relationships" placeholder="Spouse" /></label>
              <button type="button" class="ap-link ap-person__remove" @click="form.family.splice(i, 1)">Remove</button>
            </div>
            <datalist id="relationships"><option v-for="r in RELATIONSHIPS" :key="r" :value="r" /></datalist>
            <button type="button" class="ap-link ap-add" @click="addPerson">Add a family member</button>
          </fieldset>

          <label class="field field--wide">
            <span>Anything to tell Lucy? (optional)</span>
            <textarea v-model="form.note" rows="3" maxlength="2000"></textarea>
          </label>
          <input v-model="form.website" class="hp" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" />
          <p v-if="error" class="form-error field--wide" role="alert">{{ error }}</p>
          <button class="btn btn--big field--wide" :disabled="busy">{{ busy ? t.saving : t.save }}</button>
        </form>

        <div v-else-if="step === 'done'" class="ap-done">
          <img class="ap-done__turtle" src="/art/clownfish.webp" alt="" />
          <h1 class="ap-title ap-title--thanks">{{ thanksHeading }}</h1>
          <img class="ap-wave" src="/art/wave.webp" alt="" />
          <p class="ap-intro">{{ t.thanksBody }}</p>
          <button v-if="household" class="ap-link" @click="openForm">{{ t.update }}</button>
        </div>
      </main>
    </div>
  </div>
</template>
