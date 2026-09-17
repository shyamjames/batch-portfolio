<script>
  import { onMount } from 'svelte'
  import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend, ArcElement, DoughnutController } from 'chart.js'

  Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend, ArcElement, DoughnutController)

  export let type = 'bar'       // 'bar' | 'doughnut'
  export let labels = []
  export let data = []
  export let onBarClick = null  // (label, index) => void

  let canvas
  let chart

  $: chartColors = [
    getComputedStyle(document.documentElement).getPropertyValue('--chart-1').trim() || '#4f46e5',
    getComputedStyle(document.documentElement).getPropertyValue('--chart-2').trim() || '#06b6d4',
    getComputedStyle(document.documentElement).getPropertyValue('--chart-3').trim() || '#f59e0b',
    getComputedStyle(document.documentElement).getPropertyValue('--chart-4').trim() || '#ec4899',
  ]

  onMount(() => {
    buildChart()
    return () => chart?.destroy()
  })

  $: if (chart && labels && data) {
    chart.data.labels = labels
    chart.data.datasets[0].data = data
    chart.update()
  }

  function buildChart() {
    const textSecondary = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim()
    const surfaceBorder = getComputedStyle(document.documentElement).getPropertyValue('--surface-border').trim()

    const barColors = data.map((_, i) => [
      '#4f46e5','#06b6d4','#f59e0b','#ec4899'
    ][i % 4])

    chart = new Chart(canvas, {
      type,
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: type === 'bar' ? barColors : ['#4f46e5','#06b6d4','#f59e0b','#ec4899'],
          borderColor: 'transparent',
          borderRadius: type === 'bar' ? 6 : 0,
          borderWidth: 0,
          barThickness: type === 'bar' ? 20 : undefined,
          minBarLength: type === 'bar' ? 6 : undefined,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: type === 'bar' ? 'y' : 'x',
        plugins: {
          legend: { display: type === 'doughnut', position: 'bottom', labels: { color: textSecondary, boxWidth: 12, padding: 16 } },
          tooltip: { enabled: true },
        },
        scales: type === 'bar' ? {
          x: { grid: { color: surfaceBorder }, ticks: { color: textSecondary } },
          y: { grid: { display: false }, ticks: { color: textSecondary } },
        } : undefined,
        onClick: onBarClick ? (event, elements) => {
          if (elements.length > 0) {
            const i = elements[0].index
            onBarClick(labels[i], i)
          }
        } : undefined,
      },
    })
  }
</script>

<div class="chart-wrapper">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .chart-wrapper { position: relative; width: 100%; height: 100%; min-height: 200px; }
  canvas { width: 100% !important; }
</style>
