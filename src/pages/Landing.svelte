<script>
  import { onMount, onDestroy } from "svelte";
  import BentoCard from "../components/BentoCard.svelte";
  import StatsChart from "../components/StatsChart.svelte";
  import { getAllSkills, getAggregates } from "../lib/firestore.js";
  import { user, authReady } from "../stores/auth.js";
  import { signInWithGoogle } from "../lib/auth.js";
  import { push } from "svelte-spa-router";

  let skills = [];
  let aggregates = { mcaCount: 0, mscCount: 0 };
  let topSkills = [];
  let totalStudents = 0;
  let totalSkills = 0;
  let searchQuery = "";
  let loading = true;

  // count-up state
  let displayTotal = 0;
  let displayMca = 0;
  let displayMsc = 0;

  // rotating typewriter headline state
  const headlines = [
    "git clone talent",
    "404: Boring Portfolios Not Found",
    "O(1) lookup for great hires",
    "Compiled from two batches, zero bugs.",
    "import talent from RCSS",
    "Ctrl+F for your next hire",
  ];

  let displayedHeadline = "";
  let activeTimer = null;

  function runTypewriter() {
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function tick() {
      const currentPhrase = headlines[phraseIndex];

      if (!isDeleting) {
        // Typing forward
        charIndex++;
        displayedHeadline = currentPhrase.slice(0, charIndex);

        if (charIndex === currentPhrase.length) {
          // Pause when complete so user can read it
          isDeleting = true;
          activeTimer = setTimeout(tick, 2200);
          return;
        }
        activeTimer = setTimeout(tick, 55);
      } else {
        // Backspacing
        charIndex--;
        displayedHeadline = currentPhrase.slice(0, charIndex);

        if (charIndex === 0) {
          // Finished erasing, advance to next phrase
          isDeleting = false;
          phraseIndex = (phraseIndex + 1) % headlines.length;
          activeTimer = setTimeout(tick, 450);
          return;
        }
        activeTimer = setTimeout(tick, 28);
      }
    }

    activeTimer = setTimeout(tick, 250);
  }

  onDestroy(() => {
    if (activeTimer) clearTimeout(activeTimer);
  });

  onMount(async () => {
    runTypewriter();
    const [s, agg] = await Promise.all([getAllSkills(), getAggregates()]);
    skills = s;
    aggregates = agg;
    totalStudents = (agg.mcaCount || 0) + (agg.mscCount || 0);
    totalSkills = s.length;

    topSkills = [...s]
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 8);

    loading = false;
    animateCounts();
  });

  function animateCounts() {
    const duration = 500;
    const steps = 30;
    const interval = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      displayTotal = Math.round(totalStudents * progress);
      displayMca = Math.round((aggregates.mcaCount || 0) * progress);
      displayMsc = Math.round((aggregates.mscCount || 0) * progress);
      if (step >= steps) clearInterval(timer);
    }, interval);
  }

  function handleSearchSubmit() {
    push(
      `/directory${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ""}`,
    );
  }

  async function handleSignIn() {
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error(e);
    }
  }

  function handleBarClick(label) {
    const skill = skills.find((s) => s.name === label);
    if (skill) push(`/directory?skill=${skill.id}`);
  }
</script>

<svelte:head>
  <title>.batchrc · MCA &amp; MSc CS 2025–27</title>
  <meta
    name="description"
    content="Explore the skills, projects, and profiles of students from the MCA and MSc CS 2025–27 batch."
  />
</svelte:head>

