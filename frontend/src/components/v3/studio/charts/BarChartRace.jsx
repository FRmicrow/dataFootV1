import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const BarChartRace = React.forwardRef(({ data, width, height, isPlaying, onFrame, onComplete, speed = 1, className = "", title = "Chart Evolution", barCount = 10 }, ref) => {
    const internalCanvasRef = useRef(null);
    const canvasRef = ref || internalCanvasRef;
    const animationRef = useRef(null);
    const timeRef = useRef(data[0].season);

    // Image Cache & Colors
    const imagesRef = useRef({});
    const teamColorsRef = useRef({});

    // Layout Config
    const margin = { top: height * 0.20, right: width * 0.08, bottom: height * 0.05, left: width * 0.25 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const barHeight = chartHeight / (barCount * 1.5);

    // Helper: Extract Color from Image
    const extractColor = (img) => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, img.width / 2 - 5, img.height / 2 - 5, 10, 10, 0, 0, 1, 1);
            const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
            return `rgb(${r},${g},${b})`;
        } catch (e) {
            return null;
        }
    };

    // Preload Images & Colors Effect
    useEffect(() => {
        data.forEach(frame => {
            frame.records.forEach(r => {
                const id = r.id;
                if (r.image && !imagesRef.current[id]) {
                    const img = new Image();
                    img.crossOrigin = "Anonymous";
                    imagesRef.current[id] = { img, loaded: false };
                    img.onload = () => { if (imagesRef.current[id]) imagesRef.current[id].loaded = true; };
                    img.src = r.image;
                }
                if (r.team_logo && !teamColorsRef.current[id]) {
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
                    logoImg.src = r.team_logo;
                }
            });
        });
    }, [data]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        context.scale(dpr, dpr);
        canvas.style.width = '100%';
        canvas.style.height = '100%';

        const ease = d3.easeCubicInOut;
        let lastTimestamp = 0;

        const draw = (timestamp) => {
            if (!lastTimestamp) lastTimestamp = timestamp;
            const deltaTime = timestamp - lastTimestamp;
            lastTimestamp = timestamp;

            if (isPlaying) {
                const duration = 2000 / speed;
                timeRef.current += (deltaTime / duration);
            }

            if (timeRef.current >= data[data.length - 1].season) {
                timeRef.current = data[data.length - 1].season;
                if (isPlaying && onComplete) {
                    onComplete();
                    return; // Stop loop
                }
            }

            renderFrame(timeRef.current);
            if (isPlaying) {
                animationRef.current = requestAnimationFrame(draw);
            }
        };

        const renderFrame = (t) => {
            context.clearRect(0, 0, width, height);

            const bgGradient = context.createLinearGradient(0, 0, 0, height);
            bgGradient.addColorStop(0, '#121216');
            bgGradient.addColorStop(1, '#000000');
            context.fillStyle = bgGradient;
            context.fillRect(0, 0, width, height);

            const currentYear = Math.floor(t);
            const nextYear = Math.min(Math.ceil(t), data[data.length - 1].season);
            const alpha = t - currentYear;
            const easeAlpha = ease(alpha);

            const frameA = data.find(f => f.season === currentYear);
            const frameB = data.find(f => f.season === nextYear) || frameA;

            const playerMap = new Map();
            const addPlayer = (rec, isStart) => {
                if (!playerMap.has(rec.id)) {
                    playerMap.set(rec.id, {
                        ...rec,
                        valA: 0, valB: 0,
                        rankA: barCount + 2, rankB: barCount + 2
                    });
                }
                const p = playerMap.get(rec.id);
                if (isStart) { p.valA = rec.value; p.rankA = rec.rank; }
                else { p.valB = rec.value; p.rankB = rec.rank; }
            };

            frameA.records.forEach(r => addPlayer(r, true));
            frameB.records.forEach(r => addPlayer(r, false));

            const interpolated = Array.from(playerMap.values()).map(p => ({
                ...p,
                value: p.valA + (p.valB - p.valA) * easeAlpha,
                rank: p.rankA + (p.rankB - p.rankA) * easeAlpha,
            }));

            const visible = interpolated.filter(p => p.rank <= barCount + 1).sort((a, b) => a.rank - b.rank);

            context.save();
            context.fillStyle = '#ffffff';
            context.globalAlpha = 0.08;
            const watermarkSize = width / 3;
            context.font = `bold ${watermarkSize}px 'Inter', sans-serif`;
            context.textAlign = 'right';
            context.textBaseline = 'bottom';
            context.fillText(Math.floor(t), width - width * 0.05, height - height * 0.05);
            context.restore();

            const headerY = height * 0.06;
            context.fillStyle = '#fff';
            context.textAlign = 'center';
            let titleSize = Math.min(width, height) * 0.06;
            context.font = `700 ${titleSize}px 'Inter', sans-serif`;
            const titleWidth = context.measureText(title).width;
            const maxTitleWidth = width * 0.9;
            if (titleWidth > maxTitleWidth) titleSize = titleSize * (maxTitleWidth / titleWidth);
            context.font = `700 ${titleSize}px 'Inter', sans-serif`;
            context.fillText(title, width / 2, headerY);

            context.fillStyle = '#aaa';
            context.font = `600 ${height * 0.025}px 'Inter', sans-serif`;
            context.fillText(Math.floor(t), width / 2, headerY + (height * 0.035));

            const maxValue = d3.max(visible, d => d.value) || 100;
            const xScale = d3.scaleLinear().domain([0, maxValue]).range([0, chartWidth]);
            const yScale = d3.scaleLinear().domain([1, barCount]).range([margin.top + barHeight, height - margin.bottom]);

            context.strokeStyle = 'rgba(255,255,255,0.05)';
            context.lineWidth = 2;
            context.beginPath();
            xScale.ticks(5).forEach(tick => {
                const x = margin.left + xScale(tick);
                context.moveTo(x, margin.top);
                context.lineTo(x, height - margin.bottom);
                context.fillStyle = '#888';
                context.font = `600 ${height * 0.018}px Inter`;
                context.textAlign = 'center';
                context.textBaseline = 'bottom';
                context.fillText(tick, x, margin.top - (height * 0.01));
            });
            context.stroke();

            visible.forEach(p => {
                const barY = yScale(p.rank);
                const barW = Math.max(0, xScale(p.value));
                if (barY > height + 100 || barY < -100) return;

                let teamData = teamColorsRef.current[p.id];
                let color = teamData?.color || `hsl(${(p.id * 137.5) % 360}, 70%, 55%)`;
                context.fillStyle = color;

                const radius = barHeight / 2;
                context.beginPath();
                context.roundRect(margin.left, barY - barHeight / 2, Math.max(barW, radius * 2), barHeight, radius);
                context.shadowColor = `${color.replace('rgb', 'rgba').replace(')', ', 0.5)')}`;
                context.shadowBlur = 10;
                context.fill();
                context.shadowBlur = 0;

                const imgSize = barHeight * 1.2;
                const avatarX = margin.left - imgSize - (width * 0.02);
                const avatarY = barY - imgSize / 2;

                context.save();
                context.beginPath();
                context.arc(avatarX + imgSize / 2, avatarY + imgSize / 2, imgSize / 2, 0, Math.PI * 2);
                context.clip();
                const imgObj = imagesRef.current[p.id];
                if (imgObj && imgObj.loaded) context.drawImage(imgObj.img, avatarX, avatarY, imgSize, imgSize);
                else { context.fillStyle = '#222'; context.fillRect(avatarX, avatarY, imgSize, imgSize); }
                context.restore();

                context.textAlign = 'right';
                context.textBaseline = 'middle';
                const maxNameWidth = margin.left - imgSize - (width * 0.05);
                const baseFontSize = barHeight * 0.6;
                context.font = `600 ${baseFontSize}px 'Inter', sans-serif`;
                const nameWidth = context.measureText(p.label).width;
                let usedLines = 1;
                context.fillStyle = '#eee';
                if (nameWidth < maxNameWidth) {
                    context.fillText(p.label, avatarX - 10, barY - (barHeight * 0.15));
                } else {
                    usedLines = 2;
                    const smallerFont = baseFontSize * 0.8;
                    context.font = `600 ${smallerFont}px 'Inter', sans-serif`;
                    const words = p.label.split(' ');
                    let line1 = words[0], line2 = words.slice(1).join(' ');
                    if (words.length > 2) {
                        const mid = Math.ceil(words.length / 2);
                        line1 = words.slice(0, mid).join(' ');
                        line2 = words.slice(mid).join(' ');
                    }
                    context.fillText(line1, avatarX - 10, barY - (barHeight * 0.4));
                    context.fillText(line2, avatarX - 10, barY);
                }

                const teamY = usedLines === 1 ? barY + (barHeight * 0.4) : barY + (barHeight * 0.45);
                context.fillStyle = '#aaa';
                context.font = `400 ${barHeight * 0.4}px 'Inter', sans-serif`;
                context.fillText(p.subLabel || '', avatarX - 10, teamY);

                if (teamData && teamData.loaded && teamData.img) {
                    const teamTextWidth = context.measureText(p.subLabel || '').width;
                    const logoSize = barHeight * 0.45;
                    const logoX = avatarX - 10 - teamTextWidth - (barHeight * 0.2) - logoSize;
                    const logoY = teamY - (logoSize / 2);
                    context.drawImage(teamData.img, logoX, logoY, logoSize, logoSize);
                }

                context.fillStyle = '#fff';
                context.font = `bold ${barHeight * 0.65}px 'Inter', sans-serif`;
                context.textAlign = 'left';
                context.fillText(Math.floor(p.value).toLocaleString(), margin.left + barW + 15, barY);
            });
        };

        if (isPlaying) animationRef.current = requestAnimationFrame(draw);
        else renderFrame(timeRef.current);

        return () => cancelAnimationFrame(animationRef.current);
    }, [data, width, height, isPlaying, speed, title]);

    return <canvas ref={canvasRef} className={`d3-canvas ${className}`} />;
});

export default BarChartRace;
