<script setup>
// The page everyone lands on from their email (/i/<token>), plus a shared version
// for anyone without a personal link (/address).
//
// With a personal link and an address on file, it asks "Is this your address?".
// Yes confirms it. No opens the form, filled in with what we have.
// The email's Yes and No buttons link here with ?answer=yes or ?answer=no.
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { copy, event } from './content.js'
import { supabase, friendlyError } from './lib/supabase.js'
import './styles/address.css'

const props = defineProps({ token: { type: String, default: '' } })
const route = useRoute()
const t = copy.address

// loading | unknown | ask | form | done
const step = ref('loading')
const household = ref(null)
const error = ref('')
const busy = ref(false)
const doneCity = ref('')
const form = reactive({
  name: '', address1: '', address2: '', city: '', state: '', postal: '',
  country: 'United States', email: '', note: '', website: '',
})

const addressLines = computed(() => {
  const a = household.value?.address
  if (!a) return []
  const cityLine = [a.city, [a.state, a.postal_code].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return [a.address1, a.address2, cityLine, a.country && a.country !== 'United States' ? a.country : null].filter(Boolean)
})
const thanksBody = computed(() => t.thanksBody.replace('{city}', doneCity.value || 'you'))

function fillForm() {
  const h = household.value
  const a = h?.address || {}
  Object.assign(form, {
    name: h?.name || '',
    address1: a.address1 || '',
    address2: a.address2 || '',
    city: a.city || '',
    state: a.state || '',
    postal: a.postal_code || '',
    country: a.country || 'United States',
  })
}

function openForm() {
  fillForm()
  error.value = ''
  step.value = 'form'
}

async function confirmYes() {
  busy.value = true
  error.value = ''
  const { data, error: err } = await supabase.rpc('confirm_address', { p_token: props.token })
  busy.value = false
  if (err || !data?.ok) {
    error.value = friendlyError(err)
    step.value = 'ask'
    return
  }
  household.value.confirmed = true
  doneCity.value = household.value.address?.city || ''
  step.value = 'done'
}

async function send() {
  error.value = ''
  if (form.website) return // honeypot: real people never see this field
  if (!form.name.trim() || !form.address1.trim() || !form.city.trim()) {
    error.value = 'We need a name, a street address, and a city.'
    return
  }
  busy.value = true
  const { error: err } = await supabase.rpc('submit_address', {
    p_name: form.name,
    p_address1: form.address1,
    p_address2: form.address2,
    p_city: form.city,
    p_state: form.state,
    p_postal_code: form.postal,
    p_country: form.country,
    p_email: form.email,
    p_note: form.note,
    p_token: household.value ? props.token : null,
  })
  busy.value = false
  if (err) {
    error.value = friendlyError(err)
    return
  }
  doneCity.value = form.city.trim()
  step.value = 'done'
}

onMounted(async () => {
  document.title = "Lucy's Bat Mitzvah"
  if (!props.token) {
    step.value = 'form'
    return
  }
  const { data } = await supabase.rpc('get_invite', { p_token: props.token })
  if (!data) {
    step.value = 'unknown'
    return
  }
  household.value = data
  const answer = route.query.answer
  if (!data.has_address || answer === 'no') openForm()
  else if (answer === 'yes') {
    step.value = 'ask'
    confirmYes()
  } else step.value = 'ask'
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

      <header class="ap-head">
        <p class="ap-whose">{{ event.whose }}</p>
        <h1 class="ap-title">{{ event.title.join(' ') }}</h1>
        <p class="ap-soon">{{ t.comingSoon }}</p>
        <img class="ap-wave" src="/art/wave.webp" alt="" />
      </header>

      <main class="ap-body" aria-live="polite">
        <p v-if="step === 'loading'" class="ap-note">Loading</p>

        <template v-else-if="step === 'ask'">
          <h2 class="ap-q">{{ t.confirmQuestion }}</h2>
          <address class="ap-envelope">
            <strong>{{ household.name }}</strong>
            <span v-for="line in addressLines" :key="line">{{ line }}</span>
          </address>
          <p v-if="error" class="form-error" role="alert">{{ error }}</p>
          <div class="ap-choice">
            <button class="btn btn--big" :disabled="busy" @click="confirmYes">{{ busy ? 'Saving' : t.yes }}</button>
            <button class="btn btn--big ap-no" :disabled="busy" @click="openForm">{{ t.no }}</button>
          </div>
        </template>

        <form v-else-if="step === 'form' || step === 'unknown'" class="ap-form" @submit.prevent="send">
          <p v-if="step === 'unknown'" class="ap-note">{{ t.unknownLink }}</p>
          <h2 class="ap-q">{{ t.formHeading }}</h2>
          <label class="field field--wide">
            <span>Name for the envelope</span>
            <input v-model="form.name" type="text" maxlength="200" autocomplete="name" placeholder="The Rivera Family" />
          </label>
          <label class="field field--wide">
            <span>Street address</span>
            <input v-model="form.address1" type="text" maxlength="200" autocomplete="address-line1" />
          </label>
          <label class="field field--wide">
            <span>Apartment or unit (optional)</span>
            <input v-model="form.address2" type="text" maxlength="200" autocomplete="address-line2" />
          </label>
          <label class="field">
            <span>City</span>
            <input v-model="form.city" type="text" maxlength="120" autocomplete="address-level2" />
          </label>
          <label class="field field--small">
            <span>State</span>
            <input v-model="form.state" type="text" maxlength="80" autocomplete="address-level1" />
          </label>
          <label class="field field--small">
            <span>ZIP</span>
            <input v-model="form.postal" type="text" maxlength="30" autocomplete="postal-code" />
          </label>
          <label class="field field--wide">
            <span>Country</span>
            <input v-model="form.country" type="text" maxlength="80" autocomplete="country-name" />
          </label>
          <label v-if="!household" class="field field--wide">
            <span>Email (optional)</span>
            <input v-model="form.email" type="email" maxlength="200" autocomplete="email" />
          </label>
          <label class="field field--wide">
            <span>Anything to tell Lucy? (optional)</span>
            <textarea v-model="form.note" rows="3" maxlength="2000"></textarea>
          </label>
          <input v-model="form.website" class="hp" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" />
          <p v-if="error" class="form-error field--wide" role="alert">{{ error }}</p>
          <button class="btn btn--big field--wide" :disabled="busy">{{ busy ? t.sending : t.send }}</button>
        </form>

        <div v-else-if="step === 'done'" class="ap-done">
          <img class="ap-done__turtle" src="/art/turtle.webp" alt="" />
          <h2 class="ap-q">{{ t.thanksHeading }}</h2>
          <p class="ap-intro">{{ thanksBody }}</p>
          <button v-if="household" class="ap-link" @click="openForm">{{ t.change }}</button>
        </div>
      </main>

    </div>
  </div>
</template>
