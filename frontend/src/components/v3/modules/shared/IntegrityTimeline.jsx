import React from 'react';

const IntegrityTimeline = ({ milestones, activeMilestone }) => {
    return (
        <div className="integrity-timeline">
            {milestones.map((m, idx) => {
                const isCompleted = m.status === 'CLEAN' || m.status === 'ISSUES';
                const isActive = activeMilestone === m.id;

                return (
                    <div key={m.id} className={`timeline-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                        <div className="step-number">
                            {isCompleted && m.status === 'CLEAN' ? '✅' : (isCompleted && m.status === 'ISSUES' ? '⚠️' : idx + 1)}
                        </div>
                        <div className="step-content">
                            <div className="step-title">{m.title}</div>
                            {m.status === 'ISSUES' && <div className="step-badge">{m.count} Issues</div>}
                            {isActive && <div className="step-loader">Checking...</div>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default IntegrityTimeline;
