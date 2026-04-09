import React from 'react';
import PropTypes from 'prop-types';

const ModelSection = ({ hasModels, leagueModels, isBuildingModels, buildStatus, onBuildModels, mlStatus, disabled }) => {
    if (disabled) return null;

    const sectionBg = hasModels ? 'rgba(16, 185, 129, 0.05)' : 'rgba(59, 130, 246, 0.05)';
    const sectionBorder = hasModels ? '#134e3a' : '#1e3a5f';

    return (
        <div className="param-group" style={{
            background: sectionBg,
            padding: '14px', borderRadius: '12px',
            border: `1px solid ${sectionBorder}`
        }}>
            <div className="label-with-action">
                <label>② Models {hasModels ? '✅' : '⚠️'}</label>
                {hasModels && (
                    <span style={{ fontSize: '0.65rem', color: '#10b981', background: '#0d3d2e', padding: '2px 8px', borderRadius: '6px' }}>
                        {leagueModels.length}/3 Active
                    </span>
                )}
            </div>

            {leagueModels.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                    {leagueModels.map(m => (
                        <div key={m.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: '#0f172a', borderRadius: '8px', padding: '6px 10px', marginBottom: '4px',
                            fontSize: '0.72rem'
                        }}>
                            <span style={{ color: '#10b981', fontWeight: 600 }}>{m.horizon_type?.replaceAll('_', ' ')}</span>
                            <span style={{ color: '#e2e8f0' }}>{m.accuracy ? `${(m.accuracy * 100).toFixed(1)}%` : '-'}</span>
                            <span style={{ color: '#64748b' }}>{m.training_dataset_size || '-'} matches</span>
                        </div>
                    ))}
                </div>
            )}

            {isBuildingModels && buildStatus && (
                <div style={{ marginBottom: '10px' }}>
                    {Object.entries(buildStatus).map(([horizon, status]) => (
                        <div key={horizon} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            fontSize: '0.72rem', padding: '4px 0'
                        }}>
                            <span style={{ color: '#94a3b8' }}>{horizon}</span>
                            <span style={{
                                color: (() => {
                                    if (status === 'completed') return '#10b981';
                                    if (status === 'failed') return '#ef4444';
                                    return '#f59e0b';
                                })()
                            }}>
                                {(() => {
                                    if (status === 'completed') return '✅';
                                    if (status === 'failed') return '❌';
                                    if (status === 'training') return '⏳ Training...';
                                    return '⏸️ Pending';
                                })()}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {!hasModels ? (
                <>
                    <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: '4px 0 10px' }}>
                        No models exist yet. Build 3 models: Full Historical, 5-Year, 3-Year horizons.
                    </p>
                    <button
                        className="btn-calibrate"
                        onClick={onBuildModels}
                        disabled={isBuildingModels || (mlStatus && mlStatus.status !== 'online')}
                        style={{ width: '100%' }}
                    >
                        {isBuildingModels ? '⏳ Building Models...' : '🏗️ Build 3 Models'}
                    </button>
                </>
            ) : (
                <button
                    className="text-action-btn"
                    onClick={onBuildModels}
                    disabled={isBuildingModels || (mlStatus && mlStatus.status !== 'online')}
                    style={{ fontSize: '0.7rem', color: '#64748b', cursor: 'pointer', marginTop: '4px' }}
                >
                    {isBuildingModels ? '⏳ Rebuilding...' : '🔄 Rebuild All Models'}
                </button>
            )}
        </div>
    );
};

ModelSection.propTypes = {
    hasModels: PropTypes.bool.isRequired,
    leagueModels: PropTypes.array.isRequired,
    isBuildingModels: PropTypes.bool.isRequired,
    buildStatus: PropTypes.object,
    onBuildModels: PropTypes.func.isRequired,
    mlStatus: PropTypes.object,
    disabled: PropTypes.bool
};

export default ModelSection;
