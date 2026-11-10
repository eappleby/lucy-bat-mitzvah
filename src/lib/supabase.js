import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../../shared/public-config.js'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)

export function artUrl(path) {
  return `${SUPABASE_URL}/storage/v1/object/public/lucy-art/${path}`
}

// Turns the short error codes raised by the database functions into plain language.
export function friendlyError(error) {
  const msg = error?.message || ''
  if (msg.includes('missing_fields')) return 'Fill in the required fields and try again.'
  if (msg.includes('too_long')) return 'One of the fields is too long. Shorten it and try again.'
  if (msg.includes('too_busy')) return 'Lots of people are sending things right now. Try again in a few minutes.'
  return 'That did not go through. Check your connection and try again.'
}
