// All the words and photo captions on the public site live here, so Lucy can
// rewrite anything without touching the components.

export const event = {
  title: ['Bat', 'Mitzvah'],
  whose: "Lucy Appleby's",
  dateText: 'March 20, 2027',
  placeText: 'Park Slope, Brooklyn NY',
  // Midnight Eastern at the start of the day.
  startsAt: '2027-03-20T00:00:00-04:00',
}

export const copy = {
  // The personal address page (/i/<token>) and the shared one (/address).
  // What / shows while the Meet Lucy page is switched off in the admin.
  comingSoon: {
    heading: 'Coming soon!',
    body: 'Lucy is still getting this page ready.',
  },
  // The contact info page (/i/<token> and /address) and its email.
  contact: {
    checkHeading: 'Contact info up to date?',
    checkIntro: "Lucy Appleby's bat mitzvah is happening soon. Could you take a quick look below and let Lucy know if your info is still correct?",
    newHeading: "What's your contact info?",
    newIntro: "Lucy Appleby's bat mitzvah is happening soon. Could you let Lucy know your contact info so we can send you all the details?",
    stillHeading: 'Still correct?',
    stillBody: 'If everything still looks good, confirm below. If anything is outdated or incorrect, just click to update.',
    missingHeading: 'A few things are missing',
    missingBody: 'Could you add what we still need? It only takes a minute.',
    missingNote: 'We still need this',
    confirm: 'Confirm info',
    update: 'Update info',
    addMissing: 'Add missing info',
    addMine: 'Add my info',
    save: 'Save my info',
    saving: 'Saving',
    thanksHeading: 'Thanks {name}!',
    thanksBody: 'You just might be getting a card in the mail from Lucy.',
    unknownLink: "We don't recognize this link, but you can still send Lucy your info here.",
    labels: { address: 'Address', phone: 'Phone', email: 'Email', family: 'Family' },
    subjectCheck: 'Lucy wants to know if your contact info is still up to date?',
    subjectNew: 'Lucy wants to know your contact info',
  },

  shallows: {
    heading: "Hi, I'm Lucy!",
    body: ["I'm becoming a bat mitzvah on March 20, 2027, and I want you there."],
    timelineHeading: 'Me, over the years',
  },
  reef: { heading: 'The reef crew' },
  journey: {
    heading: 'How I got here',
    hint: 'Hold right arrow to walk',
    hintTouch: 'Hold the arrow or swipe',
  },
  bottle: { heading: 'Message in a bottle' },
  finale: {
    heading: 'Invitation to follow.',
    body: 'Stay tuned!',
  },
}

// pos is the CSS object-position used when a photo is cropped to a square or circle.

// The big picture next to "Hi, I'm Lucy!".
export const mainPhoto = { id: 'orange-gates', caption: 'A thousand orange gates', pos: '50% 38%' }

// Lucy over the years, youngest first.
export const timeline = [
  { id: 'baby-bouncer', caption: 'Baby Lucy', pos: '45% 35%' },
  { id: 'toddler-curls', caption: 'Curls!', pos: '50% 40%' },
  { id: 'teal-dress', caption: 'Hi there', pos: '45% 32%' },
  { id: 'swim-goggles', caption: 'Ready to swim', pos: '50% 30%' },
  { id: 'helmet-hug', caption: 'Bike day with Mom', pos: '62% 35%' },
  { id: 'giant-boba', caption: 'Biggest boba ever', pos: '22% 42%' },
  { id: 'pink-jacket', caption: 'Almost 13', pos: '50% 30%' },
]

// The reef crew: friends only.
export const friends = [
  { id: 'couch-four', caption: 'The original crew', pos: '50% 40%' },
  { id: 'art-class', caption: 'Art class', pos: '62% 30%' },
  { id: 'sidewalk-chalk', caption: 'Sidewalk chalk', pos: '45% 45%' },
  { id: 'kimonos', caption: 'Kimono day', pos: '50% 40%' },
  { id: 'ice-cream-bench', caption: 'Ice cream break', pos: '40% 45%' },
  { id: 'jersey-day', caption: 'Jersey day', pos: '50% 25%' },
  { id: 'class-project', caption: 'Class project', pos: '50% 30%' },
  { id: 'big-jump', caption: 'Jump!', pos: '50% 50%' },
  { id: 'skate-crew', caption: 'Skate crew', pos: '50% 30%' },
  { id: 'rink-hug', caption: 'Rink hugs', pos: '50% 30%' },
  { id: 'costume-crew', caption: 'Costume crew', pos: '50% 40%' },
  { id: 'group-hug', caption: 'Group hug', pos: '50% 42%' },
  { id: 'floor-pile', caption: 'Pile up', pos: '50% 50%' },
  { id: 'camp-mud', caption: 'Mud day at camp', pos: '50% 40%' },
  { id: 'block-party', caption: 'Block party', pos: '50% 40%' },
  { id: 'sidewalk-trio', caption: 'Fall dance break', pos: '50% 35%' },
  { id: 'halloween-night', caption: 'Halloween night', pos: '50% 45%' },
]

// Every photo on the site, for looking one up by id (the movie uses this).
export const photos = [
  mainPhoto,
  ...timeline,
  ...friends,
  { id: 'ball-pit', caption: 'Deep in the ball pit', pos: '50% 30%' },
  { id: 'boogie-board', caption: 'Catching a wave', pos: '82% 75%' },
]

export const photoSrc = (id) => `/photos/${id}.webp`
export const photoThumb = (id) => `/photos/${id}-sm.webp`
