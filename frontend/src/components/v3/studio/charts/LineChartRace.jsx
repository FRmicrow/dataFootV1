import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

const LineChartRace = ({ data, width, height, isPlaying, onFrame, onComplete, speed = 1, className = "", title = "Chart Evolution", barCount = 10 }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const timeRef = useRef(data[0].season);

    // Image Cache & Colors
    const imagesRef = useRef({});
    const teamColorsRef = useRef({});

    // Layout Config
    const isVertical = height > width;
    const margin = {
        top: height * 0.15,
        right: isVertical ? width * 0.2 : width * 0.15,
        bottom: height * 0.1,
        left: width * 0.08
    };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Helper: Extract Color
    const extractColor = (img) => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, img.width / 2 - 5, img.height / 2 - 5, 10, 10, 0, 0, 1, 1);
            const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
            return `rgb(${r},${g},${b})`;
        } catch (e) { return null; }
    };

    // Preload & Identify Top Players
    const [topPlayers, setTopPlayers] = useState([]);

    useEffect(() => {
        if (!data || data.length === 0) return;

        // 1. Identify Top N Players (Global)
        const playerMaxVals = new Map();
        data.forEach(frame => {
            frame.records.forEach(r => {
                const cur = playerMaxVals.get(r.id) || 0;
                if (r.value > cur) playerMaxVals.set(r.id, r.value);
            });
        });

        // Sort by max value
        const allIds = Array.from(playerMaxVals.keys()).sort((a, b) => playerMaxVals.get(b) - playerMaxVals.get(a));
        const topIds = new Set(allIds.slice(0, barCount));
        setTopPlayers(Array.from(topIds));

        // 2. Preload Images
        const uniquePlayers = new Set();
        data.forEach(frame => {
            frame.records.forEach(r => {
                if (topIds.has(r.id)) {
                    uniquePlayers.add(JSON.stringify({ id: r.id, url: r.image, team_logo: r.team_logo }));
                }
            });
        });

        uniquePlayers.forEach(json => {
            const { id, url, team_logo } = JSON.parse(json);
            if (url && !imagesRef.current[id]) {
                const img = new Image();
                img.crossOrigin = "Anonymous";
                imagesRef.current[id] = { img, loaded: false };
                img.onload = () => { if (imagesRef.current[id]) imagesRef.current[id].loaded = true; };
                img.src = url;
            }
            if (team_logo && !teamColorsRef.current[id]) {
                const logoImg = new Image();
                logoImg.crossOrigin = "Anonymous";
                teamColorsRef.current[id] = { color: null, img: logoImg, loaded: false };
                logoImg.onload = () => {
                    const color = extractColor(logoImg);
                    if (teamColorsRef.current[id]) {
                        teamColorsRef.current[id].color = color;
                        teamColorsRef.current[id].loaded = true;
                    }
                };
                logoImg.src = team_logo;
            }
        });

    }, [data, barCount]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        context.scale(dpr, dpr);
        canvas.style.width = '100%';
        canvas.style.height = '100%';

        let lastTimestamp = 0;
        const minYear = data[0].season;
        const maxYear = data[data.length - 1].season;

        // Build Full History Map
        const historyMap = new Map();
        if (topPlayers.length > 0) {
            topPlayers.forEach(pid => historyMap.set(pid, []));
            data.forEach(frame => {
                frame.records.forEach(r => {
                    if (historyMap.has(r.id)) {
                        historyMap.get(r.id).push({ season: frame.season, value: r.value, ...r });
                    }
                });
            });
        }

        // Calculate Global Max ONCE
        let globalMax = 10;
        topPlayers.forEach(pid => {
            const hist = historyMap.get(pid);
            if (hist) {
                hist.forEach(h => {
                    if (h.value > globalMax) globalMax = h.value;
                });
            }
        });
        globalMax *= 1.1; // 10% buffer

        const draw = (timestamp) => {
            if (!lastTimestamp) lastTimestamp = timestamp;
            const deltaTime = timestamp - lastTimestamp;
            lastTimestamp = timestamp;

            if (isPlaying) {
                const duration = 2000 / speed;
                timeRef.current += (deltaTime / duration);
            }

            if (timeRef.current >= maxYear) {
                timeRef.current = maxYear;
                if (isPlaying && onComplete) onComplete();
            }

            renderFrame(timeRef.current);

            if (isPlaying) {
                animationRef.current = requestAnimationFrame(draw);
            }
        };

        const renderFrame = (t) => {
            context.clearRect(0, 0, width, height);

            // Background
            const bgGradient = context.createLinearGradient(0, 0, 0, height);
            bgGradient.addColorStop(0, '#121216');
            bgGradient.addColorStop(1, '#000000');
            context.fillStyle = bgGradient;
            context.fillRect(0, 0, width, height);

            // Watermark
            const watermarkSize = width / 3;
            context.save();
            context.fillStyle = '#ffffff';
            context.globalAlpha = 0.08;
            context.font = `bold ${watermarkSize}px 'Inter', sans-serif`;
            context.textAlign = 'right';
            context.textBaseline = 'bottom';
            context.fillText(Math.floor(t), width - width * 0.05, height - height * 0.05);
            context.restore();

            // Header
            const headerY = height * 0.06;
            let titleSize = Math.min(width, height) * 0.06;
            context.font = `700 ${titleSize}px 'Inter', sans-serif`;
            const titleWidth = context.measureText(title).width;
            if (titleWidth > width * 0.9) titleSize *= (width * 0.9 / titleWidth);
            context.fillStyle = '#fff';
            context.textAlign = 'center';
            context.font = `700 ${titleSize}px 'Inter', sans-serif`;
            context.fillText(title, width / 2, headerY);

            // Sub-header Year
            context.fillStyle = '#aaa';
            context.font = `600 ${height * 0.025}px 'Inter', sans-serif`;
            context.fillText(Math.floor(t), width / 2, headerY + (height * 0.035));

            // Progress Bar
            const progress = (t - minYear) / (maxYear - minYear);
            const progressW = width * 0.8;
            const progressX = (width - progressW) / 2;
            const progressY = headerY + (height * 0.05);
            const barThick = Math.max(4, height * 0.005);
            context.fillStyle = 'rgba(255,255,255,0.1)';
            context.fillRect(progressX, progressY, progressW, barThick);
            context.fillStyle = '#4facfe';
            context.fillRect(progressX, progressY, progressW * Math.min(1, Math.max(0, progress)), barThick);

            // 1. Calculate interpolated values first
            const currentPoints = topPlayers.map(pid => {
                const hist = historyMap.get(pid);
                if (!hist || hist.length === 0) return null;

                const curYear = Math.floor(t);
                const nextYear = Math.min(Math.ceil(t), maxYear);
                const alpha = t - curYear;

                const recA = hist.find(h => h.season === curYear);
                const recB = hist.find(h => h.season === nextYear) || recA;

                if (!recA) return null;

                const valA = recA.value;
                const valB = recB ? recB.value : valA;
                const curVal = valA + (valB - valA) * alpha;

                return {
                    id: pid,
                    label: recA.label,
                    subLabel: recA.subLabel,
                    value: curVal,
                    hist: hist,
                };
            }).filter(p => p !== null).sort((a, b) => a.value - b.value);

            // 2. Setup Y-Scale with Dynamic Floor
            let domainMin = 0;
            if (currentPoints.length > 0) {
                const currentMin = currentPoints[0].value;
                if (currentMin > 0) {
                    domainMin = currentMin * 0.8; // Optimize lower level with buffer
                }
            }

            const yScale = d3.scaleLinear()
                .domain([domainMin, globalMax])
                .range([height - margin.bottom, margin.top]);

            // Scales
            const xScale = d3.scaleLinear()
                .domain([minYear, maxYear])
                .range([margin.left, width - margin.right]);

            // Draw Grid (Y Axis lines)
            context.strokeStyle = 'rgba(255,255,255,0.1)';
            context.lineWidth = 1;
            context.beginPath();
            yScale.ticks(5).forEach(tick => {
                const y = yScale(tick);
                context.moveTo(margin.left, y);
                context.lineTo(width - margin.right, y);

                context.fillStyle = '#666';
                context.font = `${height * 0.015}px Inter`;
                context.textAlign = 'right';
                context.fillText(tick, margin.left - 10, y + 5);
            });
            context.stroke();

            // Draw X Axis Labels (Years)
            context.beginPath();
            xScale.ticks(5).forEach(tick => {
                const x = xScale(tick);
                context.moveTo(x, height - margin.bottom);
                context.lineTo(x, height - margin.bottom + 10);
                context.fillStyle = '#888';
                context.textAlign = 'center';
                context.fillText(tick, x, height - margin.bottom + 25);
            });
            context.stroke();

            if (topPlayers.length === 0) return;

            // Draw Lines & Avatars
            currentPoints.forEach(p => {
                const teamData = teamColorsRef.current[p.id];
                const color = teamData?.color || `hsl(${(p.id * 137.5) % 360}, 70%, 55%)`;

                const tipX = xScale(t);
                const tipY = yScale(p.value);

                // 1. Draw Line (Clipped)
                context.save();
                context.beginPath();
                // Clip to chart area to hide lines below floor
                context.rect(margin.left, margin.top, width - margin.left - margin.right, height - margin.top - margin.bottom);
                context.clip();

                context.beginPath();
                context.strokeStyle = color;
                context.lineWidth = height * 0.003;
                context.lineJoin = 'round';
                context.lineCap = 'round';

                let started = false;
                p.hist.forEach(h => {
                    if (h.season > t) return;
                    const x = xScale(h.season);
                    const y = yScale(h.value);
                    if (!started) { context.moveTo(x, y); started = true; }
                    else context.lineTo(x, y);
                });

                // Connect to current tip
                context.lineTo(tipX, tipY);
                context.stroke();
                context.restore(); // Stop clipping

                // 2. Draw Tip Avatar & Label (No Clip)
                const imgSize = height * 0.03;

                // Avatar Circle
                context.save();
                context.beginPath();
                context.arc(tipX, tipY, imgSize / 2, 0, Math.PI * 2);
                context.fillStyle = '#000';
                context.fill();
                context.strokeStyle = color;
                context.lineWidth = 2;
                context.stroke();
                context.clip(); // Clip image inside circle

                const imgObj = imagesRef.current[p.id];
                if (imgObj && imgObj.loaded) {
                    context.drawImage(imgObj.img, tipX - imgSize / 2, tipY - imgSize / 2, imgSize, imgSize);
                }
                context.restore();

                // Draw Label
                const baseFontSize = height * 0.018;
                context.font = `600 ${baseFontSize}px 'Inter', sans-serif`;
                context.fillStyle = '#fff';
                context.textAlign = 'left';
                context.textBaseline = 'middle';

                // Max width for text
                const maxLabelWidth = margin.right - (imgSize / 2) - 20;
                const nameWidth = context.measureText(p.label).width;
                const textX = tipX + imgSize / 2 + 10;

                if (nameWidth < maxLabelWidth) {
                    // 1 Line
                    context.fillText(p.label, textX, tipY);
                } else {
                    // 2 Lines
                    const smallerFont = baseFontSize * 0.8;
                    context.font = `600 ${smallerFont}px 'Inter', sans-serif`;

                    const words = p.label.split(' ');
                    let line1 = words[0];
                    let line2 = words.slice(1).join(' ');
                    if (words.length > 2) {
                        const mid = Math.ceil(words.length / 2);
                        line1 = words.slice(0, mid).join(' ');
                        line2 = words.slice(mid).join(' ');
                    }

                    const offset = smallerFont * 0.6;
                    context.fillText(line1, textX, tipY - offset);
                    context.fillText(line2, textX, tipY + offset + 2);
                }
            });

        };

        if (isPlaying) {
            animationRef.current = requestAnimationFrame(draw);
        } else {
            draw(performance.now());
        }

        return () => cancelAnimationFrame(animationRef.current);
    }, [data, width, height, isPlaying, speed, topPlayers]);

    return <canvas ref={canvasRef} className={className} />;
};

export default LineChartRace;
