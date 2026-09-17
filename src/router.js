import Landing       from './pages/Landing.svelte'
import Login         from './pages/Login.svelte'
import CreateProfile from './pages/CreateProfile.svelte'
import Directory     from './pages/Directory.svelte'
import Profile       from './pages/Profile.svelte'
import Edit          from './pages/Edit.svelte'
import NotFound      from './pages/NotFound.svelte'

export const routes = {
  '/':               Landing,
  '/login':          Login,
  '/create-profile': CreateProfile,
  '/directory':      Directory,
  '/profile/:id':    Profile,
  '/edit':           Edit,
  '*':               NotFound,
}
