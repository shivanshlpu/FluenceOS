import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function SkillDemandChart({ skills = [], role = '' }) {
    if (!skills.length) return null;

    const data = {
        labels: skills.map((s) => s.skill),
        datasets: [{
            label: 'Demand Score',
            data: skills.map((s) => s.demand),
            backgroundColor: skills.map((_, i) => {
                const colors = [
                    'rgba(168, 85, 247, 0.7)', 'rgba(96, 165, 250, 0.7)', 'rgba(30, 215, 96, 0.7)',
                    'rgba(251, 191, 36, 0.7)', 'rgba(244, 114, 182, 0.7)', 'rgba(251, 146, 60, 0.7)',
                    'rgba(241, 94, 108, 0.7)', 'rgba(45, 212, 191, 0.7)', 'rgba(167, 139, 250, 0.7)',
                    'rgba(134, 239, 172, 0.7)',
                ];
                return colors[i % colors.length];
            }),
            borderRadius: 6,
            borderWidth: 0,
        }],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: {
                display: true,
                text: `Top Skills for ${role}`,
                font: { family: 'Figtree', size: 16, weight: 700 },
                color: '#FFFFFF',
            },
        },
        scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#B3B3B3', font: { family: 'Figtree', weight: 400 } } },
            x: { grid: { display: false }, ticks: { color: '#B3B3B3', font: { family: 'Figtree', weight: 400, size: 11 } } },
        },
    };

    return (
        <div style={{ background: 'var(--bg-elevated-1)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
            <div style={{ height: '350px' }}>
                <Bar data={data} options={options} />
            </div>
        </div>
    );
}