<div class="landing">
  <!-- ═══ HERO ═══ -->
  <section class="hero page-wrapper">
    <div class="bento-grid">
      <div class="span-12 hero-card card">
        <div class="hero-content">
          <p class="hero-eyebrow text-caption">
            MCA &amp; MSc CS · 2025–27 Batch · RCSS Kalamassery
          </p>
          <h1
            class="text-hero hero-heading"
            aria-label="O(1) lookup for great hires"
          >
            <span class="typed-text">{displayedHeadline}</span><span
              class="typing-cursor"
              aria-hidden="true"
            ></span>
          </h1>
          <p class="hero-sub text-body">
            Browse skills, projects, and profiles — from data scientists to
            full-stack engineers.
          </p>
          <div class="hero-ctas">
            <button
              class="btn btn-primary btn-lg"
              on:click={() => push("/directory")}>Browse Directory</button
            >
            {#if $authReady && !$user}
              <button class="btn btn-secondary btn-lg" on:click={handleSignIn}>
                <svg width="18" height="18" viewBox="0 0 24 24"
                  ><path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  /><path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  /><path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  /><path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  /></svg
                >
                Sign in with Google
              </button>
            {/if}
          </div>
        </div>
        <div class="hero-deco" aria-hidden="true">
          <div class="deco-circle c1"></div>
          <div class="deco-circle c2"></div>
          <div class="deco-circle c3"></div>
        </div>
      </div>
    </div>
  </section>

  <!-- ═══ SEARCH (Open to all) ═══ -->
  <section class="search-section page-wrapper" style="padding-top: 1.5rem;">
    <div class="bento-grid">
      <div class="span-12 search-card card">
        <p class="text-section" style="margin-bottom:0.5rem">Find a student</p>
        <p class="text-caption" style="margin-bottom:1.25rem">
          Search by name, skill, or batch.
        </p>
        <form class="search-row" on:submit|preventDefault={handleSearchSubmit}>
          <input
            class="search-input"
            id="landing-search"
            type="search"
            placeholder="e.g. &quot;React&quot; or &quot;Gloria&quot;"
            bind:value={searchQuery}
            autocomplete="off"
          />
          <button type="submit" class="btn btn-primary"> Search </button>
        </form>
      </div>
    </div>
  </section>

  <!-- ═══ STATS DASHBOARD ═══ -->
  <section class="stats-section page-wrapper">
    <h2 class="text-section stats-heading">Batch at a glance</h2>
    <div class="bento-grid">
      <!-- Total students -->
      <BentoCard span={3}>
        <p class="text-caption">Total students</p>
        <p class="text-stat count-up">{loading ? "—" : displayTotal}</p>
        {#if !loading}
          <p class="text-caption">
            MCA · {displayMca} &nbsp;|&nbsp; MSc CS · {displayMsc}
          </p>
        {/if}
      </BentoCard>

      <!-- Total skills -->
      <BentoCard span={3}>
        <p class="text-caption">Skills tracked</p>
        <p class="text-stat count-up">{loading ? "—" : totalSkills}</p>
        <p class="text-caption">and growing</p>
      </BentoCard>

      <!-- Batch split -->
      <BentoCard span={6} rows={2}>
        <p class="text-card" style="margin-bottom:0.75rem">Batch breakdown</p>
        {#if loading}
          <div class="skeleton" style="height:80px;border-radius:0.5rem"></div>
        {:else}
          <div class="batch-split">
            <div class="batch-bar">
              <div
                class="batch-fill mca"
                style="width:{totalStudents
                  ? (aggregates.mcaCount / totalStudents) * 100
                  : 50}%"
              ></div>
              <div
                class="batch-fill msc"
                style="width:{totalStudents
                  ? (aggregates.mscCount / totalStudents) * 100
                  : 50}%"
              ></div>
            </div>
            <div class="batch-legend">
              <span class="badge badge-mca"
                >MCA — {aggregates.mcaCount || 0}</span
              >
              <span class="badge badge-msc"
                >MSc CS — {aggregates.mscCount || 0}</span
              >
            </div>
          </div>
        {/if}
      </BentoCard>

      <!-- Top skills bar chart -->
      <BentoCard span={6} rows={3}>
        <p class="text-card" style="margin-bottom:0.75rem">Top skills</p>
        {#if loading}
          <div class="skeleton" style="height:200px;border-radius:0.5rem"></div>
        {:else if topSkills.length === 0}
          <p class="text-caption">No skills logged yet — be the first!</p>
        {:else}
          <div style="flex:1;min-height:200px">
            <StatsChart
              type="bar"
              labels={topSkills.map((s) => s.name)}
              data={topSkills.map((s) => s.usageCount || 0)}
              onBarClick={handleBarClick}
            />
          </div>
          {#if skills.length > 8}
            <a
              href="/#/directory"
              class="text-caption"
              style="margin-top:0.75rem;display:block"
            >
              +{skills.length - 8} more skills — view directory →
            </a>
          {/if}
        {/if}
      </BentoCard>
    </div>
  </section>
</div>

<style>
  .landing {
    padding-bottom: 4rem;
  }
  .hero {
    padding-top: 2.5rem;
  }
  .hero-card {
    position: relative;
    overflow: hidden;
    min-height: 320px;
    display: flex;
    align-items: center;
    background: linear-gradient(
      135deg,
      var(--surface) 60%,
      var(--accent-soft) 100%
    );
  }
  .hero-content {
    position: relative;
    z-index: 2;
    max-width: 600px;
  }
  .hero-eyebrow {
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 0.75rem;
  }
  .hero-heading {
    font-family: var(--font-mono, "Geist Mono", monospace);
    font-weight: 700;
    line-height: 1.18;
    letter-spacing: -0.025em;
    margin-bottom: 0.875rem;
    min-height: 2.3em;
  }
  .typed-text {
    color: var(--text-primary);
  }
  .typing-cursor {
    display: inline-block;
    width: 3px;
    height: 0.85em;
    vertical-align: -0.05em;
    background-color: var(--primary);
    margin-left: 4px;
    border-radius: 1.5px;
    animation: blink 0.8s infinite;
  }
  @keyframes blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
  }
  .hero-sub {
    color: var(--text-secondary);
    margin-bottom: 1.75rem;
  }
  .hero-ctas {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  /* Decorative circles */
  .hero-deco {
    position: absolute;
    right: -60px;
    top: -60px;
    pointer-events: none;
    z-index: 1;
  }
  .deco-circle {
    position: absolute;
    border-radius: 50%;
    opacity: 0.12;
  }
  .c1 {
    width: 320px;
    height: 320px;
    background: var(--accent);
    top: 0;
    right: 0;
  }
  .c2 {
    width: 200px;
    height: 200px;
    background: var(--chart-2);
    top: 60px;
    right: 80px;
  }
  .c3 {
    width: 120px;
    height: 120px;
    background: var(--chart-3);
    top: -30px;
    right: 200px;
  }

  .stats-section,
  .search-section {
    padding-top: 3rem;
  }
  .stats-heading {
    margin-bottom: 1.25rem;
  }

  /* Batch split bar */
  .batch-split {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 0.5rem;
  }
  .batch-bar {
    display: flex;
    height: 40px;
    border-radius: 0.5rem;
    overflow: hidden;
    background: var(--surface-border);
  }
  .batch-fill {
    height: 100%;
    transition: width 0.6s ease;
  }
  .batch-fill.mca {
    background: var(--chart-1);
  }
  .batch-fill.msc {
    background: var(--chart-2);
  }
  .batch-legend {
    display: flex;
    gap: 0.75rem;
  }

  /* Search */
  .search-card {
    background: linear-gradient(
      135deg,
      var(--surface) 0%,
      var(--accent-soft) 100%
    );
    text-align: center;
    padding: 2.5rem;
  }
  .search-row {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    flex-wrap: wrap;
  }
  .search-input {
    background: var(--bg);
    border: none;
    box-shadow: var(--shadow-neu-inset-sm);
    border-radius: 0.5rem;
    padding: 0.625rem 1rem;
    color: var(--text-primary);
    font-size: 0.9375rem;
    width: 320px;
    max-width: 100%;
    outline: none;
    transition: box-shadow 0.15s;
  }
  .search-input:focus {
    box-shadow:
      var(--shadow-neu-inset-sm),
      0 0 0 2px var(--accent);
  }
</style>
