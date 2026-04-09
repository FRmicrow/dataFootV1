import React from 'react';
import PropTypes from 'prop-types';

const InfoIcon = ({ text }) => (
    <span className="info-icon" data-tooltip={text}>?</span>
);

InfoIcon.propTypes = {
    text: PropTypes.string.isRequired
};

const ConfusionMatrix = ({ matrix }) => {
    if (!matrix) return null;

    return (
        <div className="chart-card">
            <div className="card-header-with-info">
                <h3>🎯 Confusion Matrix</h3>
                <InfoIcon text="Rows = Actual results, Columns = Predicted results." />
            </div>
            <div className="confusion-matrix-wrapper">
                <div className="cm-title-top">MODEL PREDICTION</div>
                <div className="cm-grid-with-axis">
                    <div className="cm-axis-y">ACTUAL</div>
                    <div className="cm-grid">
                        <div className="cm-header"></div>
                        <div className="cm-header">PRED X</div>
                        <div className="cm-header">PRED 1</div>
                        <div className="cm-header">PRED 2</div>

                        <div className="cm-row-label">ACT X</div>
                        <div className="cm-cell">{matrix[0][0]}</div>
                        <div className="cm-cell">{matrix[0][1]}</div>
                        <div className="cm-cell">{matrix[0][2]}</div>

                        <div className="cm-row-label">ACT 1</div>
                        <div className="cm-cell">{matrix[1][0]}</div>
                        <div className="cm-cell">{matrix[1][1]}</div>
                        <div className="cm-cell">{matrix[1][2]}</div>

                        <div className="cm-row-label">ACT 2</div>
                        <div className="cm-cell">{matrix[2][0]}</div>
                        <div className="cm-cell">{matrix[2][1]}</div>
                        <div className="cm-cell">{matrix[2][2]}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

ConfusionMatrix.propTypes = {
    matrix: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired
};

export default ConfusionMatrix;
