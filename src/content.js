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
  address: {
    comingSoon: 'is coming soon!',
    confirmQuestion: 'Is this your address?',
    yes: 'Yes',
    no: 'No',
    formHeading: 'Where should we mail it?',
    send: 'Send my address',
    sending: 'Sending',
    thanksHeading: 'Thank you!',
    thanksBody: "We'll mail it to {city}.",
    change: 'Change my address',
    unknownLink: "We don't recognize this link, but you can still send your address here.",
  },
  shallows: {
    heading: "Hi, I'm Lucy!",
    body: [
      "I'm becoming a bat mitzvah on March 20, 2027, and I want you there.",
      'Scroll down to see how I got here. There are 7 pearls hiding on the way.',
    ],
    timelineHeading: 'Me, over the years',
  },
  reef: { heading: 'The reef crew', body: 'My friends. Pop a bubble to see who is inside.' },
  journey: {
    heading: 'How I got here',
    body: 'Keep scrolling and I will walk you through it.',
    hint: 'Scroll to walk',
  },
  bottle: {
    heading: 'Message in a bottle',
    body: 'Write Lucy a note and toss it in. She reads every one.',
  },
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
