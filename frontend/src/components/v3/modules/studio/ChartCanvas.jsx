import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const ChartCanvas = ({ wizardData, year, width, height, onDrawComplete }) => {
    const canvasRef = useRef(null);
    const margin = { top: 80, right: 60, bottom: 60, left: 60 };

    // --- DATA HELPERS ---

    // Get data for a specific year (top N players)
    const getYearlyData = (y) => {
        if (!wizardData.chartData) return [];
        const intYear = Math.round(y);
        return wizardData.chartData.map(p => {
            const val = p.values.find(v => v.year === intYear);
            return {
                name: p.player,
                value: val ? val.value : 0,
            };
        })
            .sort((a, b) => b.value - a.value)
            .slice(0, wizardData.topN);
    };

    // Get historical data for all players up to current year
    const getHistoryData = (y) => {
        if (!wizardData.chartData) return [];
        const intYear = Math.round(y);
        // Only include top N players based on current year performance? Or total?
        // Let's take top N from curent year and show their history.
        const currentTop = getYearlyData(y).map(d => d.name);

        return wizardData.chartData
            .filter(p => currentTop.includes(p.player))
            .map(p => ({
                name: p.player,
                history: p.values.filter(v => v.year <= intYear).sort((a, b) => a.year - b.year)
            }));
    };


    // --- DRAWING FUNCTIONS ---

    const clearCanvas = (ctx) => {
        ctx.fillStyle = wizardData.theme === 'light' ? '#fff' : '#111';
        ctx.fillRect(0, 0, width, height);

        // Title
        ctx.fillStyle = wizardData.theme === 'light' ? '#333' : '#eee';
        ctx.font = "bold 40px Inter, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(`${wizardData.stat.toUpperCase()} - ${wizardData.chartType.replace('_', ' ').toUpperCase()}`, 20, 20);

        // Year Label
        ctx.fillStyle = wizardData.theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
        ctx.font = "bold 200px Inter, sans-serif";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText(Math.floor(year), width - 20, height - 20);
    };

    const drawBarRace = (ctx, data) => {
        const barMargin = { top: 100, right: 60, bottom: 20, left: 200 };
        const barHeight = height - barMargin.top - barMargin.bottom;

        const maxValue = d3.max(data, d => d.value) || 100;
        const x = d3.scaleLinear()
            .domain([0, maxValue])
            .range([barMargin.left, width - barMargin.right]);

        const y = d3.scaleBand()
            .domain(d3.range(data.length))
            .rangeRound([barMargin.top, height - barMargin.bottom])
            .padding(0.1);

        data.forEach((d, i) => {
            let color = '#00ff88';
            if (wizardData.theme === 'neon') color = `hsl(${i * 30}, 100%, 50%)`;
            if (wizardData.theme === 'v3_dark') color = `hsl(${160 + i * 5}, 60%, 50%)`;

            ctx.fillStyle = color;
            ctx.fillRect(barMargin.left, y(i), x(d.value) - barMargin.left, y.bandwidth());

            ctx.fillStyle = wizardData.theme === 'light' ? '#000' : '#fff';
            ctx.font = "bold 24px Inter, sans-serif";
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            ctx.fillText(d.name, barMargin.left - 10, y(i) + y.bandwidth() / 2);

            ctx.textAlign = "left";
            ctx.fillText(Math.round(d.value), x(d.value) + 10, y(i) + y.bandwidth() / 2);
        });
    };

    const drawLineChart = (ctx) => {
        const data = getHistoryData(year);
        const lineMargin = { top: 100, right: 60, bottom: 60, left: 60 };

        // Global scales based on full dataset max logic to avoid jumping axes?
        // Or dynamic per frame? Dynamic is cooler for "Zoom" effect but harder to read.
        // Let's use dynamic for now.

        // Find max value across all visible history
        const allValues = data.flatMap(p => p.history.map(v => v.value));
        const maxValue = Math.max(...allValues, 10);
        const minYear = wizardData.yearStart;
        const maxYear = wizardData.yearEnd;

        const x = d3.scaleLinear()
            .domain([minYear, maxYear])
            .range([lineMargin.left, width - lineMargin.right]);

        const y = d3.scaleLinear()
            .domain([0, maxValue])
            .range([height - lineMargin.bottom, lineMargin.top]);

        // Draw Axes Lines
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lineMargin.left, height - lineMargin.bottom);
        ctx.lineTo(width - lineMargin.right, height - lineMargin.bottom); // X axis
        ctx.moveTo(lineMargin.left, height - lineMargin.bottom); // Y axis
        ctx.lineTo(lineMargin.left, lineMargin.top);
        ctx.stroke();

        // Draw Player Lines
        data.forEach((player, i) => {
            let color = `hsl(${i * 40}, 70%, 50%)`;
            if (wizardData.theme === 'v3_dark') color = `hsl(${160 + i * 15}, 60%, 50%)`;

            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;

            player.history.forEach((point, idx) => {
                const px = x(point.year);
                const py = y(point.value);
                if (idx === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            });
            ctx.stroke();

            // Draw Dot at current end
            if (player.history.length > 0) {
                const last = player.history[player.history.length - 1];
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x(last.year), y(last.value), 6, 0, Math.PI * 2);
                ctx.fill();

                // Label
                ctx.fillStyle = wizardData.theme === 'light' ? '#000' : '#fff';
                ctx.font = "14px Inter";
                ctx.fillText(`${player.name} (${last.value})`, x(last.year) + 10, y(last.value));
            }
        });
    };

    const drawRadar = (ctx) => {
        const data = getYearlyData(year);
        const radarCenter = { x: width / 2, y: height / 2 + 20 };
        const radius = Math.min(width, height) / 2 - 100;

        // Draw Web
        const levels = 5;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;

        for (let l = 1; l <= levels; l++) {
            ctx.beginPath();
            const r = radius * (l / levels);
            ctx.arc(radarCenter.x, radarCenter.y, r, 0, Math.PI * 2); // Circles for now, simpler than polygons
            ctx.stroke();
        }

        // Draw Axes (one per player?? Or per stat? Assuming per player for Star Plot)
        const angleSlice = (Math.PI * 2) / data.length;

        data.forEach((d, i) => {
            const angle = i * angleSlice - Math.PI / 2;
            const x = radarCenter.x + Math.cos(angle) * radius;
            const y = radarCenter.y + Math.sin(angle) * radius;

            ctx.beginPath();
            ctx.moveTo(radarCenter.x, radarCenter.y);
            ctx.lineTo(x, y);
            ctx.stroke();

            // Label
            ctx.fillStyle = wizardData.theme === 'light' ? '#000' : '#fff';
            ctx.textAlign = "center";
            ctx.font = "16px Inter";
            // Check quadrant for alignment
            ctx.fillText(d.name, x + Math.cos(angle) * 20, y + Math.sin(angle) * 20);
        });

        // Draw Player Value Polygon
        const maxValue = Math.max(...data.map(d => d.value), 10);

        ctx.beginPath();
        ctx.fillStyle = 'rgba(0, 255, 136, 0.3)';
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;

        data.forEach((d, i) => {
            const angle = i * angleSlice - Math.PI / 2;
            const r = (d.value / maxValue) * radius;
            const x = radarCenter.x + Math.cos(angle) * r;
            const y = radarCenter.y + Math.sin(angle) * r;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });

        ctx.closePath();
        ctx.stroke();
        ctx.fill();
    };


    const drawMain = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        clearCanvas(ctx);

        if (wizardData.chartType === 'line_evolution') {
            drawLineChart(ctx);
        } else if (wizardData.chartType === 'radar') {
            drawRadar(ctx);
        } else {
            // Default to Bar Race
            const data = getYearlyData(year);
            drawBarRace(ctx, data);
        }

        if (onDrawComplete) onDrawComplete(canvas);
    };

    useEffect(() => {
        drawMain();
    }, [year, wizardData, width, height]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                aspectRatio: `${width}/${height}`
            }}
        />
    );
};

export default ChartCanvas;
