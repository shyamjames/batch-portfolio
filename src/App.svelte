<script>
  import Router from 'svelte-spa-router'
  import Navbar from './components/Navbar.svelte'
  import Toast  from './components/Toast.svelte'
  import { routes } from './router.js'
</script>

<Navbar />
<main>
  <Router {routes} />
</main>
<Toast />

<style>
  main {
    min-height: calc(100vh - 60px);
  }
</style>
