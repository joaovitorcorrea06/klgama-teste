<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import { BarController, BarElement, CategoryScale, Chart, Filler, LinearScale, LineController, LineElement, PointElement, Tooltip, type Plugin } from 'chart.js';
import { formatFixed, formatMonth } from '../services/painel';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, LineController, LineElement, PointElement, Filler, Tooltip);
const props = withDefaults(defineProps<{ title: string; months: string[]; series: { label: string; color: string; values: (string | number)[] }[]; kind?: 'bar' | 'line'; stacked?: boolean; unit?: string; scale?: number }>(), { kind: 'bar', stacked: false, unit: '', scale: 2 });
const canvas = ref<HTMLCanvasElement>();
const id = useId();
let chart: Chart<'bar' | 'line'> | undefined;
function render(): void {
  if (!canvas.value) return;
  chart?.destroy();
  const labels: Plugin<'bar' | 'line'> = {
    id: 'compactBarValues',
    afterDatasetsDraw(instance) {
      if (props.kind !== 'bar' || props.stacked || instance.width < 640 || props.months.length > 12) return;
      const { ctx } = instance;
      ctx.save(); ctx.font = '10px Roboto'; ctx.fillStyle = '#606473'; ctx.textAlign = 'center';
      instance.data.datasets.forEach((dataset, datasetIndex) => {
        instance.getDatasetMeta(datasetIndex).data.forEach((element, index) => {
          const value = Number(dataset.data[index]);
          if (!value) return;
          const { x, y } = element.getProps(['x', 'y'], true);
          ctx.fillText(new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value), x, y - 6);
        });
      });
      ctx.restore();
    },
  };
  chart = new Chart(canvas.value, {
    plugins: [labels],
    type: props.kind,
    data: { labels: props.months.map(m => formatMonth(m)), datasets: props.series.map(s => ({ label: s.label, data: s.values.map(Number), backgroundColor: props.kind === 'line' ? `${s.color}12` : s.color, borderColor: s.color, borderWidth: props.kind === 'line' ? 2.5 : 0, borderRadius: props.stacked ? 0 : 3, maxBarThickness: 24, tension: 0.25, pointRadius: 3, pointHoverRadius: 5, fill: props.kind === 'line' })) },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false, layout: { padding: { top: 18 } },
      interaction: { mode: 'index', intersect: false },
      plugins: { tooltip: { backgroundColor: '#262b3c', padding: 12, titleFont: { family: 'Roboto' }, bodyFont: { family: 'Roboto' }, callbacks: { title: items => items[0] ? formatMonth(props.months[items[0].dataIndex], true) : '', label: item => `${props.series[item.datasetIndex].label}: ${formatFixed(String(props.series[item.datasetIndex].values[item.dataIndex]), props.scale)}${props.unit ? ` ${props.unit}` : ''}` } } },
      scales: {
        x: { stacked: props.stacked, grid: { display: false }, border: { display: false }, ticks: { autoSkip: true, maxTicksLimit: 12, maxRotation: 0, color: '#727376', font: { family: 'Roboto', size: 11 } } },
        y: { stacked: props.stacked, beginAtZero: true, border: { display: false }, grid: { color: '#eceef1' }, ticks: { precision: props.scale === 0 ? 0 : undefined, maxTicksLimit: 5, color: '#727376', font: { family: 'Roboto', size: 11 }, callback: value => new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value)) } },
      },
    },
  });
}
onMounted(render);
watch(() => [props.months, props.series, props.kind, props.stacked, props.unit, props.scale], () => void nextTick(render), { deep: true });
onBeforeUnmount(() => chart?.destroy());
</script>

<template>
  <div class="dashboard-chart">
    <ul
      class="chart-legend"
      aria-label="Legenda"
    >
      <li
        v-for="serie in series"
        :key="serie.label"
      >
        <span
          :style="{ backgroundColor: serie.color }"
          aria-hidden="true"
        />{{ serie.label }}{{ unit ? ` (${unit})` : '' }}
      </li>
    </ul>
    <div class="chart-canvas">
      <canvas
        ref="canvas"
        role="img"
        :aria-label="`${title}. Valores detalhados disponíveis na tabela abaixo.`"
        :aria-describedby="`${id}-table-hint`"
      />
    </div>
    <details class="chart-data">
      <summary :id="`${id}-table-hint`">
        Ver dados em tabela
      </summary><div
        class="table-region"
        tabindex="0"
        role="region"
        :aria-label="`Dados de ${title}`"
      >
        <table class="chart-table">
          <caption class="sr-only">
            {{ title }}{{ unit ? ` (${unit})` : '' }}
          </caption><thead>
            <tr>
              <th scope="col">
                Mês
              </th><th
                v-for="serie in series"
                :key="serie.label"
                scope="col"
              >
                {{ serie.label }}
              </th>
            </tr>
          </thead><tbody>
            <tr
              v-for="(month, index) in months"
              :key="month"
            >
              <th scope="row">
                {{ formatMonth(month) }}
              </th><td
                v-for="serie in series"
                :key="serie.label"
                class="numeric"
              >
                {{ formatFixed(String(serie.values[index]), scale) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </div>
</template>
