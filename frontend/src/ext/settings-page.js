// The fork's Settings page. Added to PAGES after PAGE_IDS is taken (views/settings-pages.js):
// its Polish title is not in the language packs, which settings-pages.test.jsx requires of
// every page in PAGE_IDS, and the settings search does not list it. A sub-page of Look & Home
// (opened from its "On Home" section, Settings.jsx), not a root row: the root's rows are pinned
// by settings-pages.test.jsx.
export const EXT_PAGES = { ext: { title: 'Dodatki', icon: 'plusCircle', tint: 'var(--green)', parent: 'look' } }
