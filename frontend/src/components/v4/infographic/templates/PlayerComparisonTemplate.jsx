import React from 'react';
import PropTypes from 'prop-types';
import MissingDataBadge from '../../../../design-system/components/MissingDataBadge';
import './PlayerComparisonTemplate.css';

/**
 * V48 Phase 2 — Template: Comparatif joueurs.
 *
 * Renders a 1200×675 PNG-ready card comparing two players over a season.
 * Receives `{ resolved, missing, styleVariant }` from the resolver
 * (Phase 3) — never fetches anything itself.
 *
 * Hard rules from the visual-manifesto:
 *   - No hardcoded data fallback. Missing fields render as
 *     <MissingDataBadge /> exclusively.
 *   - No hex colors in JSX or component CSS — use tokens or theme vars
 *     defined per variant.
 *   - Fixed 1200×675 dimensions; the page that mounts this template
 *     must give it room to breathe but the canvas itself is locked.
 *
 * Resolved shape (matches resolverContract in player-comparison.json):
 *   {
 *     season: '2025-26',
 *     players: [
 *       { name, photo?, club_name?, club_logo?, goals, assists?, xG?, minutes_played? },
 *       { ...same... }
 *     ]
 *   }
 *
 * Missing shape:
 *   [{ fieldPath, severity: 'critical'|'optional', humanLabel }]
 */

const VARIANT_CLASS = {
    'dark-observatory': 'template-theme--dark-observatory',
    'editorial':        'template-theme--editorial',
    'tactical':         'template-theme--tactical',
};

function severityFor(missing, fieldPath) {
    return missing.find(m => m.fieldPath === fieldPath)?.severity ?? null;
}

function humanLabelFor(missing, fieldPath, fallback) {
    const m = missing.find(x => x.fieldPath === fieldPath);
    return m?.humanLabel ?? fallback;
}

function StatRow({ statKey, label, value, formatter, missing, idx }) {
    const fieldPath = `players[${idx}].${statKey}`;
    const sev = severityFor(missing, fieldPath);
    const isMissing = sev !== null || value == null;

    return (
        <div className="pct-stat-row" data-stat={statKey}>
            <span className="pct-stat-label">{label}</span>
            {!isMissing
                ? <span className="pct-stat-value">{formatter ? formatter(value) : value}</span>
                : <MissingDataBadge
                    label={humanLabelFor(missing, fieldPath, label)}
                    severity={sev ?? 'optional'}
                    size="xs"
                />}
        </div>
    );
}

StatRow.propTypes = {
    statKey:   PropTypes.string.isRequired,
    label:     PropTypes.string.isRequired,
    value:     PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    formatter: PropTypes.func,
    missing:   PropTypes.array.isRequired,
    idx:       PropTypes.number.isRequired,
};

function PlayerColumn({ player, idx, missing }) {
    const photoFieldPath = `players[${idx}].photo`;
    const photoSev = severityFor(missing, photoFieldPath);
    const photoMissing = photoSev !== null || !player?.photo;

    const nameFieldPath = `players[${idx}].name`;
    const nameSev = severityFor(missing, nameFieldPath);
    const nameMissing = nameSev !== null || !player?.name;

    return (
        <div className="pct-col" data-player-index={idx}>
            <div className="pct-photo-wrap">
                {!photoMissing
                    ? <img className="pct-photo" src={player.photo} alt={player.name ?? ''} />
                    : <div className="pct-photo pct-photo--missing" role="img" aria-label="Photo manquante">
                        <MissingDataBadge
                            label={humanLabelFor(missing, photoFieldPath, 'Photo')}
                            severity={photoSev ?? 'optional'}
                            size="xs"
                        />
                    </div>
                }
            </div>

            <div className="pct-identity">
                <h2 className="pct-name">
                    {!nameMissing
                        ? player.name
                        : <MissingDataBadge
                            label={humanLabelFor(missing, nameFieldPath, 'Nom du joueur')}
                            severity={nameSev ?? 'critical'}
                            size="sm"
                        />}
                </h2>
                <p className="pct-club">
                    {player?.club_name ?? <MissingDataBadge label="Club" severity="optional" size="xs" />}
                </p>
            </div>

            <div className="pct-stats">
                <StatRow statKey="goals"           label="Buts"    value={player?.goals}           missing={missing} idx={idx} />
                <StatRow statKey="assists"         label="Passes"  value={player?.assists}         missing={missing} idx={idx} />
                <StatRow statKey="xG"              label="xG"      value={player?.xG}
                         formatter={(v) => Number(v).toFixed(2)}   missing={missing} idx={idx} />
                <StatRow statKey="minutes_played"  label="Min"     value={player?.minutes_played}  missing={missing} idx={idx} />
            </div>
        </div>
    );
}

PlayerColumn.propTypes = {
    player:  PropTypes.object,
    idx:     PropTypes.number.isRequired,
    missing: PropTypes.array.isRequired,
};

const PlayerComparisonTemplate = ({ resolved, missing = [], styleVariant = 'dark-observatory' }) => {
    const themeClass = VARIANT_CLASS[styleVariant] ?? VARIANT_CLASS['dark-observatory'];
    const players = resolved?.players ?? [{}, {}];
    const season = resolved?.season ?? null;

    return (
        <article
            className={`infographic-canvas pct-canvas ${themeClass}`}
            data-template-id="player-comparison"
            data-style-variant={styleVariant}
        >
            <header className="pct-header">
                <span className="pct-header-eyebrow">COMPARATIF</span>
                <span className="pct-header-divider" aria-hidden="true">·</span>
                <span className="pct-header-season">
                    {season
                        ? `SAISON ${season}`
                        : <MissingDataBadge label="Saison" severity="critical" size="xs" />}
                </span>
            </header>

            <div className="pct-grid">
                <PlayerColumn player={players[0]} idx={0} missing={missing} />
                <div className="pct-divider" aria-hidden="true" />
                <PlayerColumn player={players[1]} idx={1} missing={missing} />
            </div>

            <footer className="pct-footer">
                <span className="pct-brand">ninetyXI</span>
                <span className="pct-source">Données : v4.season_player_stats</span>
            </footer>
        </article>
    );
};

PlayerComparisonTemplate.propTypes = {
    resolved: PropTypes.shape({
        season:  PropTypes.string,
        players: PropTypes.arrayOf(PropTypes.object),
    }),
    missing: PropTypes.arrayOf(PropTypes.shape({
        fieldPath:   PropTypes.string.isRequired,
        severity:    PropTypes.oneOf(['critical', 'optional']).isRequired,
        humanLabel:  PropTypes.string,
    })),
    styleVariant: PropTypes.oneOf(['dark-observatory', 'editorial', 'tactical']),
};

export default PlayerComparisonTemplate;
