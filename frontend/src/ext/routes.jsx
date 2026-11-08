// Fork extension routes, spread into App.jsx's <Routes> (a fragment of <Route>s is all it accepts).
import { Suspense, lazy } from 'react'
import { Route } from 'react-router-dom'

// Its own chunk: it uses Stats' sticky index, and a static import would pull all of Stats into the start bundle.
const Ptv4Stats = lazy(() => import('./views/Ptv4Stats.jsx'))

export const extRoutes = <>
  <Route path="/ptv4" element={<Suspense fallback={null}><Ptv4Stats /></Suspense>} />
</>
