import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../../services/api';
import { ControlBar, Skeleton, TableSkeleton } from '../../../../design-system';
import PageLayoutV4 from '../../layouts/PageLayoutV4';
import PageContentV4 from '../../layouts/PageContentV4';

import './CompetitionMappingPage.css';

const CompetitionMappingPage = () => {
    const [data, setData] = useState({ competitions: [], relations: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRootId, setSelectedRootId] = useState(null);
    const [autoLinking, setAutoLinking] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.getAdminCompetitionsV4();
            setData(res);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const roots = useMemo(() => {
        return data.competitions.filter(c => !c.is_source && (!searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase())));
    }, [data.competitions, searchTerm]);

    const orphans = useMemo(() => {
        return data.competitions.filter(c => !c.is_source && !c.is_target);
    }, [data.competitions]);

    const selectedRoot = useMemo(() => {
        return data.competitions.find(c => c.competition_id === selectedRootId);
    }, [data.competitions, selectedRootId]);

    const children = useMemo(() => {
        if (!selectedRootId) return [];
        const childIds = data.relations
            .filter(r => r.target_id === selectedRootId)
            .map(r => r.source_id);
        return data.competitions.filter(c => childIds.includes(c.competition_id));
    }, [data.relations, data.competitions, selectedRootId]);

    const handleLink = async (sourceId, targetId, type = 'SUB_COMPETITION') => {
        try {
            await api.linkCompetitionsV4(sourceId, targetId, type);
            fetchData();
        } catch (err) {
            alert('Failed to link: ' + err.message);
        }
    };

    const handleUnlink = async (sourceId, targetId) => {
        try {
            await api.unlinkCompetitionsV4(sourceId, targetId);
            fetchData();
        } catch (err) {
            alert('Failed to unlink: ' + err.message);
        }
    };

    const handleAutoLink = async () => {
        setAutoLinking(true);
        try {
            const res = await api.autoLinkCompetitionsV4();
            alert(`Auto-linked ${res.linkedCount} competitions!`);
            fetchData();
        } catch (err) {
            alert('Auto-link failed: ' + err.message);
        } finally {
            setAutoLinking(false);
        }
    };

    if (loading && !data.competitions.length) return <PageLayoutV4><TableSkeleton rows={10} /></PageLayoutV4>;

    return (
        <PageLayoutV4>
            <div className="admin-map-header">
                <h1>Competition Mapping (V4)</h1>
                <div className="admin-map-actions">
                    <button 
                        className={`btn-auto ${autoLinking ? 'loading' : ''}`}
                        onClick={handleAutoLink}
                        disabled={autoLinking}
                    >
                        {autoLinking ? 'Running Magic...' : '✨ Auto-Link (Generic)'}
                    </button>
                </div>
            </div>

            <div className="admin-map-grid">
                {/* 1. Root List */}
                <div className="admin-map-col roots-col">
                    <div className="col-header">
                        <h3>Main Competitions</h3>
                        <input 
                            type="text" 
                            placeholder="Search root..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="scroll-list">
                        {roots.map(c => (
                            <div 
                                key={c.competition_id} 
                                className={`list-item root-item ${selectedRootId === c.competition_id ? 'active' : ''}`}
                                onClick={() => setSelectedRootId(c.competition_id)}
                            >
                                <span className="item-flag">{c.country_flag}</span>
                                <span className="item-name">{c.name}</span>
                                {c.is_target && <span className="badge-child">Parent</span>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Details & Children */}
                <div className="admin-map-col detail-col">
                    <div className="col-header">
                        <h3>Relationship Tree</h3>
                    </div>
                    {selectedRoot ? (
                        <div className="tree-content">
                            <div className="tree-node root-node">
                                <div className="node-box">
                                    <strong>{selectedRoot.name}</strong>
                                    <span className="node-type">ROOT</span>
                                </div>
                            </div>
                            
                            <div className="tree-connector">↓</div>

                            <div className="children-list">
                                {children.length > 0 ? children.map(child => (
                                    <div key={child.competition_id} className="tree-node child-node">
                                        <div className="node-box">
                                            <span>{child.name}</span>
                                            <button 
                                                className="btn-unlink"
                                                onClick={() => handleUnlink(child.competition_id, selectedRootId)}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="empty-state">No children linked yet</div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state">Select a competition to manage its hierarchy</div>
                    )}
                </div>

                {/* 3. Orphans / Candidates */}
                <div className="admin-map-col orphans-col">
                    <div className="col-header">
                        <h3>Orphans (Unlinked)</h3>
                    </div>
                    <div className="scroll-list">
                        {orphans.map(c => (
                            <div key={c.competition_id} className="list-item orphan-item">
                                <div className="item-info">
                                    <span className="item-flag">{c.country_flag}</span>
                                    <span className="item-name">{c.name}</span>
                                </div>
                                <button 
                                    className="btn-link-action"
                                    disabled={!selectedRootId}
                                    onClick={() => handleLink(c.competition_id, selectedRootId)}
                                >
                                    Link to Active Root
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </PageLayoutV4>
    );
};

export default CompetitionMappingPage;
