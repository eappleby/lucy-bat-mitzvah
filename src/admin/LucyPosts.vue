<script setup>
import { onMounted, reactive, ref } from 'vue'
import { supabase, artUrl } from '../lib/supabase.js'
import { toast, failed } from './store.js'

const posts = ref([])
const loaded = ref(false)
const busy = ref(false)
const confirming = ref(null)
const draft = reactive({ id: null, kind: 'drawing', title: '', body: '', image_path: null, file: null })
const fileInput = ref(null)

async function load() {
  const { data, error } = await supabase.from('lucy_posts').select('*').order('sort').order('created_at', { ascending: false })
  if (failed(error, 'load the sketchbook')) return
  posts.value = data
  loaded.value = true
}
onMounted(load)

function reset() {
  Object.assign(draft, { id: null, kind: 'drawing', title: '', body: '', image_path: null, file: null })
  if (fileInput.value) fileInput.value.value = ''
}

function edit(p) {
  Object.assign(draft, { id: p.id, kind: p.kind, title: p.title, body: p.body || '', image_path: p.image_path, file: null })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Phone photos of drawings are huge. Shrink them in the browser before uploading.
async function shrink(file, max = 1800) {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86))
    return blob || file
  } catch {
    return file
  }
}

async function save() {
  if (!draft.title.trim()) return toast('Give it a title first.', 'error')
  busy.value = true
  let image_path = draft.image_path
  if (draft.file) {
    const blob = await shrink(draft.file)
    const path = `${crypto.randomUUID()}.jpg`
    const { error } = await supabase.storage.from('lucy-art').upload(path, blob, { contentType: blob.type || 'image/jpeg' })
    if (failed(error, 'upload the picture')) return (busy.value = false)
    if (draft.image_path) await supabase.storage.from('lucy-art').remove([draft.image_path])
    image_path = path
  }
  const fields = { kind: draft.kind, title: draft.title.trim(), body: draft.body.trim() || null, image_path }
  const { error } = draft.id
    ? await supabase.from('lucy_posts').update(fields).eq('id', draft.id)
    : await supabase.from('lucy_posts').insert({ ...fields, sort: posts.value.length })
  busy.value = false
  if (failed(error, 'save the page')) return
  toast(draft.id ? 'Page saved' : 'Page added. Publish it when it is ready.')
  reset()
  load()
}

async function setPublished(p, published) {
  const { error } = await supabase.from('lucy_posts').update({ published }).eq('id', p.id)
  if (failed(error, 'update the page')) return
  p.published = published
  toast(published ? 'Published to the site' : 'Taken off the site')
}

async function move(i, dir) {
  const j = i + dir
  if (j < 0 || j >= posts.value.length) return
  const list = [...posts.value]
  ;[list[i], list[j]] = [list[j], list[i]]
  posts.value = list
  await Promise.all(list.map((p, sort) => supabase.from('lucy_posts').update({ sort }).eq('id', p.id)))
}

async function remove(p) {
  if (confirming.value !== p.id) return (confirming.value = p.id)
  if (p.image_path) await supabase.storage.from('lucy-art').remove([p.image_path])
  const { error } = await supabase.from('lucy_posts').delete().eq('id', p.id)
  if (failed(error, 'delete the page')) return
  toast('Page deleted')
  load()
}
</script>

<template>
  <section>
    <div class="atools"><h2>Lucy's sketchbook</h2></div>
    <p class="ahint">Add drawings, stories, and ideas here. Nothing shows on the site until it is published.</p>

    <form class="apanel" @submit.prevent="save">
      <h3>{{ draft.id ? 'Edit this page' : 'Add a page' }}</h3>
      <div class="agrid">
        <label class="afield">
          <span>Kind</span>
          <select v-model="draft.kind"><option value="drawing">Drawing</option><option value="story">Story</option><option value="idea">Idea</option></select>
        </label>
        <label class="afield afield--3"><span>Title</span><input v-model="draft.title" maxlength="120" /></label>
        <label class="afield afield--4"><span>Words (optional for drawings)</span><textarea v-model="draft.body" rows="5"></textarea></label>
        <label class="afield afield--4">
          <span>Picture (a photo or scan of the drawing)</span>
          <input ref="fileInput" type="file" accept="image/*" @change="draft.file = $event.target.files[0] || null" />
        </label>
      </div>
      <img v-if="draft.image_path && !draft.file" class="apanel__thumb" :src="artUrl(draft.image_path)" alt="Current picture" />
      <div class="atools">
        <button class="abtn abtn--primary" :disabled="busy">{{ busy ? 'Saving' : draft.id ? 'Save page' : 'Add page' }}</button>
        <button v-if="draft.id" type="button" class="abtn" @click="reset">Cancel</button>
      </div>
    </form>

    <div v-if="loaded && !posts.length" class="aempty">
      <h2>The sketchbook is empty</h2>
      <p>Add the first drawing or story above.</p>
    </div>

    <article v-for="(p, i) in posts" :key="p.id" class="acard">
      <img v-if="p.image_path" class="acard__thumb" :src="artUrl(p.image_path)" :alt="p.title" />
      <div class="acard__main">
        <h3>{{ p.title }}</h3>
        <p class="acard__meta">{{ p.kind }}</p>
        <p v-if="p.body" class="acard__clip">{{ p.body }}</p>
      </div>
      <div class="acard__actions">
        <span class="achip" :class="p.published ? 'achip--ok' : ''">{{ p.published ? 'On the site' : 'Draft' }}</span>
        <button class="abtn abtn--small" @click="setPublished(p, !p.published)">{{ p.published ? 'Take off the site' : 'Publish' }}</button>
        <div class="acard__row">
          <button class="abtn abtn--small abtn--quiet" :disabled="i === 0" @click="move(i, -1)">Move up</button>
          <button class="abtn abtn--small abtn--quiet" :disabled="i === posts.length - 1" @click="move(i, 1)">Move down</button>
        </div>
        <div class="acard__row">
          <button class="abtn abtn--small" @click="edit(p)">Edit</button>
          <button class="abtn abtn--small abtn--danger" @click="remove(p)">{{ confirming === p.id ? 'Yes, delete' : 'Delete' }}</button>
        </div>
      </div>
    </article>
  </section>
</template>
