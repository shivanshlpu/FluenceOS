import { useEffect, useRef } from 'react';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, PointElement, LineElement,
    Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function ProgressChart({ sessionScores = [] }) {
    // If no data, show empty state
    if (!sessionScores || sessionScores.length === 0) {
        return (
            <div style={{
                background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)',
                padding: '24px', textAlign: 'center', color: 'var(--text-muted)',
                minHeight: '160px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
                <span style={{ fontSize: '32px' }}>📈</span>
                <p style={{ fontSize: '13px', fontWeight: 600 }}>No sessions yet</p>
                <p style={{ fontSize: '12px' }}>Complete speaking sessions to see your progress chart</p>
            </div>
        );
    }

    const labels = sessionScores.map((s, i) => s.date || `Session ${i + 1}`);
    const scores = sessionScores.map(s => s.score || 0);

    const data = {
        labels,
        datasets: [
            {
                label: 'Speaking Score',
                data: scores,
                borderColor: '#1ed760',
                backgroundColor: 'rgba(30, 215, 96, 0.08)',
                borderWidth: 2.5,
                pointBackgroundColor: '#1ed760',
                pointBorderColor: '#121212',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.4,
                fill: true,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1a1a1a',
                titleColor: '#fff',
                bodyColor: '#1ed760',
                borderColor: '#333',
                borderWidth: 1,
                padding: 10,
                callbacks: {
                    label: (ctx) => ` Score: ${ctx.parsed.y}/10`,
                    afterLabel: (ctx) => {
                        const s = sessionScores[ctx.dataIndex];
                        return s?.topic ? ` Topic: ${s.topic}` : '';
                    }
                }
            },
        },
        scales: {
            y: {
                min: 0,
                max: 10,
                ticks: { color: '#666', stepSize: 2, font: { size: 11 } },
                grid: { color: 'rgba(255,255,255,0.05)' },
            },
            x: {
                ticks: { color: '#666', font: { size: 11 } },
                grid: { display: false },
            },
        },
    };

    return (
        <div style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-secondary)' }}>
                📈 Speaking Score History
            </p>
            <div style={{ height: '160px' }}>
                <Line data={data} options={options} />
            </div>
        </div>
    );
}
