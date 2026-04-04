/**
 * components/ClickChart.jsx
 * 7-day bar chart using Chart.js (no wrapper library).
 */
import { useEffect, useRef } from 'react';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend, BarController } from 'chart.js';

// Register only what we need (tree-shaking)
Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, BarController);

export default function ClickChart({ analytics }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !analytics?.length) return;

    // Destroy previous chart instance before re-creating
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const labels = analytics.map(d => {
      const date = new Date(d.date + 'T00:00:00Z');
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    });

    const values = analytics.map(d => d.clicks);
    const maxVal = Math.max(...values, 1);

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Clicks',
          data:  values,
          backgroundColor: values.map(v =>
            v === maxVal ? 'rgba(99, 102, 241, 0.9)' : 'rgba(99, 102, 241, 0.18)'
          ),
          borderColor: values.map(v =>
            v === maxVal ? 'rgba(99, 102, 241, 1)' : 'rgba(99, 102, 241, 0.4)'
          ),
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#ffffff',
            titleColor: '#4338ca',
            bodyColor: '#374151',
            borderColor: 'rgba(0,0,0,0.1)',
            borderWidth: 1,
            callbacks: {
              title: items => items[0].label,
              label:  item => ` ${item.raw} click${item.raw !== 1 ? 's' : ''}`,
            },
          },
        },
        scales: {
          x: {
            grid:  { color: 'rgba(0,0,0,0.05)' },
            ticks: { color: '#9ca3af', font: { family: 'JetBrains Mono', size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid:  { color: 'rgba(0,0,0,0.05)' },
            ticks: {
              color: '#9ca3af',
              font: { family: 'JetBrains Mono', size: 11 },
              stepSize: 1,
              precision: 0,
            },
          },
        },
        animation: {
          duration: 500,
          easing: 'easeOutQuart',
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [analytics]);

  return (
    <div className="chart-wrapper" style={{ height: '220px', position: 'relative' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}