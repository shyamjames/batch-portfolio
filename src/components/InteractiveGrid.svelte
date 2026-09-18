<script>
  import { onMount } from 'svelte';

  let mouseX = 0;
  let mouseY = 0;
  let gridContainer;

  onMount(() => {
    const handleMouseMove = (e) => {
      if (!gridContainer) return;
      const rect = gridContainer.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  });
</script>

<div 
  class="interactive-grid" 
  bind:this={gridContainer}
  style="--mouse-x: {mouseX}px; --mouse-y: {mouseY}px;"
>
  <div class="grid-base"></div>
  <div class="grid-highlight"></div>
</div>

<style>
  .interactive-grid {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
    z-index: 0;
    pointer-events: none;
    /* Customize grid size */
    --grid-size: 24px;
    --dot-size: 1.5px;
    
    /* Colors will be overridden by theme variables in app.css, but provide fallbacks */
    --dot-base: var(--grid-dot-base, rgba(0, 0, 0, 0.05));
    --dot-highlight: var(--grid-dot-highlight, rgba(0, 0, 0, 0.8));
    --glow-size: 350px;
  }

  /* Base layer: always visible faint dots */
  .grid-base {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(var(--dot-base) var(--dot-size), transparent var(--dot-size));
    background-size: var(--grid-size) var(--grid-size);
    background-position: center;
  }

  /* Highlight layer: dark dots, masked by mouse position */
  .grid-highlight {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(var(--dot-highlight) var(--dot-size), transparent var(--dot-size));
    background-size: var(--grid-size) var(--grid-size);
    background-position: center;
    /* Mask creates the glowing reveal effect */
    -webkit-mask-image: radial-gradient(
      var(--glow-size) circle at var(--mouse-x) var(--mouse-y),
      black 0%,
      rgba(0, 0, 0, 0.5) 30%,
      transparent 100%
    );
    mask-image: radial-gradient(
      var(--glow-size) circle at var(--mouse-x) var(--mouse-y),
      black 0%,
      rgba(0, 0, 0, 0.5) 30%,
      transparent 100%
    );
  }
</style>
