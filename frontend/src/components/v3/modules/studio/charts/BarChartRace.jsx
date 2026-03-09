import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import PropTypes from 'prop-types';

const BarChartRace = React.forwardRef(({ data, width, height, isPlaying, onFrame, onComplete, speed = 1, className = "", title = "Chart Evolution", barCount = 10, manualTime = null }, ref) => {
    const internalCanvasRef = useRef(null);
    const canvasRef = ref || internalCanvasRef;
    const animationRef = useRef(null);
    // Helper to get time key (season or round)
    const getTime = (frame) => frame.season !== undefined ? frame.season : frame.round;

    const timeRef = useRef(getTime(data[0]));

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

    // --- Drawing Helpers ---

    const drawBackground = (ctx, t, isRoundData) => {
        const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
        bgGradient.addColorStop(0, '#121216');
        bgGradient.addColorStop(1, '#000000');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.08;
        const watermarkSize = width / 3;
        ctx.font = `bold ${watermarkSize}px 'Inter', sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(isRoundData ? `Day ${Math.floor(t)}` : Math.floor(t), width * 0.95, height * 0.95);
        ctx.restore();
    };

    const drawHeader = (ctx, t, isRoundData) => {
        const headerY = height * 0.06;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        let titleSize = Math.min(width, height) * 0.06;
        ctx.font = `700 ${titleSize}px 'Inter', sans-serif`;
        const titleWidth = ctx.measureText(title).width;
        if (titleWidth > width * 0.9) titleSize *= (width * 0.9 / titleWidth);
        ctx.font = `700 ${titleSize}px 'Inter', sans-serif`;
        ctx.fillText(title, width / 2, headerY);

        ctx.fillStyle = '#aaa';
        ctx.font = `600 ${height * 0.025}px 'Inter', sans-serif`;
        ctx.fillText(isRoundData ? `Matchday ${Math.floor(t)}` : Math.floor(t), width / 2, headerY + (height * 0.035));
    };

    const drawAxes = (ctx, xScale) => {
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        xScale.ticks(5).forEach(tick => {
            const x = margin.left + xScale(tick);
            ctx.moveTo(x, margin.top);
            ctx.lineTo(x, height - margin.bottom);
            ctx.fillStyle = '#888';
            ctx.font = `600 ${height * 0.018}px Inter`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(tick, x, margin.top - (height * 0.01));
        });
        ctx.stroke();
    };

    const drawBar = (ctx, p, xScale, yScale) => {
        const barY = yScale(p.rank), barW = Math.max(0, xScale(p.value));
        if (barY > height + 100 || barY < -100) return;

        const teamData = teamColorsRef.current[p.id];
        const color = (teamData && teamData.color) ? teamData.color : `hsl(${(p.id * 137.5) % 360}, 75%, 50%)`;
        ctx.fillStyle = color;

        const radius = barHeight / 2;
        ctx.beginPath();
        ctx.roundRect(margin.left, barY - barHeight / 2, Math.max(barW, radius * 2), barHeight, radius);
        ctx.save();
        ctx.shadowColor = color.replace('rgb', 'rgba').replace(')', ', 0.5)');
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();

        const imgSize = barHeight * 1.2, avatarX = margin.left - imgSize - (width * 0.02), avatarY = barY - imgSize / 2;
        ctx.save();
        ctx.beginPath(); ctx.arc(avatarX + imgSize / 2, avatarY + imgSize / 2, imgSize / 2, 0, Math.PI * 2);
        ctx.clip();
        if (imagesRef.current[p.id]?.loaded) ctx.drawImage(imagesRef.current[p.id].img, avatarX, avatarY, imgSize, imgSize);
        else { ctx.fillStyle = '#222'; ctx.fillRect(avatarX, avatarY, imgSize, imgSize); }
        ctx.restore();

        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        const maxNameWidth = margin.left - imgSize - (width * 0.05), baseFontSize = barHeight * 0.6;
        ctx.font = `600 ${baseFontSize}px 'Inter', sans-serif`;
        const nameWidth = ctx.measureText(p.label).width;
        let usedLines = 1;
        ctx.fillStyle = '#eee';
        if (nameWidth < maxNameWidth) {
            ctx.fillText(p.label, avatarX - 10, barY - (barHeight * 0.15));
        } else {
            usedLines = 2;
            ctx.font = `600 ${baseFontSize * 0.8}px 'Inter', sans-serif`;
            const words = p.label.split(' ');
            let line1 = words[0], line2 = words.slice(1).join(' ');
            if (words.length > 2) { const mid = Math.ceil(words.length / 2); line1 = words.slice(0, mid).join(' '); line2 = words.slice(mid).join(' '); }
            ctx.fillText(line1, avatarX - 10, barY - (barHeight * 0.4));
            ctx.fillText(line2, avatarX - 10, barY);
        }

        const teamY = usedLines === 1 ? barY + (barHeight * 0.4) : barY + (barHeight * 0.45);
        ctx.fillStyle = '#aaa'; ctx.font = `400 ${barHeight * 0.4}px 'Inter', sans-serif`;
        ctx.fillText(p.subLabel || '', avatarX - 10, teamY);

        if (teamData?.loaded && teamData.img) {
            const logoSize = barHeight * 0.45;
            ctx.drawImage(teamData.img, avatarX - 10 - ctx.measureText(p.subLabel || '').width - (barHeight * 0.2) - logoSize, teamY - (logoSize / 2), logoSize, logoSize);
        }

        ctx.fillStyle = '#fff'; ctx.font = `bold ${barHeight * 0.65}px 'Inter', sans-serif`; ctx.textAlign = 'left';
        ctx.fillText(Math.floor(p.value).toLocaleString(), margin.left + barW + 15, barY);
    };

    const getInterpolatedData = (t, ease) => {
        const lastTime = getTime(data[data.length - 1]);
        const currentYear = Math.floor(t);
        const nextYear = Math.min(Math.ceil(t), lastTime);
        const alpha = ease(t - currentYear);

        const frameA = data.find(f => getTime(f) === currentYear) || data[0];
        const frameB = data.find(f => getTime(f) === nextYear) || frameA;

        const playerMap = new Map();
        [{ f: frameA, start: true }, { f: frameB, start: false }].forEach(({ f, start }) => {
            f.records.forEach(rec => {
                if (!playerMap.has(rec.id)) {
                    playerMap.set(rec.id, { ...rec, valA: 0, valB: 0, rankA: barCount + 2, rankB: barCount + 2 });
                }
                const p = playerMap.get(rec.id);
                if (start) { p.valA = rec.value; p.rankA = rec.rank; }
                else { p.valB = rec.value; p.rankB = rec.rank; }
            });
        });

        return Array.from(playerMap.values()).map(p => ({
            ...p,
            value: p.valA + (p.valB - p.valA) * alpha,
            rank: p.rankA + (p.rankB - p.rankA) * alpha,
        })).filter(p => p.rank <= barCount + 1).sort((a, b) => a.rank - b.rank);
    };

    const renderFrame = (ctx, t, ease) => {
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);
        const isRoundData = data[0].round !== undefined;
        drawBackground(ctx, t, isRoundData);
        drawHeader(ctx, t, isRoundData);

        const visible = getInterpolatedData(t, ease || d3.easeCubicInOut);
        const maxValue = d3.max(visible, d => d.value) || 100;
        const xScale = d3.scaleLinear().domain([0, maxValue]).range([0, chartWidth]);
        const yScale = d3.scaleLinear().domain([1, barCount]).range([margin.top + barHeight, height - margin.bottom]);

        drawAxes(ctx, xScale);
        visible.forEach(p => drawBar(ctx, p, xScale, yScale));
    };

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

            const lastTime = getTime(data[data.length - 1]);

            if (isPlaying && manualTime === null) {
                const duration = 2000 / speed;
                timeRef.current += (deltaTime / duration);
            } else if (manualTime !== null) {
                timeRef.current = manualTime;
            }

            if (timeRef.current >= lastTime) {
                timeRef.current = lastTime;
                if (isPlaying && onComplete) {
                    onComplete();
                    return;
                }
            }

            renderFrame(context, timeRef.current, ease);
            if (isPlaying) {
                animationRef.current = requestAnimationFrame(draw);
            }
        };

        if (isPlaying && manualTime === null) animationRef.current = requestAnimationFrame(draw);
        else renderFrame(context, timeRef.current, ease);

        return () => cancelAnimationFrame(animationRef.current);
    }, [data, width, height, isPlaying, speed, title, manualTime]);

    return <canvas ref={canvasRef} className={`d3-canvas ${className}`} />;
});

BarChartRace.displayName = 'BarChartRace';

BarChartRace.propTypes = {
    data: PropTypes.arrayOf(PropTypes.shape({
        round: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        season: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        records: PropTypes.arrayOf(PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
            label: PropTypes.string.isRequired,
            value: PropTypes.number.isRequired,
            image: PropTypes.string,
            team_logo: PropTypes.string,
            subLabel: PropTypes.string,
            rank: PropTypes.number,
        })).isRequired
    })).isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    isPlaying: PropTypes.bool.isRequired,
    onFrame: PropTypes.func,
    onComplete: PropTypes.func,
    speed: PropTypes.number,
    className: PropTypes.string,
    title: PropTypes.string,
    barCount: PropTypes.number,
    manualTime: PropTypes.number,
};

export default BarChartRace;
