// Fork extensions on Home, the one entry point Home.jsx renders (hook table in the plan).
// Order: data-check card (Etap 1), "Dziś" card (Etap 2), weight card, five-day measurements card.
import './ext.css'
import WeightCard from './components/WeightCard.jsx'
import RecentMeasurementsCard from './components/RecentMeasurementsCard.jsx'

export function ExtHomeCards() {
  return <>
    <WeightCard />
    <RecentMeasurementsCard />
  </>
}
