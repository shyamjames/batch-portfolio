import Landing       from './pages/Landing.svelte'
import Login         from './pages/Login.svelte'
import Onboarding    from './pages/Onboarding.svelte'
import CreateProfile from './pages/CreateProfile.svelte'
import Directory     from './pages/Directory.svelte'
import Profile       from './pages/Profile.svelte'
import Edit          from './pages/Edit.svelte'
import Admin         from './pages/Admin.svelte'
import NotFound      from './pages/NotFound.svelte'

export const routes = {
  '/':               Landing,
  '/login':          Login,
  '/onboarding':     Onboarding,
  '/create-profile': CreateProfile,
  '/directory':      Directory,
  '/profile/:id':    Profile,
  '/edit':           Edit,
  '/admin':          Admin,
  '*':               NotFound,
}
