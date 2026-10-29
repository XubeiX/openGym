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
  onHome: 'Strona główna',
  onHomeFooter: 'Wbudowaną kartę masy ciała wyłączysz w Wygląd i Start.',
  weightCardTitle: 'Waga z MA7 / MA28',
  weightCardSub: 'Karta wagi z przełącznikiem średnich liczonych jak w ptv4.',
  recentCardTitle: 'Pomiary z 5 dni',
  recentCardSub: 'Ostatnie dni pomiarów; dotknij dnia, żeby go uzupełnić.',
}
