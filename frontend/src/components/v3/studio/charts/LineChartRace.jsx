import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import * as d3 from 'd3';

const LineChartRace = forwardRef(({ data, width, height, isPlaying, onFrame, onComplete, speed = 1, className = "", title = "Chart Evolution", barCount = 10, isBump = false, leagueLogo = null }, ref) => {
    const canvasRef = useRef(null);
    useImperativeHandle(ref, () => canvasRef.current);

    const animationRef = useRef(null);
    // Helper to get time key (season or round)
    // Helper to get time key (season or round)
    const getTime = (frame) => frame.season !== undefined ? frame.season : frame.round;

    const timeRef = useRef(getTime(data[0]));
    const yDomainRef = useRef([0, 10]); // Initial domain for smoothing
    const zoomOutProgress = useRef(0);
    const waitProgress = useRef(0); // For 2s pause
    const [isFinished, setIsFinished] = useState(false); // To trigger final render state if needed

    // Layout Config
    const isVertical = height > width;

    // Image Cache & Colors
    const imagesRef = useRef({});
    const teamColorsRef = useRef({});
    const leagueLogoRef = useRef({ img: null, loaded: false });
    const [, forceRender] = useState(0);
    const triggerRender = () => forceRender(n => n + 1);

    // Layout Config
    // Layout Config
    const margin = {
        top: height * 0.15,
        right: width * 0.40, // Increased to 40% for long names + points
        bottom: height * 0.1,
        left: width * 0.05
    };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Helper: Adjust Color Visibility (avoid black/dark on black bg)
    const adjustColorVisibility = (rgbStr) => {
        if (!rgbStr) return '#ffffff';
        const match = rgbStr.match(/rgb\((\d+),(\d+),(\d+)\)/);
        if (!match) return rgbStr;
        let [_, r, g, b] = match.map(Number);

        // Calculate relative luminance
        // Y = 0.2126*R + 0.7152*G + 0.0722*B
        const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

        if (luminance < 0.3) {
            // Too dark, lighten it significantly
            // Simple approach: Boost brightness
            const factor = 0.3 / (luminance + 0.01);
            r = Math.min(255, Math.floor(r * factor + 50));
            g = Math.min(255, Math.floor(g * factor + 50));
            b = Math.min(255, Math.floor(b * factor + 50));
            return `rgb(${r},${g},${b})`;
        }
        return rgbStr;
    };

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
                // For bump chart (rank), usually we want to track who was ever in top N?
                // Let's stick to value heuristic or rank heuristic.
                // If it's rank data, maybe we want teams that spent time in top N?
                // For simplicty, let's use peak value (points) or peak rank?
                // Using value is safer for now.
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
        const minTime = getTime(data[0]);
        const maxTime = getTime(data[data.length - 1]);

        // Build Full History Map
        const historyMap = new Map();
        if (topPlayers.length > 0) {
            topPlayers.forEach(pid => historyMap.set(pid, []));
            data.forEach(frame => {
                const t = getTime(frame);
                frame.records.forEach(r => {
                    if (historyMap.has(r.id)) {
                        historyMap.get(r.id).push({
                            season: t,
                            value: r.value, // Points
                            rank: r.rank,   // Rank
                            ...r
                        });
                    }
                });
            });
        }

        // Calculate Global Max/Min
        // If Round Data: Min=1, Max=NumTeams (e.g. 20)
        // If Points Data: Min=0, Max=MaxPoints
        let globalMax = 10;
        let globalMin = 0;

        const isRoundData = data[0].round !== undefined;

        if (isBump) {
            // Rank Logic: 1 to MaxRank (e.g. 20)
            globalMax = 20;
            // Scan for exact max rank
            topPlayers.forEach(pid => {
                const hist = historyMap.get(pid);
                if (hist) {
                    hist.forEach(h => {
                        if (h.rank > globalMax) globalMax = h.rank;
                    });
                }
            });
            globalMin = 1;

        } else {
            // Points Logic (Standard Line Evolution)
            globalMin = 0;
            // Scan for max points
            topPlayers.forEach(pid => {
                const hist = historyMap.get(pid);
                if (hist) {
                    hist.forEach(h => {
                        if (h.value > globalMax) globalMax = h.value;
                    });
                }
            });
            globalMax *= 1.1; // Add breathing room
        }


        const draw = (timestamp) => {
            if (!lastTimestamp) lastTimestamp = timestamp;
            const deltaTime = timestamp - lastTimestamp;
            lastTimestamp = timestamp;

            if (isPlaying) {
                if (timeRef.current < maxTime) {
                    const duration = 2000 / speed;
                    timeRef.current += (deltaTime / duration);
                    if (timeRef.current > maxTime) timeRef.current = maxTime;
                } else {
                    // Reached end. 
                    // 1. Wait 2 seconds
                    if (waitProgress.current < 2000) {
                        waitProgress.current += deltaTime;
                    } else {
                        // 2. Zoom Out Phase
                        zoomOutProgress.current += (deltaTime / 2000); // 2 seconds zoom

                        if (zoomOutProgress.current > 1) {
                            zoomOutProgress.current = 1;
                            if (onComplete) onComplete();
                        }
                    }
                }
            }

            renderFrame(timeRef.current);

            if (isPlaying && zoomOutProgress.current < 1.05) {
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
            const watermarkLabel = isRoundData ? `Day ${Math.floor(t)}` : Math.floor(t);
            context.fillText(watermarkLabel, width - width * 0.05, height - height * 0.05);
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

            // Draw League Logo if available
            const logoSize = titleSize * 1.5;
            // Check if we have a preloaded logo
            if (leagueLogo) {
                const logoX = (width / 2) - (titleWidth / 2) - logoSize - 20;
                const logoY = headerY - (logoSize * 0.7);

                // White background for logo
                context.save();
                context.beginPath();
                context.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 2, 0, Math.PI * 2);
                context.fillStyle = 'rgba(255,255,255,0.9)';
                context.fill();

                const lObj = leagueLogoRef.current;
                if (lObj.loaded && lObj.img) {
                    context.drawImage(lObj.img, logoX, logoY, logoSize, logoSize);
                }
                context.restore();
            }

            context.fillText(title, width / 2, headerY);

            // Sub-header
            context.fillStyle = '#aaa';
            context.font = `600 ${height * 0.025}px 'Inter', sans-serif`;
            const subLabel = isRoundData ? `Matchday ${Math.floor(t)}` : Math.floor(t);
            context.fillText(subLabel, width / 2, headerY + (height * 0.035));

            // Progress Bar
            const progress = (t - minTime) / (maxTime - minTime);
            const progressW = width * 0.8;
            const progressX = (width - progressW) / 2;
            const progressY = headerY + (height * 0.05);
            const barThick = Math.max(4, height * 0.005);
            context.fillStyle = 'rgba(255,255,255,0.1)';
            context.fillRect(progressX, progressY, progressW, barThick);
            context.fillStyle = '#4facfe';
            context.fillRect(progressX, progressY, progressW * Math.min(1, Math.max(0, progress)), barThick);

            // Interpolate logic
            // Helper for ordinal text (1st, 2nd...)
            const getOrdinal = (n) => {
                const s = ["th", "st", "nd", "rd"];
                const v = n % 100;
                return (s[(v - 20) % 10] || s[v] || s[0]);
            };

            const interpolated = topPlayers.map(pid => {
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

                // Interpolate Points for display
                const pValA = recA.value;
                const pValB = recB ? recB.value : pValA;
                const curValPoints = pValA + (pValB - pValA) * alpha;

                // Label Construction
                // If bump chart, show Rank + Points clearly
                // e.g. "Real Madrid (85 pts)"
                let mainLabel = recA.label;
                let subLabel = recA.subLabel;

                if (isBump) {
                    mainLabel = `${recA.label}`;
                    // "Team - 45 pts"
                    subLabel = null; // Clear sublabel to merge with main if preferred, OR keep separate
                    // As requested: "at the right of the club name display the number of point"
                    // Let's merge them into one Label for the 'main' text to ensure they are on the same line if possible, or just below.
                    // Actually, let's keep them separate but render them smart in the draw phase.
                    // For now, let's update subLabel to just be points.
                    subLabel = `${Math.floor(curValPoints)} pts`;
                }

                return {
                    id: pid,
                    label: mainLabel,
                    subLabel: subLabel,
                    value: curVal, // plotted value (Rank or Points)
                    rank: recA.rank, // actual rank
                    hist: hist
                };
            }).filter(p => p !== null);

            // Sort for painting order: 
            // If Rank chart: Higher rank # (lower position) painted first? OR Lower Rank # (top) painted lasts?
            // Usually drawing order: back to front.
            interpolated.sort((a, b) => {
                return (isRoundData && isBump) ? b.value - a.value : a.value - b.value;
            });

            const currentPoints = interpolated;

            // Scales
            let currentYDomain;

            if (isBump) {
                // Rank: Fixed 1 to 20 (or max rank)
                currentYDomain = [globalMax, 1];
            } else {
                // Points: Smooth Dynamic Zoom
                let dataMin = Infinity;
                let dataMax = -Infinity;

                interpolated.forEach(p => {
                    if (p.value < dataMin) dataMin = p.value;
                    if (p.value > dataMax) dataMax = p.value;
                });

                if (dataMin === Infinity) { dataMin = 0; dataMax = 10; }

                // Target Domain (10 by 10)
                const targetMin = Math.floor(dataMin / 10) * 10;
                let targetMax = Math.ceil(dataMax / 10) * 10;
                if (targetMax === targetMin) targetMax += 10;

                // Smooth Interpolation
                const [prevMin, prevMax] = yDomainRef.current;
                const lerp = (start, end, factor) => start + (end - start) * factor;
                // Use lower factor for smoother camera
                const factor = 0.02; // Very smooth

                const newMin = lerp(prevMin, targetMin, factor);
                const newMax = lerp(prevMax, targetMax, factor);

                // Update Ref
                yDomainRef.current = [newMin, newMax];
                currentYDomain = [newMin, newMax];
            }

            const yScale = d3.scaleLinear()
                .domain(currentYDomain)
                .range([height - margin.bottom, margin.top]);

            // Sliding Window: Fixed size 10
            const windowSize = 10;

            let xDomain;
            if (isRoundData) {
                // Smooth scrolling logic: clamps start to minTime.
                let dStart = t - windowSize;
                if (dStart < minTime) dStart = minTime;
                let dEnd = dStart + windowSize;

                // If Zooming Out, interpolate to full range
                if (zoomOutProgress.current > 0) {
                    const fullStart = minTime;
                    const fullEnd = maxTime;
                    const p = Math.min(1, Math.pow(zoomOutProgress.current, 0.5)); // Ease out

                    const curStart = dStart + (fullStart - dStart) * p;
                    const curEnd = dEnd + (fullEnd - dEnd) * p;
                    xDomain = [curStart, curEnd];
                } else {
                    // Normal Sliding Window
                    xDomain = [dStart, dEnd];
                }
            } else {
                xDomain = [minTime, maxTime];
            }

            const xScale = d3.scaleLinear()
                .domain(xDomain)
                .range([margin.left, width - margin.right]);

            // Draw Y Axis (Rank or Points)
            const [dMin, dMax] = yScale.domain();

            let yTicks;
            if (isBump) {
                if (globalMax <= 25) {
                    yTicks = Array.from({ length: globalMax }, (_, i) => i + 1);
                } else {
                    yTicks = yScale.ticks(10);
                }
            } else {
                // Always display multiples of 10
                yTicks = [];
                // Calculate start tick (multiple of 10 below dMin)
                // We want to draw visible ticks.
                // dMin might be 22.5. We should draw 20, 30...
                // But wait, if dMin is 22.5, 20 is below chart area (yScale(20) > height-margin.bottom).
                // d3 scale will handle off-screen coordinates fine, just won't show.
                // It's safer to generate a broad range and let them slide in/out.
                const startTick = Math.floor(Math.min(dMin, dMax) / 10) * 10;
                const endTick = Math.ceil(Math.max(dMin, dMax) / 10) * 10;

                for (let v = startTick; v <= endTick; v += 10) {
                    yTicks.push(v);
                }
            }

            yTicks.forEach(tick => {
                const y = yScale(tick);
                // Only draw if within vertical bounds (with small buffer)
                if (y < margin.top - 10 || y > height - margin.bottom + 10) return;

                context.beginPath();
                context.moveTo(margin.left, y);
                context.lineTo(width - margin.right, y);

                // Default style
                context.strokeStyle = 'rgba(255,255,255,0.1)';
                context.lineWidth = 1;
                context.stroke();

                context.fillStyle = '#ffffff';
                context.font = `bold ${height * 0.022}px Inter`;
                context.textAlign = 'right';
                context.fillText(tick, margin.left - 15, y + (height * 0.008));
            });

            // Draw X Axis Labels
            context.beginPath();
            let xTicks;
            if (isRoundData) {
                // Sliding Window Ticks: Multiples of 5
                xTicks = [];
                const [dMin, dMax] = xScale.domain();
                const startTick = Math.ceil(dMin / 5) * 5;
                for (let i = startTick; i <= dMax; i += 5) {
                    xTicks.push(i);
                }
            } else {
                xTicks = xScale.ticks(5);
            }

            xTicks.filter(tick => Number.isInteger(tick)).forEach(tick => {
                const x = xScale(tick);
                context.moveTo(x, height - margin.bottom);
                context.lineTo(x, height - margin.bottom + 10);
                context.fillStyle = '#ffffff'; // White color for Rounds as requested
                context.font = `600 ${height * 0.018}px Inter`;
                context.textAlign = 'center';
                context.fillText(tick, x, height - margin.bottom + 25);
            });
            context.stroke();

            if (topPlayers.length === 0) return;

            // Pre-calculate positions and resolve collisions
            const minLabelSpacing = height * 0.04; // Minimum vertical space between labels

            // Map points to their initial Y positions
            let tickPoints = currentPoints.map(p => {
                const y = yScale(p.value);
                return { ...p, y, initialY: y };
            });

            // Sort by Y (top to bottom)
            tickPoints.sort((a, b) => a.y - b.y);

            // Iterative relaxation
            // Apply stronger relaxation if zooming out or finished
            const iterations = (zoomOutProgress.current > 0 || t >= maxTime) ? 8 : 2;

            for (let iter = 0; iter < iterations; iter++) {
                for (let i = 1; i < tickPoints.length; i++) {
                    const prev = tickPoints[i - 1];
                    const curr = tickPoints[i];
                    const dist = curr.y - prev.y;
                    if (dist < minLabelSpacing) {
                        const overlap = minLabelSpacing - dist;
                        // Push apart
                        curr.y += overlap / 2;
                        prev.y -= overlap / 2;
                    }
                }
            }

            const pointMap = new Map();
            tickPoints.forEach(p => pointMap.set(p.id, p.y));

            // Draw Lines & Avatars
            currentPoints.forEach(p => {
                let color = teamColorsRef.current[p.id]?.color;
                if (!color) color = `hsl(${(p.id * 137.5) % 360}, 70%, 55%)`;

                // Adjust visibility
                color = adjustColorVisibility(color);

                const tipX = xScale(t);
                const trueTipY = yScale(p.value);

                // Determine Visual Y for Label/Avatar
                let visualY = pointMap.get(p.id);

                // If NOT zooming out and NOT finished, cling to true/data position unless massive overlap
                // But for "properly displayed" request, let's keep relaxation active but maybe subtler?
                // The user said "At the end... change a bit...".
                // Let's use relaxed visualY always, but interpolate it? 
                // No, sticking to relaxed visualY is better for readability throughout.
                // However, moving the dot off the line tip is weird during the race.
                // Let's only use visualY different from trueTipY if (ZoomOut > 0 OR t >= maxTime).
                if (zoomOutProgress.current === 0 && t < maxTime) {
                    visualY = trueTipY;
                }

                // 1. Draw Line (Using TRUE Data Coordinates)
                context.save();
                context.beginPath();
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
                    // Use correct metric for Y coordinates
                    const val = (isRoundData && isBump) ? h.rank : h.value;
                    const y = yScale(val);

                    if (!started) { context.moveTo(x, y); started = true; }
                    else context.lineTo(x, y);
                });

                // Connect to current tip
                context.lineTo(tipX, trueTipY);
                context.stroke();
                context.restore();

                // Connector if visualY differs significantly from trueTipY
                if (Math.abs(visualY - trueTipY) > 2) {
                    context.beginPath();
                    context.moveTo(tipX, trueTipY);
                    context.lineTo(tipX + 10, visualY); // Small jog to the right
                    context.strokeStyle = color;
                    context.lineWidth = 1;
                    context.stroke();
                }

                // 2. Draw Tip Avatar & Label (No Clip)
                const imgSize = height * 0.03;
                // Use visualY for avatar/text
                const displayX = (Math.abs(visualY - trueTipY) > 2) ? tipX + 10 : tipX;

                // Avatar Circle
                context.save();
                context.beginPath();
                context.arc(displayX, visualY, imgSize / 2, 0, Math.PI * 2);
                context.fillStyle = '#121212'; // Dark bg behind avatar
                context.fill();
                context.strokeStyle = color;
                context.lineWidth = 2;
                context.stroke();
                context.clip();

                const imgObj = imagesRef.current[p.id];
                if (imgObj && imgObj.loaded) {
                    context.drawImage(imgObj.img, displayX - imgSize / 2, visualY - imgSize / 2, imgSize, imgSize);
                }
                context.restore();

                // Draw Label
                const baseFontSize = height * 0.018;
                context.font = `600 ${baseFontSize}px 'Inter', sans-serif`;
                context.fillStyle = '#fff';
                context.textAlign = 'left';
                context.textBaseline = 'middle';

                const maxLabelWidth = margin.right - (imgSize / 2) - 20;
                const nameWidth = context.measureText(p.label).width;
                const textX = displayX + imgSize / 2 + 10;

                // Show Points always?
                const pointsTxt = `${Math.floor(p.value)} pts`;
                // If it's BUMP (Line Evolution of Ranks), p.value is Rank, not points.
                // We need actual points from history.
                // p.subLabel currently holds points logic for Bump?
                // Wait, in map() I set subLabel = curValPoints + ' pts' for Bump.
                // For !Bump (Points), p.value IS points.
                let displayPoints = "";
                if (isBump) displayPoints = p.subLabel || "";
                else displayPoints = `${Math.floor(p.value)} pts`;

                if (nameWidth < maxLabelWidth) {
                    context.fillText(p.label, textX, visualY);
                    // Add points to the right
                    context.fillStyle = '#ccc';
                    const labelMeasure = context.measureText(p.label);
                    context.fillText(displayPoints, textX + labelMeasure.width + 10, visualY);

                } else {
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

                    // Compact 2-line: Team Name \n Points
                    context.fillStyle = '#fff';
                    context.fillText(p.label, textX, visualY - offset);
                    context.fillStyle = '#ccc';
                    context.fillText(displayPoints, textX, visualY + offset + 2);
                }
            });

            // Optional: Draw a "Zoomed Out" indicator or effect? No, simple transition is best.
        };

        if (isPlaying) {
            animationRef.current = requestAnimationFrame(draw);
        } else {
            draw(performance.now());
        }

        return () => cancelAnimationFrame(animationRef.current);
    }, [data, width, height, isPlaying, speed, topPlayers]);

    return <canvas ref={canvasRef} className={className} />;
});

export default LineChartRace;
