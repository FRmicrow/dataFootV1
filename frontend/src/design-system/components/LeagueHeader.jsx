import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import ProfileHeader from './ProfileHeader';
import Badge from './Badge';
import './LeagueHeader.css';

/* ── Known league brand colors ─────────────────────────────────────────── */
const KNOWN_COLORS = {
    '39':  { accent: '#37003c', secondary: '#00b8e5' }, // Premier League
    '1':   { accent: '#37003c', secondary: '#00b8e5' },
    '140': { accent: '#1a1a2e', secondary: '#ffd700' }, // La Liga
    '61':  { accent: '#091c3e', secondary: '#d4af37' }, // Ligue 1
    '78':  { accent: '#d20222', secondary: '#f0c040' }, // Bundesliga
    '135': { accent: '#1d3657', secondary: '#009246' }, // Serie A
    '2':   { accent: '#001d6c', secondary: '#c8a951' }, // Champions League
    '3':   { accent: '#e8540a', secondary: '#c8102e' }, // Europa League
    '4':   { accent: '#1a1a2e', secondary: '#00a676' }, // Conference League
    '88':  { accent: '#e8000d', secondary: '#ffffff' }, // Eredivisie
    '94':  { accent: '#006600', secondary: '#ffffff' }, // Primeira Liga
    '203': { accent: '#e30022', secondary: '#ffd700' }, // Super Lig
};

function formatSeasonLabel(value, isSingleYear) {
    if (value === null || value === undefined || value === '') return '';

    const raw = String(value);
    if (raw.includes('-')) {
        const [start, end] = raw.split('-');
        if (start && end) {
            return `${start}-${end}`;
        }
        return raw;
    }

    const numeric = Number(raw);
    if (Number.isNaN(numeric)) {
        return raw;
    }

    if (isSingleYear) {
        return String(numeric % 2 !== 0 ? numeric + 1 : numeric);
    }

    return `${numeric}-${numeric + 1}`;
}

/* Stable distinct color from league id when logo extraction fails */
function hashColors(id) {
    const hue = (Number(id) * 137) % 360;
    return {
        accent:    `hsl(${hue}, 55%, 18%)`,
        secondary: `hsl(${(hue + 45) % 360}, 50%, 42%)`,
    };
}

/* Extract dominant non-white/non-black colors from image via canvas */
function extractImageColors(src, onSuccess) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        try {
            const size = 60;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, size, size);
            const { data } = ctx.getImageData(0, 0, size, size);

            const buckets = {};
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] < 100) continue;
                const r = data[i], g = data[i + 1], b = data[i + 2];
                const brightness = (r + g + b) / 3;
                if (brightness > 215 || brightness < 25) continue;
                const key = `${Math.round(r / 15) * 15},${Math.round(g / 15) * 15},${Math.round(b / 15) * 15}`;
                buckets[key] = (buckets[key] || 0) + 1;
            }

            const top = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
            if (top.length === 0) return;

            const parse = (k) => k.split(',').map(Number);
            const [r1, g1, b1] = parse(top[0][0]);
            const accent    = `rgb(${Math.round(r1 * 0.52)}, ${Math.round(g1 * 0.52)}, ${Math.round(b1 * 0.52)})`;
            const secondary = top.length > 1
                ? `rgb(${parse(top[1][0]).join(',')})`
                : `rgb(${r1}, ${g1}, ${b1})`;

            onSuccess({ accent, secondary });
        } catch (_) {
            /* CORS or security error — fallback already applied */
        }
    };
    img.src = src;
}

/**
 * LeagueHeader — compact identity banner with smart color extraction.
 * Right slot: year selector + sync button + badge + cycles count.
 */
const LeagueHeader = ({
    league,
    seasonsCount,
    activeSeason,
    availableYears = [],
    onYearChange,
    onSync,
    syncing = false,
}) => {
    if (!league) return null;

    const key = String(league.id);

    const [colors, setColors] = useState(
        () => KNOWN_COLORS[key] || hashColors(league.id)
    );

    useEffect(() => {
        if (!league.logo || KNOWN_COLORS[key]) return;
        // Start with stable hash, refine if canvas succeeds
        setColors(hashColors(league.id));
        extractImageColors(league.logo, setColors);
    }, [league.logo, league.id, key]);

    const isSingleYear = [44, 42].includes(Number(league.id));

    const subtitles = [
        league.country?.name ?? 'International',
        activeSeason ? formatSeasonLabel(activeSeason, isSingleYear) : null,
    ].filter(Boolean);

    const rightSlot = (
        <div className="lh-right-slot">
            {/* Year selector */}
            {availableYears.length > 0 && (
                <select
                    className="lh-year-select"
                    value={activeSeason}
                    onChange={onYearChange}
                    aria-label="Season"
                >
                    {availableYears.map(y => (
                        <option key={y} value={y}>{formatSeasonLabel(y, isSingleYear)}</option>
                    ))}
                </select>
            )}

            {/* Sync icon button */}
            {onSync && (
                <button
                    className={`lh-sync-btn${syncing ? ' is-syncing' : ''}`}
                    onClick={onSync}
                    disabled={syncing}
                    title={`Sync ${activeSeason}`}
                    type="button"
                >
                    🔄
                </button>
            )}

            {/* Badge + cycles */}
            <div className="lh-right-meta">
                <Badge
                    variant={league.type === 'Cup' ? 'warning' : 'primary'}
                    size="xs"
                >
                    {league.type === 'Cup' ? 'Cup' : 'League'}
                </Badge>
                {seasonsCount > 0 && (
                    <div className="lh-right-stat">
                        <span className="lh-right-stat-value">{seasonsCount}</span>
                        <span className="lh-right-stat-label">cycles</span>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="lh-wrapper">
            <ProfileHeader
                title={league.name}
                leagueId={league.id}
                image={league.logo}
                subtitles={subtitles}
                badges={[]}
                stats={[]}
                accentColor={colors.accent}
                secondaryColor={colors.secondary}
                actions={rightSlot}
            />
        </div>
    );
};

LeagueHeader.propTypes = {
    league: PropTypes.shape({
        id:      PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        name:    PropTypes.string.isRequired,
        logo:    PropTypes.string,
        country: PropTypes.shape({ name: PropTypes.string }),
        type:    PropTypes.string,
    }).isRequired,
    seasonsCount:   PropTypes.number,
    activeSeason:   PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    availableYears: PropTypes.array,
    onYearChange:   PropTypes.func,
    onSync:         PropTypes.func,
    syncing:        PropTypes.bool,
};

export default LeagueHeader;
