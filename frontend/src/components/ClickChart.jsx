/**
 * components/ClickChart.jsx
 * 7-day clicks-per-day bar chart using Chart.js.
 */
import { useEffect, useRef } from 'react';
import {
  Chart,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  BarController,
} from 'chart.js';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, BarController);

export default function ClickChart({ analytics }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !analytics?.length) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const labels = analytics.map(d => {
      const date = new Date(d.date + 'T00:00:00');
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    // Force integer — backend returns string or number depending on pg driver
    const values = analytics.map(d => parseInt(d.clicks, 10) || 0);
    const maxVal = Math.max(...values, 0);

    // Y-axis ceiling: add ~25% headroom, minimum of 5 so axis isn't too cramped
    const yMax = maxVal === 0 ? 5 : Math.ceil(maxVal * 1.3);

    const bgColors     = values.map(v => (v === maxVal && v > 0) ? '#6366f1' : '#c7d2fe');
    const borderColors = values.map(v => (v === maxVal && v > 0) ? '#4f46e5' : '#a5b4fc');

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label:           'Clicks',
          data:            values,
          backgroundColor: bgColors,
          borderColor:     borderColors,
          borderWidth:     1.5,
          borderRadius:    8,
          borderSkipped:   false,
          minBarLength:    4,
        }],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e1b4b',
            titleColor:      '#c7d2fe',
            bodyColor:       '#ffffff',
            padding:         10,
            cornerRadius:    8,
            displayColors:   false,
            callbacks: {
              title: items => items[0].label,
              label: item  => ` ${item.raw} click${item.raw !== 1 ? 's' : ''}`,
            },
          },
        },
        scales: {
          x: {
            grid:   { display: false },
            border: { display: false },
            ticks:  {
              color: '#6b7280',
              font:  { family: "'JetBrains Mono', monospace", size: 11 },
              maxRotation: 0,
            },
          },
          y: {
            beginAtZero: true,
            max:         yMax,        // hard ceiling — scales to real data
            border:      { display: false },
            grid:        { color: 'rgba(0,0,0,0.06)', drawTicks: false },
            ticks: {
              color:    '#6b7280',
              font:     { family: "'JetBrains Mono', monospace", size: 11 },
              padding:  8,
              // Only show whole-number ticks, max 6 labels
              maxTicksLimit: 6,
              callback: value => Number.isInteger(value) ? value : null,
            },
          },
        },
        animation: { duration: 500, easing: 'easeOutQuart' },
      },
    });

    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [analytics]);

  if (!analytics?.length) {
    return (
      <div style={{
        height: '240px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: '#9ca3af', fontSize: '0.875rem',
      }}>
        No click data yet.
      </div>
    );
  }

  return (
    <div style={{ height: '240px', position: 'relative', padding: '0.5rem 0' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}