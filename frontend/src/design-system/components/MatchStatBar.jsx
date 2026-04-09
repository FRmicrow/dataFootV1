import React from 'react';
import PropTypes from 'prop-types';
import './MatchStatBar.css';

/**
 * MatchStatBar — reusable head-to-head stat comparison bar.
 * Shows home value | centered label | away value, with a split progress bar.
 * Used in match tactical panels, xG summaries, etc.
 */
const MatchStatBar = ({
    label,
    homeValue,
    awayValue,
    isPct = false,
    className = '',
}) => {
    const hNum = parseFloat(homeValue) || 0;
    const aNum = parseFloat(awayValue) || 0;
    const total = hNum + aNum;

    // For percentage stats (possession), use raw values as the split.
    // For count stats, compute proportional widths.
    const hPct = isPct
        ? Math.min(Math.max(hNum, 0), 100)
        : total === 0 ? 50 : (hNum / total) * 100;
    const aPct = 100 - hPct;

    const fmt = (v) => isPct ? `${v}%` : v ?? '—';

    return (
        <div className={`msb-row ${className}`}>
            <div className="msb-header">
                <span className="msb-val msb-val--home">{fmt(homeValue)}</span>
                <span className="msb-label">{label}</span>
                <span className="msb-val msb-val--away">{fmt(awayValue)}</span>
            </div>
            <div className="msb-track">
                <div className="msb-fill msb-fill--home" style={{ width: `${hPct}%` }} />
                <div className="msb-fill msb-fill--away" style={{ width: `${aPct}%` }} />
            </div>
        </div>
    );
};

MatchStatBar.propTypes = {
    label: PropTypes.string.isRequired,
    homeValue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    awayValue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    isPct: PropTypes.bool,
    className: PropTypes.string,
};

export default MatchStatBar;
