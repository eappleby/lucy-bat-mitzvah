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
  shallows: {
    heading: "Hi, I'm Lucy!",
    body: [
      "I'm becoming a bat mitzvah on March 20, 2027, and I want you there.",
      'Keep swimming down. There are photos to pop, a sketchbook to peek at, and 7 pearls hiding on the way to the sea floor.',
    ],
  },
  reef: { heading: 'The reef crew', body: 'My favorite people. Pop a bubble to see who is inside.' },
  cinema: { heading: 'Lucy, so far', body: 'A very short movie.' },
  sketchbook: {
    heading: "Lucy's sketchbook",
    body: 'Drawings, stories, and ideas, straight from me.',
    empty: 'Lucy is still filling these pages. Swim back soon.',
  },
  bottle: {
    heading: 'Message in a bottle',
    body: 'Write Lucy a note and toss it in. She reads every one.',
  },
  floor: {
    heading: 'You made it to the sea floor!',
    body: 'One last thing. A save the date is swimming your way, and the turtle needs to know where to deliver it.',
    known: 'We already have an address for you. Moved? Send the new one.',
  },
}

// pos is the CSS object-position used when a photo is cropped into a circle.
export const photos = [
  { id: 'beach-sunset', caption: 'Sunset swim', pos: '50% 28%' },
  { id: 'boogie-board', caption: 'Catching a wave', pos: '82% 75%' },
  { id: 'ball-pit', caption: 'Deep in the ball pit', pos: '50% 30%' },
  { id: 'big-jump', caption: 'Jump!', pos: '50% 50%' },
  { id: 'orange-gates', caption: 'A thousand orange gates', pos: '50% 48%' },
  { id: 'sidewalk-trio', caption: 'Fall dance break', pos: '50% 35%' },
  { id: 'giant-boba', caption: 'Biggest boba ever', pos: '22% 45%' },
  { id: 'camp-mud', caption: 'Mud day at camp', pos: '50% 40%' },
  { id: 'costume-crew', caption: 'Costume crew', pos: '50% 40%' },
  { id: 'peace-signs', caption: 'Double peace', pos: '50% 30%' },
  { id: 'subway', caption: 'Subway ride', pos: '45% 40%' },
  { id: 'pizza', caption: 'Pizza night', pos: '55% 35%' },
  { id: 'group-hug', caption: 'Group hug', pos: '50% 42%' },
  { id: 'kimonos', caption: 'Kimono day', pos: '50% 45%' },
  { id: 'block-party', caption: 'Block party', pos: '50% 40%' },
  { id: 'italian-ice', caption: 'Icy treat', pos: '50% 22%' },
  { id: 'floor-pile', caption: 'Pile up', pos: '50% 50%' },
  { id: 'braids-walk', caption: 'Braids and backpacks', pos: '50% 32%' },
  { id: 'cave', caption: 'Lost in a cave', pos: '40% 38%' },
  { id: 'halloween-night', caption: 'Halloween night', pos: '50% 45%' },
  { id: 'city-walk', caption: 'Out on the town', pos: '55% 38%' },
  { id: 'pink-jacket', caption: 'Smile!', pos: '50% 30%' },
]

export const photoSrc = (id) => `/photos/${id}.webp`
export const photoThumb = (id) => `/photos/${id}-sm.webp`
