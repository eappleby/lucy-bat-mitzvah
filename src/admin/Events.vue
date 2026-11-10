<script setup>
import { computed, ref } from 'vue'
import { supabase } from '../lib/supabase.js'
import { store, toast, failed, loadEvents, loadHouseholds, plural } from './store.js'

const confirming = ref(null)

const invited = computed(() => {
  const counts = {}
  for (const h of store.households) {
    for (const e of h.household_events) {
      counts[e.event_id] ??= { households: 0, guests: 0 }
      counts[e.event_id].households++
      counts[e.event_id].guests += h.guests.length
    }
  }
  return counts
})

async function save(ev) {
  const { error } = await supabase
    .from('events')
    .update({ name: ev.name, event_date: ev.event_date || null, time_text: ev.time_text || null, location: ev.location || null, details: ev.details || null })
    .eq('id', ev.id)
  if (failed(error, 'save the event')) return
  toast('Event saved')
}

async function add() {
  const slug = 'event-' + Date.now().toString(36)
  const { error } = await supabase.from('events').insert({ slug, name: 'New event', sort: store.events.length + 1 })
  if (failed(error, 'add an event')) return
  loadEvents()
}

async function remove(ev) {
  if (confirming.value !== ev.id) return (confirming.value = ev.id)
  const { error } = await supabase.from('events').delete().eq('id', ev.id)
  if (failed(error, 'delete the event')) return
  toast('Event deleted')
  await Promise.all([loadEvents(), loadHouseholds()])
}
</script>

<template>
  <section>
    <div class="atools">
      <h2>Events</h2>
      <span class="atools__gap"></span>
      <button class="abtn" @click="add">Add an event</button>
    </div>
    <p class="ahint">Choose who is invited to each event by editing a household on the Guest list tab. Details entered here will appear on invitation pages when RSVPs open.</p>

    <form v-for="ev in store.events" :key="ev.id" class="apanel" @submit.prevent="save(ev)">
      <div class="agrid">
        <label class="afield afield--2"><span>Name</span><input v-model="ev.name" required /></label>
        <label class="afield"><span>Date</span><input v-model="ev.event_date" type="date" /></label>
        <label class="afield"><span>Time</span><input v-model="ev.time_text" placeholder="6:30 PM" /></label>
        <label class="afield afield--4"><span>Location</span><input v-model="ev.location" /></label>
        <label class="afield afield--4"><span>Details for guests</span><textarea v-model="ev.details" rows="2"></textarea></label>
      </div>
      <div class="atools">
        <span class="achip">
          Invited: {{ plural(invited[ev.id]?.households || 0, 'household') }}, {{ plural(invited[ev.id]?.guests || 0, 'guest') }}
        </span>
        <span class="atools__gap"></span>
        <button type="button" class="abtn abtn--small abtn--danger" @click="remove(ev)">{{ confirming === ev.id ? 'Yes, delete' : 'Delete' }}</button>
        <button class="abtn abtn--small abtn--primary">Save</button>
      </div>
    </form>
  </section>
</template>
