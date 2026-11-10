<script setup>
import { onMounted, ref } from 'vue'
import { supabase } from '../lib/supabase.js'
import { toast, failed, formatWhen } from './store.js'

const bottles = ref([])
const loaded = ref(false)
const confirming = ref(null)

async function load() {
  const { data, error } = await supabase.from('bottle_messages').select('*').order('created_at', { ascending: false })
  if (failed(error, 'load the notes')) return
  bottles.value = data
  loaded.value = true
}
onMounted(load)

async function setApproved(b, approved) {
  const { error } = await supabase.from('bottle_messages').update({ approved }).eq('id', b.id)
  if (failed(error, 'update the note')) return
  b.approved = approved
  toast(approved ? 'Now showing on the site' : 'Hidden from the site')
}

async function remove(b) {
  if (confirming.value !== b.id) return (confirming.value = b.id)
  const { error } = await supabase.from('bottle_messages').delete().eq('id', b.id)
  if (failed(error, 'delete the note')) return
  bottles.value = bottles.value.filter((x) => x.id !== b.id)
  toast('Note deleted')
}
</script>

<template>
  <section>
    <div class="atools"><h2>Notes to Lucy</h2></div>
    <p class="ahint">Notes stay private until you choose to show them. Shown notes float in Bottle bay on the site, with the sender's name.</p>

    <div v-if="loaded && !bottles.length" class="aempty">
      <h2>No bottles yet</h2>
      <p>Notes people toss in from the site will wash up here.</p>
    </div>

    <article v-for="b in bottles" :key="b.id" class="acard">
      <div class="acard__main">
        <h3>{{ b.from_name }}</h3>
        <blockquote>{{ b.message }}</blockquote>
        <p class="acard__meta">Sent {{ formatWhen(b.created_at) }}</p>
      </div>
      <div class="acard__actions">
        <span class="achip" :class="b.approved ? 'achip--ok' : ''">{{ b.approved ? 'Showing on the site' : 'Private' }}</span>
        <button class="abtn abtn--small" @click="setApproved(b, !b.approved)">{{ b.approved ? 'Hide from the site' : 'Show on the site' }}</button>
        <button class="abtn abtn--small abtn--danger" @click="remove(b)">{{ confirming === b.id ? 'Yes, delete' : 'Delete' }}</button>
      </div>
    </article>
  </section>
</template>
