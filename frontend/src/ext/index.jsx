// Fork extensions on Home, the one entry point Home.jsx renders (hook table in the plan).
// Order and switches: S.ext.layout.home (layout.js), set in Settings → Dodatki.
import './ext.css'
import { useStore } from '../store/useStore.js'
import { extOf } from './state.js'
import { layoutOf } from './layout.js'
import DataCheckCard from './components/DataCheckCard.jsx'
import TodayCard from './components/TodayCard.jsx'
import WeightCard from './components/WeightCard.jsx'
import RecentMeasurementsCard from './components/RecentMeasurementsCard.jsx'

const CARDS = { checks: DataCheckCard, today: TodayCard, weight: WeightCard, recent: RecentMeasurementsCard }

export function ExtHomeCards() {
  const ext = extOf(useStore(s => s.S))
  return <>{layoutOf(ext, 'home').filter(c => c.on).map(c => { const Card = CARDS[c.id]; return <Card key={c.id} tiles={c.tiles} /> })}</>
}
