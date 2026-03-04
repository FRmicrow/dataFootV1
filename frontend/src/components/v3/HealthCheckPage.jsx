import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useImport } from '../../context/ImportContext.jsx';
import './HealthCheckPage.css';

const HealthCheckPage = () => {
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [filter, setFilter] = useState('PENDING');
    const { startImport, isImporting } = useImport();

    useEffect(() => {
        fetchPrescriptions();
    }, [filter]);

    const fetchPrescriptions = async () => {
        setLoading(true);
        try {
            const res = await api.getHealthPrescriptions(filter);
            setPrescriptions(res.data || res);
        } catch (err) {
            console.error('Failed to load prescriptions:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const res = await api.triggerHealthPrescribe();
            alert(`Prescription Scan Complete!\nTotal Found: ${res.total}\nNew Issues: ${res.new}`);
            fetchPrescriptions();
        } catch (err) {
            alert('Scan failed: ' + err.message);
        } finally {
            setGenerating(false);
        }
    };

    const handleExecute = (id) => {
        if (!window.confirm('Trigger targeted repair for this prescription?')) return;
        startImport('/health/execute', 'POST', { id });
    };

    const getPriorityClass = (p) => {
        if (p === 'HIGH') return 'prio-high';
        if (p === 'MEDIUM') return 'prio-medium';
        return 'prio-low';
    };

    const getTypeLabel = (type) => {
        switch (type) {
            case 'MISSING_DATA': return '📁 Missing Season';
            case 'DUPLICATE_CANDIDATE': return '👥 Duplicate';
            case 'DATA_INCONSISTENCY': return '🔎 Inconsistency';
            default: return type;
        }
    }

    return (
        <div className="health-container">
            <header className="health-header-v3">
                <div className="title-block">
                    <h1>🛡️ System Health & Recovery</h1>
                    <p>Milestone-based integrity auditing and data recovery.</p>
                </div>
                <div className="action-block">
                    <button
                        className={`btn-prescribe ${generating ? 'loading' : ''}`}
                        onClick={handleGenerate}
                        disabled={generating || isImporting}
                    >
                        {generating ? '🔍 Analyzing DB...' : '✨ Generate Prescriptions'}
                    </button>
                </div>
            </header>

            <div className="health-content-wrapper">
                <div className="health-filters">
                    <button
                        className={filter === 'PENDING' ? 'active' : ''}
                        onClick={() => setFilter('PENDING')}
                    >
                        Pending Issues ({filter === 'PENDING' ? prescriptions.length : '...'})
                    </button>
                    <button
                        className={filter === 'RESOLVED' ? 'active' : ''}
                        onClick={() => setFilter('RESOLVED')}
                    >
                        Resolved History
                    </button>
                </div>

                <div className="prescription-list-card">
                    {loading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>Scanning database health...</p>
                        </div>
                    ) : prescriptions.length === 0 ? (
                        <div className="empty-state">
                            <div className="icon">✅</div>
                            <h3>All Systems Green</h3>
                            <p>No {filter.toLowerCase()} issues found. Your database is healthy!</p>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="prescription-table">
                                <thead>
                                    <tr>
                                        <th>Priority</th>
                                        <th>Type</th>
                                        <th>Description</th>
                                        <th>Found</th>
                                        <th className="center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {prescriptions.map(p => (
                                        <tr key={p.id} className={p.priority.toLowerCase()}>
                                            <td>
                                                <span className={`prio-badge ${getPriorityClass(p.priority)}`}>
                                                    {p.priority}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="type-label">{getTypeLabel(p.type)}</span>
                                            </td>
                                            <td className="desc-cell">{p.description}</td>
                                            <td className="date-cell">{new Date(p.created_at).toLocaleDateString()}</td>
                                            <td className="center">
                                                {p.status === 'PENDING' ? (
                                                    <button
                                                        className="btn-repair"
                                                        onClick={() => handleExecute(p.id)}
                                                        disabled={isImporting}
                                                    >
                                                        🛠️ Repair
                                                    </button>
                                                ) : (
                                                    <span className="resolved-status">RESOLVED</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HealthCheckPage;
