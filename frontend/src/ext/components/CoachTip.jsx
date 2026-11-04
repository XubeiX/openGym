import { useStore } from '../../store/useStore.js'
import Icon from '../../components/Icon.jsx'
import { coachTipFor } from '../lib/coach-tips.js'
import { L } from '../strings.js'

// ptv4's suggestion for this exercise of the session (lib/coach-tips.js), or nothing. Both workout
// views show it last, as plain text under the progression line: progline above the sets, or
// focus-guidance in the focus view.
export default function CoachTip({ entry, className = 'progline' }) {
  const text = useStore(s => entry ? coachTipFor(s.S, entry.rid, entry.id) : null)
  if (!text) return null
  return <div className={className} style={{ alignItems: 'flex-start', fontWeight: 400 }}>
    <Icon name="lightbulb" style={{ marginTop: 2 }} /><span>{L.coachTip}: {text}</span>
  </div>
}
