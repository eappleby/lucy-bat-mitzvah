import { reactive, ref, watch } from 'vue'

// Pearl hunt. Found pearls are remembered on this device only.
export const PEARL_TOTAL = 7
const KEY = 'lucy-pearls'

function readPearls() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

export const foundPearls = ref(readPearls())
export const allPearlsFound = ref(false)

watch(
  foundPearls,
  (v) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(v))
    } catch {
      // Private windows can refuse storage. The hunt still works for this visit.
    }
  },
  { deep: true },
)

export function findPearl(id) {
  if (foundPearls.value.includes(id)) return
  foundPearls.value.push(id)
  if (foundPearls.value.length >= PEARL_TOTAL) allPearlsFound.value = true
}

// The photo lightbox is shared by every section.
export const lightbox = reactive({ open: false, items: [], index: 0 })

export function openLightbox(items, index = 0) {
  lightbox.items = items
  lightbox.index = index
  lightbox.open = true
}

export const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
