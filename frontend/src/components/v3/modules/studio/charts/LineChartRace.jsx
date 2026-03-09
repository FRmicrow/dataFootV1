import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';
import * as d3 from 'd3';

const LineChartRace = forwardRef(({ data, width, height, isPlaying, onFrame, onComplete, speed = 1, className = "", title = "Chart Evolution", barCount = 10, isBump = false, leagueLogo = null, manualTime = null }, ref) => {
    const canvasRef = useRef(null);
    useImperativeHandle(ref, () => canvasRef.current);

    const animationRef = useRef(null);
    // Helper to get time key (season or round)
    const getTime = (frame) => frame.season ?? frame.round;

    const timeRef = useRef(getTime(data[0]));
    const yDomainRef = useRef([0, 10]); // Initial domain for smoothing
    const waitProgress = useRef(0); // For 2s pause
    const zoomOutProgress = useRef(0); // Transition to global view


    // Image Cache & Colors
    const imagesRef = useRef({});
    const teamColorsRef = useRef({});
    const leagueLogoRef = useRef({ img: null, loaded: false });
    const [renderCount, setRenderCount] = useState(0);
    const triggerRender = () => setRenderCount(n => n + 1);

    // Layout Config
    const margin = {
        top: height * 0.15,
        right: width * (isBump ? 0.35 : 0.40),
        bottom: height * 0.1,
        left: width * (isBump ? 0.15 : 0.05) // Increase left margin for Bump (Rank # space)
    };

    // Helper: Adjust Color Visibility (avoid black/dark on black bg)
    const adjustColorVisibility = (rgbStr) => {
        if (!rgbStr) return '#ffffff';
        const match = rgbStr.match(/rgb\((\d+),(\d+),(\d+)\)/);
        if (!match) return rgbStr;
        let [, r, g, b] = match.map(Number);

        const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

        if (luminance < 0.3) {
            const factor = 0.3 / (luminance + 0.01);
            r = Math.min(255, Math.floor(r * factor + 50));
            g = Math.min(255, Math.floor(g * factor + 50));
            b = Math.min(255, Math.floor(b * factor + 50));
            return `rgb(${r},${g},${b})`;
        }
        return rgbStr;
    };

    const extractColor = (img) => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1; canvas.height = 1;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, img.width / 2 - 5, img.height / 2 - 5, 10, 10, 0, 0, 1, 1);
            const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
            return `rgb(${r},${g},${b})`;
        } catch (e) { return null; }
    };

    const getInterpolatedPoints = (t, maxTime, historyMap, isRoundData, isBump) => {
        return topPlayers.map(pid => {
            const hist = historyMap.get(pid);
            if (!hist || hist.length === 0) return null;

            const curYear = Math.floor(t);
            const nextYear = Math.min(Math.ceil(t), maxTime);
            const alpha = t - curYear;

            const recA = hist.find(h => h.season === curYear);
            const recB = hist.find(h => h.season === nextYear) || recA;

            if (!recA) return null;

            const valA = (isRoundData && isBump) ? recA.rank : recA.value;
            const valB = (isRoundData && isBump) ? (recB ? recB.rank : valA) : (recB ? recB.value : valA);
            const curVal = valA + (valB - valA) * alpha;

            const pValA = recA.value;
            const pValB = recB ? recB.value : pValA;
            const curValPoints = pValA + (pValB - pValA) * alpha;

            let mainLabel = recA.label;
            let subLabel = isBump ? `${Math.floor(curValPoints)} pts` : recA.subLabel;

            return {
                id: pid,
                label: mainLabel,
                subLabel: subLabel,
                value: curVal,
                rank: recA.rank,
                hist: hist
            };
        }).filter(p => p !== null);
    };

    const resolveLabelCollisions = (points, yScale, minSpacing, zoomProgress, t, maxTime) => {
        let tickPoints = points.map(p => ({ ...p, y: yScale(p.value), initialY: yScale(p.value) }));
        tickPoints.sort((a, b) => a.y - b.y);

        const iterations = (zoomProgress > 0 || t >= maxTime) ? 8 : 2;
        for (let iter = 0; iter < iterations; iter++) {
            for (let i = 1; i < tickPoints.length; i++) {
                const prev = tickPoints[i - 1];
                const curr = tickPoints[i];
                const dist = curr.y - prev.y;
                if (dist < minSpacing) {
                    const overlap = minSpacing - dist;
                    curr.y += overlap / 2;
                    prev.y -= overlap / 2;
                }
            }
        }
        return tickPoints;
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

        // Fix: For Bump Charts (League Rankings), we want ALL teams, not limited by barCount.
        // Or at least a high enough number (e.g. 25).
        const limit = isBump ? 25 : barCount;
        const topIds = new Set(allIds.slice(0, limit));
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
                img.onload = () => {
                    if (imagesRef.current[id]) imagesRef.current[id].loaded = true;
                    triggerRender(); // Force redraw on load
                };
                img.src = url;
            }
            // Ensure team logo is loaded for valid color extraction even if we have player image
            if (team_logo && !teamColorsRef.current[id]) {
                const logoImg = new Image();
                logoImg.crossOrigin = "Anonymous";
                teamColorsRef.current[id] = { color: null, img: logoImg, loaded: false };
                logoImg.onload = () => {
                    const color = extractColor(logoImg);
                    if (teamColorsRef.current[id]) {
                        teamColorsRef.current[id].color = color;
                        teamColorsRef.current[id].loaded = true;
                        triggerRender(); // Force redraw on color ready
                    }
                };
                logoImg.src = team_logo;
            }
        });

        // 3. Preload League Logo
        if (leagueLogo && (!leagueLogoRef.current.img || leagueLogoRef.current.img.src !== leagueLogo)) {
            const lImg = new Image();
            lImg.crossOrigin = "Anonymous";
            leagueLogoRef.current = { img: lImg, loaded: false };
            lImg.onload = () => {
                leagueLogoRef.current.loaded = true;
                triggerRender();
            };
            lImg.src = leagueLogo;
        }

    }, [data, barCount, leagueLogo]);

    // --- Drawing Helpers ---

    const drawBackground = (ctx, t, isRoundData) => {
        const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
        bgGradient.addColorStop(0, '#121216');
        bgGradient.addColorStop(1, '#000000');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);

        const watermarkSize = width / 3;
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.08;
        ctx.font = `bold ${watermarkSize}px 'Inter', sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(isRoundData ? `Day ${Math.floor(t)}` : Math.floor(t), width * 0.95, height * 0.95);
        ctx.restore();
    };

    const drawHeader = (ctx, t, isRoundData, minTime, maxTime) => {
        const headerY = height * 0.06;
        let titleSize = Math.min(width, height) * 0.06;
        ctx.font = `700 ${titleSize}px 'Inter', sans-serif`;
        const titleWidth = ctx.measureText(title).width;
        if (titleWidth > width * 0.9) titleSize *= (width * 0.9 / titleWidth);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = `700 ${titleSize}px 'Inter', sans-serif`;

        if (leagueLogo) {
            const logoSize = titleSize * 1.5;
            const logoX = (width / 2) - (titleWidth / 2) - logoSize - 20;
            const logoY = headerY - (logoSize * 0.7);
            ctx.save();
            ctx.beginPath();
            ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,1)';
            ctx.fill();
            if (leagueLogoRef.current.loaded) ctx.drawImage(leagueLogoRef.current.img, logoX, logoY, logoSize, logoSize);
            ctx.restore();
        }
        ctx.fillText(title, width / 2, headerY);

        ctx.fillStyle = '#aaa';
        ctx.font = `600 ${height * 0.025}px 'Inter', sans-serif`;
        ctx.fillText(isRoundData ? `Matchday ${Math.floor(t)}` : Math.floor(t), width / 2, headerY + (height * 0.035));

        const progress = (t - minTime) / (maxTime - minTime);
        const progressW = width * 0.8;
        const progressX = (width - progressW) / 2;
        const progressY = headerY + (height * 0.05);
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(progressX, progressY, progressW, Math.max(4, height * 0.005));
        ctx.fillStyle = '#4facfe';
        ctx.fillRect(progressX, progressY, progressW * Math.min(1, Math.max(0, progress)), Math.max(4, height * 0.005));
    };

    const drawAxes = (ctx, xScale, yScale, isRoundData, globalMax) => {
        const [dMin, dMax] = yScale.domain();
        let yTicks = isBump ? (globalMax <= 25 ? Array.from({ length: globalMax }, (_, i) => i + 1) : yScale.ticks(10)) : [];
        if (!isBump) {
            for (let v = Math.floor(Math.min(dMin, dMax) / 10) * 10; v <= Math.ceil(Math.max(dMin, dMax) / 10) * 10; v += 10) yTicks.push(v);
        }

        yTicks.forEach(tick => {
            const y = yScale(tick);
            if (y < margin.top - 10 || y > height - margin.bottom + 10) return;
            ctx.beginPath();
            ctx.moveTo(margin.left, y);
            ctx.lineTo(width - margin.right, y);
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${height * 0.022}px Inter`;
            ctx.textAlign = 'right';
            ctx.fillText(tick, margin.left - 15, y + (height * 0.008));
        });

        const [xMin, xMax] = xScale.domain();
        const xTicks = isRoundData ? Array.from({ length: Math.floor((xMax - Math.ceil(xMin / 5) * 5) / 5) + 1 }, (_, i) => Math.ceil(xMin / 5) * 5 + i * 5) : xScale.ticks(5);
        ctx.beginPath();
        xTicks.filter(t => Number.isInteger(t)).forEach(tick => {
            const x = xScale(tick);
            ctx.moveTo(x, height - margin.bottom);
            ctx.lineTo(x, height - margin.bottom + 10);
            ctx.fillStyle = '#fff';
            ctx.font = `600 ${height * 0.018}px Inter`;
            ctx.textAlign = 'center';
            ctx.fillText(tick, x, height - margin.bottom + 25);
        });
        ctx.stroke();
    };

    const drawPlayer = (ctx, p, t, scales, visualY, flags) => {
        const { xScale, yScale } = scales;
        const { isRoundData, isBump } = flags;
        let color = adjustColorVisibility(teamColorsRef.current[p.id]?.color || `hsl(${(p.id * 137.5) % 360}, 70%, 55%)`);
        const tipX = xScale(t);
        const trueTipY = yScale(p.value);

        ctx.save();
        ctx.beginPath();
        ctx.rect(margin.left, margin.top, width - margin.left - margin.right, height - margin.top - margin.bottom);
        ctx.clip();
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = height * 0.003;
        let started = false;
        p.hist.forEach(h => {
            if (h.season > t) return;
            const x = xScale(h.season), y = yScale((isRoundData && isBump) ? h.rank : h.value);
            if (started) {
                ctx.lineTo(x, y);
            } else {
                ctx.moveTo(x, y);
                started = true;
            }
        });
        ctx.lineTo(tipX, trueTipY);
        ctx.stroke();
        ctx.restore();

        if (Math.abs(visualY - trueTipY) > 2) {
            ctx.beginPath(); ctx.moveTo(tipX, trueTipY); ctx.lineTo(tipX + 10, visualY);
            ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();
        }

        const imgSize = height * 0.03;
        const displayX = (Math.abs(visualY - trueTipY) > 2) ? tipX + 10 : tipX;
        ctx.save();
        ctx.beginPath(); ctx.arc(displayX, visualY, imgSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#121212'; ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
        ctx.clip();
        if (imagesRef.current[p.id]?.loaded) ctx.drawImage(imagesRef.current[p.id].img, displayX - imgSize / 2, visualY - imgSize / 2, imgSize, imgSize);
        ctx.restore();

        const baseFontSize = height * 0.018;
        ctx.font = `600 ${baseFontSize}px 'Inter', sans-serif`;
        ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        const displayPoints = isBump ? (p.subLabel || "") : `${Math.floor(p.value)} pts`;
        const textX = displayX + imgSize / 2 + 10;

        if (ctx.measureText(p.label).width < margin.right - (imgSize / 2) - 20) {
            ctx.fillText(p.label, textX, visualY);
            ctx.fillStyle = '#ccc'; ctx.fillText(displayPoints, textX + ctx.measureText(p.label).width + 10, visualY);
        } else {
            ctx.font = `600 ${baseFontSize * 0.8}px 'Inter', sans-serif`;
            ctx.fillText(p.label, textX, visualY - baseFontSize * 0.4);
            ctx.fillStyle = '#ccc'; ctx.fillText(displayPoints, textX, visualY + baseFontSize * 0.5);
        }
    };

    const renderFrame = (ctx, t, data, historyMap, globalMax, minTime, maxTime) => {
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);
        const isRoundData = data[0].round !== undefined;
        drawBackground(ctx, t, isRoundData);
        drawHeader(ctx, t, isRoundData, minTime, maxTime);

        const interpolated = getInterpolatedPoints(t, maxTime, historyMap, isRoundData, isBump);
        interpolated.sort((a, b) => (isRoundData && isBump) ? b.value - a.value : a.value - b.value);

        let yDomain = isBump ? [globalMax, 1] : yDomainRef.current;
        if (!isBump && interpolated.length > 0) {
            let dMin = Math.min(...interpolated.map(p => p.value)), dMax = Math.max(...interpolated.map(p => p.value));
            const tMin = Math.floor(dMin / 10) * 10, tMax = Math.ceil(dMax / 10) * 10 + (dMin === dMax ? 10 : 0);
            yDomainRef.current = [yDomainRef.current[0] + (tMin - yDomainRef.current[0]) * 0.02, yDomainRef.current[1] + (tMax - yDomainRef.current[1]) * 0.02];
            yDomain = yDomainRef.current;
        }

        const yScale = d3.scaleLinear().domain(yDomain).range([height - margin.bottom, margin.top]);
        let xStart = Math.max(minTime, t - 10), xEnd = xStart + 10;
        if (zoomOutProgress.current > 0) {
            const p = Math.min(1, Math.pow(zoomOutProgress.current, 0.5));
            xStart = xStart + (minTime - xStart) * p; xEnd = xEnd + (maxTime - xEnd) * p;
        }
        const xScale = d3.scaleLinear().domain([xStart, xEnd]).range([margin.left, width - margin.right]);

        drawAxes(ctx, xScale, yScale, isRoundData, globalMax);
        const tickPoints = resolveLabelCollisions(interpolated, yScale, height * 0.04, zoomOutProgress.current, t, maxTime);
        const pointMap = new Map(tickPoints.map(p => [p.id, p.y]));

        interpolated.forEach(p => {
            const vY = (zoomOutProgress.current === 0 && t < maxTime) ? yScale(p.value) : pointMap.get(p.id);
            drawPlayer(ctx, p, t, { xScale, yScale }, vY, { isRoundData, isBump });
        });
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

        let lastTimestamp = 0;
        const minTime = getTime(data[0]);
        const maxTime = getTime(data[data.length - 1]);

        const historyMap = new Map();
        if (topPlayers.length > 0) {
            topPlayers.forEach(pid => historyMap.set(pid, []));
            data.forEach(frame => {
                const t = getTime(frame);
                frame.records.forEach(r => {
                    if (historyMap.has(r.id)) {
                        historyMap.get(r.id).push({ season: t, value: r.value, rank: r.rank, ...r });
                    }
                });
            });
        }

        let globalMax = 20;
        if (isBump) {
            topPlayers.forEach(pid => {
                const hist = historyMap.get(pid);
                hist?.forEach(h => { if (h.rank > globalMax) globalMax = h.rank; });
            });
            if (globalMax < 20) globalMax = 20;
        } else {
            topPlayers.forEach(pid => {
                const hist = historyMap.get(pid);
                hist?.forEach(h => { if (h.value > globalMax) globalMax = h.value; });
            });
            globalMax *= 1.1;
        }

        const updateSimulationTime = (deltaTime) => {
            if (manualTime !== null) {
                timeRef.current = manualTime;
                if (manualTime > maxTime) {
                    const extra = manualTime - maxTime;
                    if (extra < 2) {
                        waitProgress.current = extra * 1000;
                    } else {
                        waitProgress.current = 2000;
                        zoomOutProgress.current = (extra - 2) / 2;
                    }
                }
                return;
            }

            if (!isPlaying) return;

            if (timeRef.current < maxTime) {
                const duration = 2000 / speed;
                timeRef.current += (deltaTime / duration);
                if (timeRef.current > maxTime) timeRef.current = maxTime;
            } else if (waitProgress.current < 2000) {
                waitProgress.current += deltaTime;
            } else {
                zoomOutProgress.current += (deltaTime / 2000);
                if (zoomOutProgress.current > 1) {
                    zoomOutProgress.current = 1;
                    if (onComplete) onComplete();
                }
            }
        };

        const draw = (timestamp) => {
            if (!lastTimestamp) lastTimestamp = timestamp;
            const deltaTime = timestamp - lastTimestamp;
            lastTimestamp = timestamp;

            updateSimulationTime(deltaTime);

            renderFrame(context, timeRef.current, data, historyMap, globalMax, minTime, maxTime);
            if (isPlaying && zoomOutProgress.current < 1.05) {
                animationRef.current = requestAnimationFrame(draw);
            }
        };

        if (isPlaying && manualTime === null) animationRef.current = requestAnimationFrame(draw);
        else renderFrame(context, timeRef.current, data, historyMap, globalMax, minTime, maxTime);

        return () => cancelAnimationFrame(animationRef.current);
    }, [data, width, height, isPlaying, speed, topPlayers, manualTime]);

    return (
        <canvas
            ref={canvasRef}
            className={className}
            role="img"
            aria-label={`Line chart race: ${title}`}
            tabIndex={0}
        />
    );
});

LineChartRace.propTypes = {
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
    isBump: PropTypes.bool,
    leagueLogo: PropTypes.string,
    manualTime: PropTypes.number
};


export default LineChartRace;
