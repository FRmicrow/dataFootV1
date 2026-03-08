import React from 'react';
import PropTypes from 'prop-types';

const InfoIcon = ({ text }) => (
    <span className="info-icon" data-tooltip={text}>?</span>
);

InfoIcon.propTypes = {
    text: PropTypes.string.isRequired
};

const SimulationMetrics = ({ metrics }) => {
    if (!metrics) return null;

    return (
        <div className="metrics-row">
            <div className="metric-card highlight-accuracy">
                <span className="lbl">
                    🎯 Accuracy Rate
                    <InfoIcon text="Percentage of matches where the model correctly predicted the 1X2 outcome." />
                </span>
                <div className="val">{((metrics.accuracy || 0) * 100).toFixed(1)}%</div>
                <div className="sub-val">{metrics.count || 0} matches analyzed</div>
            </div>

            <div className="metric-card">
                <span className="lbl">
                    Brier Score
                    <InfoIcon text="Measures calibration quality. 0.0 = perfect, 0.66 = random. Below 0.35 is elite." />
                </span>
                <div className="val">{(metrics.brier_score || 0).toFixed(4)}</div>
                <div className="sub-val">Calibration</div>
            </div>

            <div className="metric-card">
                <span className="lbl">
                    Log-Loss
                    <InfoIcon text="Penalizes confident wrong predictions. Lower = better probability calibration." />
                </span>
                <div className="val">{(metrics.log_loss || 0).toFixed(4)}</div>
                <div className="sub-val">Entropy</div>
            </div>

            <div className="metric-card">
                <span className="lbl">
                    Avg Confidence
                    <InfoIcon text="Average confidence the model had in its top prediction." />
                </span>
                <div className="val">{((metrics.avg_confidence || 0) * 100).toFixed(1)}%</div>
                <div className="sub-val">
                    {metrics.accuracy > 0.5 ? 'RELIABLE' : metrics.accuracy > 0.4 ? 'MODERATE' : 'NEEDS WORK'}
                </div>
            </div>
        </div>
    );
};

SimulationMetrics.propTypes = {
    metrics: PropTypes.shape({
        accuracy: PropTypes.number,
        count: PropTypes.number,
        brier_score: PropTypes.number,
        log_loss: PropTypes.number,
        avg_confidence: PropTypes.number,
    })
};

export default SimulationMetrics;
