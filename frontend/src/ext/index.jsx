// Fork extensions on Home, the one entry point Home.jsx renders (hook table in the plan).
// Order: data-check card, "Dziś" card (Etap 2), weight card, five-day measurements card.
import './ext.css'
import { useStore } from '../store/useStore.js'
import { extOf } from './state.js'
import DataCheckCard from './components/DataCheckCard.jsx'
import WeightCard from './components/WeightCard.jsx'
import RecentMeasurementsCard from './components/RecentMeasurementsCard.jsx'

export function ExtHomeCards() {
  const ext = extOf(useStore(s => s.S))
  return <>
    {ext.homeChecks && <DataCheckCard />}
    {ext.homeWeight && <WeightCard />}
    {ext.homeRecent && <RecentMeasurementsCard />}
  </>
}
