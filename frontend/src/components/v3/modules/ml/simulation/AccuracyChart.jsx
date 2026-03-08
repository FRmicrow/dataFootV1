import React from 'react';
import PropTypes from 'prop-types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import InfoIcon from './InfoIcon';

const AccuracyChart = ({ combinedChartData }) => {
    return (
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
            <div className="card-header-with-info">
                <h3>📈 Accuracy by Matchday</h3>
                <InfoIcon text="Prediction accuracy (%) per matchday round. Higher is better." />
            </div>
            <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={combinedChartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis
                            dataKey="round"
                            name="Matchday"
                            stroke="#94a3b8"
                            tick={{ fontSize: 10 }}
                            type="number"
                            domain={['dataMin', 'dataMax']}
                        />
                        <YAxis
                            stroke="#10b981"
                            tick={{ fontSize: 10 }}
                            domain={[0, 100]}
                            tickFormatter={(val) => `${val}%`}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
                            labelFormatter={(value) => `Matchday ${value}`}
                            formatter={(value) => [`${value}%`, 'Accuracy']}
                        />
                        <Line
                            name="Accuracy"
                            type="monotone"
                            dataKey="accuracy"
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={{ r: 3, fill: '#10b981' }}
                            connectNulls={true}
                        />
                        <Line
                            name="Random Baseline"
                            type="monotone"
                            dataKey={() => 33.3}
                            stroke="#ef4444"
                            strokeWidth={1}
                            strokeDasharray="8 4"
                            dot={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

AccuracyChart.propTypes = {
    combinedChartData: PropTypes.array.isRequired
};

export default AccuracyChart;
