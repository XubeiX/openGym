// Fork extensions on Home, the one entry point Home.jsx renders (hook table in the plan).
// Order and switches: S.ext.layout.home (layout.js), set in Settings → Dodatki.
import './ext.css'
import { useStore } from '../store/useStore.js'
import { extOf } from './state.js'
import { layoutOf } from './layout.js'
import HealthCard from './components/HealthCard.jsx'
import DataCheckCard from './components/DataCheckCard.jsx'
import TodayCard from './components/TodayCard.jsx'
import WeightCard from './components/WeightCard.jsx'
import RecentMeasurementsCard from './components/RecentMeasurementsCard.jsx'
import NeatCard from './components/NeatCard.jsx'
import { usePtv4 } from './lib/ptv4.js'
import { hasSteps } from './lib/neat.js'

// Offline, signed out or no steps from ptv4 → the card is not there, like "Dziś".
function HomeNeatCard() {
  const rows = usePtv4(['body']).data?.body
  return Array.isArray(rows) && rows.some(hasSteps) ? <NeatCard rows={rows} /> : null
}

const CARDS = { checks: DataCheckCard, today: TodayCard, weight: WeightCard, recent: RecentMeasurementsCard, neat: HomeNeatCard }

export function ExtHomeCards() {
  const ext = extOf(useStore(s => s.S))
  return <>
    <HealthCard />{/* always first, and only while something is broken */}
    {layoutOf(ext, 'home').filter(c => c.on).map(c => { const Card = CARDS[c.id]; return <Card key={c.id} tiles={c.tiles} /> })}
  </>
}
