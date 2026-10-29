// Fork extension routes, spread into App.jsx's <Routes> (a fragment of <Route>s is all it accepts).
import { Route } from 'react-router-dom'
import Ptv4Stats from './views/Ptv4Stats.jsx'

export const extRoutes = <>
  <Route path="/ptv4" element={<Ptv4Stats />} />
</>
