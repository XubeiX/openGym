// Polish texts of the fork's extensions. Not in locales/: scripts/check-locales.mjs compares the
// language packs and a key present in one only would fail upstream's CI.
export const L = {
  weight: 'Waga',
  weighIns: 'Ważenia',
  log: 'Dodaj',
  goal: 'Cel',
  goalReached: 'osiągnięty!',
  toGain: 'do przybrania',
  toLose: 'do zrzucenia',
  allWeighIns: 'Wszystkie ważenia',
  noWeighIns: 'Brak ważeń. Dodaj wagę, żeby zacząć wykres.',
  maMissing: n => `Za mało ważeń na MA${n}.`,
  measurements: 'Pomiary',
  measurementHistory: 'Historia pomiarów',
}
