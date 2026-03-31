import React from 'react';
import PropTypes from 'prop-types';
import './TacticalField.css';

const TacticalField = ({ lineups }) => {
    if (!lineups || lineups.length === 0) return null;

    const renderPitch = (lineup, side) => {
        if (!lineup) return null;
        const players = typeof lineup.starting_xi === 'string' ? JSON.parse(lineup.starting_xi) : lineup.starting_xi;
        
        return (
            <div className={`tactical-pitch-side ${side}`}>
                <div className="pitch-background">
                    {/* Simplified Pitch Lines */}
                    <div className="pitch-outline"></div>
                    <div className="pitch-goal-area"></div>
                </div>
                {players.map((p, idx) => {
                    const player = p.player || {};
                    const [top, left] = (player.grid || "50:50").split(':').map(Number);
                    
                    // Transformation: 
                    // In a "Top vs Bottom" layout, one side needs to be flipped.
                    // If side is 'away', we flip top (100 - top)
                    const finalTop = side === 'away' ? (100 - top) : top;
                    
                    return (
                        <div 
                            key={player.id || idx} 
                            className="pitch-player-node"
                            style={{ 
                                top: `${finalTop}%`, 
                                left: `${left}%` 
                            }}
                            title={player.name}
                        >
                            <div className="player-disc">
                                {player.number}
                            </div>
                            <span className="player-name-label">{player.name}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="tactical-field-container">
            {renderPitch(lineups[0], 'home')}
            <div className="tactical-field-divider"></div>
            {renderPitch(lineups[1], 'away')}
        </div>
    );
};

TacticalField.propTypes = {
    lineups: PropTypes.array.isRequired
};

export default TacticalField;
