import React from 'react';
import PropTypes from 'prop-types';
import { Card, Badge, Stack } from '../index';
import './LeagueCard.css';

/**
 * Reusable LeagueCard component for lists and featured grids.
 */
const LeagueCard = ({
    id,
    name,
    logo,
    rank,
    seasonsCount,
    isCup = false,
    onClick,
    countryName,
    countryFlag,
    tier,
    leaderName,
    leaderLogo,
    currentMatchday,
    currentRound,
    interactive = true,
    featured = false
}) => {
    return (
        <Card
            onClick={onClick}
            className={`ds-league-card ${featured ? 'ds-league-card--featured' : ''}`}
            title={
                (leaderName || currentRound) ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {leaderName ? (
                            <>
                                <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--color-primary-400)', fontWeight: 'bold', letterSpacing: '0.5px' }}>Leader</span>
                                {leaderLogo && <img src={leaderLogo} alt="" style={{ width: '12px', height: '12px', borderRadius: '50%' }} />}
                                <span style={{ fontSize: '11px', color: 'var(--color-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px', fontWeight: '600' }} title={leaderName}>
                                    {leaderName}
                                </span>
                                {currentMatchday && (
                                    <span style={{ fontSize: '10px', color: 'var(--color-text-dim)', marginLeft: 'auto', background: 'rgba(255,255,255,0.05)', padding: '1px 4px', borderRadius: '4px' }}>
                                        J.{currentMatchday}
                                    </span>
                                )}
                            </>
                        ) : (
                            <>
                                <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--color-warning-400)', fontWeight: 'bold', letterSpacing: '0.5px' }}>Round</span>
                                <span style={{ fontSize: '11px', color: 'var(--color-text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px', fontWeight: '600' }} title={currentRound}>
                                    {currentRound}
                                </span>
                            </>
                        )}
                    </div>
                ) : null
            }
            extra={
                (() => {
                    let variant = 'neutral';
                    let label = 'League';
                    if (isCup) {
                        variant = 'warning';
                        label = 'Cup';
                    } else if (featured) {
                        variant = 'primary';
                        label = 'Elite';
                    }
                    return <Badge variant={variant} size="xs">{label}</Badge>;
                })()
            }
            interactive={interactive}
        >
            <Stack direction="row" gap="var(--spacing-md)" align="center">
                <div className="ds-league-card-logo-wrap" data-featured={featured}>
                    <img src={logo} alt={name} loading="lazy" />
                </div>
                <div className="ds-league-card-info" style={{ flex: 1, overflow: 'hidden' }}>

                    <Stack direction="row" gap="4px" align="center">
                        {countryFlag && <img src={countryFlag} alt="" className="ds-league-card-flag" />}
                        <h4 className="ds-league-card-name" title={name}>{name}</h4>
                    </Stack>

                    {/* Bottom Meta */}
                    <div style={{ marginTop: '6px' }}>
                        <span className="ds-league-card-meta">
                            {countryName || ''}
                        </span>
                    </div>
                </div>
                {featured && (
                    <div className="ds-league-card-star" title="Featured Intelligence Module">⭐</div>
                )}
            </Stack>
        </Card>
    );
};

LeagueCard.propTypes = {
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    logo: PropTypes.string,
    rank: PropTypes.number,
    seasonsCount: PropTypes.number,
    isCup: PropTypes.bool,
    onClick: PropTypes.func,
    countryName: PropTypes.string,
    countryFlag: PropTypes.string,
    tier: PropTypes.number,
    leaderName: PropTypes.string,
    leaderLogo: PropTypes.string,
    currentMatchday: PropTypes.number,
    currentRound: PropTypes.string,
    interactive: PropTypes.bool,
    featured: PropTypes.bool
};

export default LeagueCard;
