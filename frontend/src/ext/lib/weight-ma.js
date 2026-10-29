// MA7 / MA28 of the weigh-ins, the same rule as ptv4 (analyze.py weight_daily_rows): one weight
// per day, a window of 7 / 28 calendar days up to and including that day, and a value only with
// at least 4 / 14 weigh-ins in it. weight-ma.test.js holds the same data as ptv4's test_analyze.py,
// so a change of the rule on either side fails one of them.

const MIN = { 7: 4, 28: 14 }
const dayNo = d => Math.round(new Date(d + 'T12:00:00Z').getTime() / 86400000)

// [{ d, w, ma7, ma28 }] oldest first; ma7 / ma28 null below the minimum.
export function weightMA(bodyweight) {
  const log = (bodyweight || []).filter(b => b?.d && Number(b.w) > 0)
    .slice().sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0))
  const avg = (i, days) => {
    const n = dayNo(log[i].d)
    const ws = []
    for (let j = i; j >= 0 && n - dayNo(log[j].d) < days; j--) ws.push(Number(log[j].w))
    return ws.length >= MIN[days] ? ws.reduce((a, b) => a + b, 0) / ws.length : null
  }
  return log.map((b, i) => ({ d: b.d, w: Number(b.w), ma7: avg(i, 7), ma28: avg(i, 28) }))
}
