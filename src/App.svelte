<script>
  import Router from 'svelte-spa-router'
  import Navbar from './components/Navbar.svelte'
  import Footer from './components/Footer.svelte'
  import Toast  from './components/Toast.svelte'
  import { routes } from './router.js'
</script>

<div class="app-container">
  <Navbar />
  <main class="main-content">
    <Router {routes} />
  </main>
  <Footer />
  <Toast />
</div>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  .main-content {
    flex: 1 0 auto;
  }
</style>
