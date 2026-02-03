
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DataCleanup = () => {
    // Filter State
    const [countries, setCountries] = useState([]);
    const [selectedCountry, setSelectedCountry] = useState('');
    const [clubs, setClubs] = useState([]);
    const [selectedClub, setSelectedClub] = useState('');

    // Pagination State
    const [mergePage, setMergePage] = useState(1);
    const [unknownPage, setUnknownPage] = useState(1);
    const itemsPerPage = 20;

    // Data State
    const [data, setData] = useState({ mergeCandidates: [], unknowns: [] });
    const [loading, setLoading] = useState(false);

    // Manual assignment state helpers
    const [compOptions, setCompOptions] = useState({});

    useEffect(() => {
        fetchCountries();
        fetchCandidates();
    }, []);

    useEffect(() => {
        setClubs([]);
        setSelectedClub('');
        if (selectedCountry) {
            fetchClubs(selectedCountry);
        }
    }, [selectedCountry]);

    // Re-fetch when club changes
    useEffect(() => {
        if (selectedClub) {
            fetchCandidates();
        }
    }, [selectedClub]);

    useEffect(() => {
        // Reset pages when data changes
        setMergePage(1);
        setUnknownPage(1);
    }, [data]);

    const fetchCountries = async () => {
        try {
            const res = await axios.get('/api/admin/countries?region=Europe');
            setCountries(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchClubs = async (countryName) => {
        try {
            const res = await axios.get(`/api/admin/clubs-by-country?country=${encodeURIComponent(countryName)}`);
            setClubs(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchCandidates = async () => {
        setLoading(true);
        try {
            // Pass selectedClub if present
            const params = {};
            if (selectedClub) params.clubId = selectedClub;

            const res = await axios.get('/api/admin/cleanup-candidates', { params });
            setData(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleMerge = async (keepId, removeId) => {
        try {
            await axios.post('/api/admin/cleanup-merge', { keepId, removeId });
            fetchCandidates();
        } catch (error) {
            alert("Merge failed");
        }
    };

    const handleAssign = async (statId, competitionId) => {
        try {
            await axios.post('/api/admin/cleanup-assign', { statId, competitionId });
            setData(prev => ({
                ...prev,
                unknowns: prev.unknowns.filter(u => u.stat_id !== statId)
            }));
        } catch (error) {
            alert("Assignment failed");
        }
    };

    const loadComps = async (statId, countryId) => {
        if (compOptions[statId]) return;

        try {
            // Attempt to load competitions for this country
            const res = await axios.get(`/api/admin/cleanup-competitions?countryId=${countryId || ''}`);
            setCompOptions(prev => ({ ...prev, [statId]: res.data }));
        } catch (error) {
            console.error(error);
        }
    };

    // Pagination Helpers
    const paginate = (items, page) => {
        const start = (page - 1) * itemsPerPage;
        return items.slice(start, start + itemsPerPage);
    };

    const renderPagination = (totalItems, currentPage, setPage) => {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (totalPages <= 1) return null;

        return (
            <div className="flex justify-center items-center gap-4 mt-4">
                <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                >
                    Previous
                </button>
                <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                </span>
                <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                >
                    Next
                </button>
            </div>
        );
    };

    return (
        <div className="container" style={{ maxWidth: '1200px' }}>
            <h2 className="page-title" style={{ color: '#333', textAlign: 'left', textShadow: 'none' }}>Data Cleanup</h2>

            {/* Filter Panel */}
            <div className="modern-search-panel" style={{ alignItems: 'end' }}>
                <div className="modern-form-group">
                    <label>Filter by Country</label>
                    <select
                        className="modern-select"
                        value={selectedCountry}
                        onChange={e => setSelectedCountry(e.target.value)}
                    >
                        <option value="">-- All Countries --</option>
                        {countries.map(c => <option key={c.country_id} value={c.country_name}>{c.country_name}</option>)}
                    </select>
                </div>
                <div className="modern-form-group">
                    <label>Filter by Club</label>
                    <select
                        className="modern-select"
                        value={selectedClub}
                        disabled={!selectedCountry}
                        onChange={e => setSelectedClub(e.target.value)}
                    >
                        <option value="">-- All Clubs --</option>
                        {clubs.map(c => <option key={c.club_id} value={c.club_id}>{c.club_name}</option>)}
                    </select>
                </div>
                <div className="modern-form-group">
                    <button onClick={fetchCandidates} className="modern-button" disabled={loading}>
                        {loading ? 'Scanning...' : 'Refresh Data'}
                    </button>
                </div>
            </div>

            {loading && <div className="text-center py-8 text-gray-500">Loading candidates...</div>}

            {/* Config / Tools Section */}
            <div className="mb-6 flex gap-4 justify-end">
                <button
                    onClick={async () => {
                        if (confirm("This will insert regions (World, Europe, etc.) into the Countries table and attempt to auto-assign International competitions to them. Continue?")) {
                            try {
                                setLoading(true);
                                const res = await axios.post('/api/admin/cleanup-init-regions');
                                alert(res.data.message);
                                fetchCandidates(); // Refresh in case things changed
                            } catch (error) {
                                alert("Error initializing regions");
                                console.error(error);
                            } finally {
                                setLoading(false);
                            }
                        }
                    }}
                    className="bg-purple-600 text-white px-4 py-2 rounded shadow hover:bg-purple-700 text-sm"
                >
                    ⚡ Initialize Regions & Auto-Match
                </button>
            </div>

            {/* Section 1: Merge Duplicates */}
            {!loading && (
                <div className="mb-8">
                    <h3 className="text-xl font-bold mb-4 text-gray-700 flex items-center gap-2">
                        1. Resolve Duplicates
                        <span className="text-sm bg-red-100 text-red-600 px-2 py-1 rounded-full">{data.mergeCandidates.length} Found</span>
                    </h3>

                    {data.mergeCandidates.length === 0 ? (
                        <div className="p-4 bg-gray-50 rounded text-gray-500 italic">No duplicates found {selectedClub ? 'for this club' : ''}.</div>
                    ) : (
                        <div className="space-y-4">
                            {paginate(data.mergeCandidates, mergePage).map((group, idx) => (
                                <div key={idx} className="bg-white p-4 rounded shadow border border-gray-200">
                                    <div className="font-bold text-gray-800 mb-2 border-b pb-2 flex justify-between">
                                        <span>{group.items[0].first_name} {group.items[0].last_name} ({group.items[0].club_name} - {group.items[0].season})</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {group.items.map(item => (
                                            <div key={item.stat_id} className={`p-3 border rounded relative ${item.competition_id ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>

                                                <div className="font-semibold text-sm mb-1">
                                                    {item.competition_name || <span className="text-red-500">Unknown Competition</span>}
                                                </div>
                                                <div className="text-xs text-gray-600 mb-2">
                                                    <div> Matches: <strong>{item.matches_played}</strong></div>
                                                    <div> Goals: <strong>{item.goals}</strong></div>
                                                    <div> ID: {item.stat_id}</div>
                                                </div>

                                                <button
                                                    onClick={() => handleMerge(null, item.stat_id)}
                                                    className="w-full bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 text-xs py-1 px-2 rounded transition-colors"
                                                >
                                                    Delete This Entry
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {/* Pagination */}
                            {renderPagination(data.mergeCandidates.length, mergePage, setMergePage)}
                        </div>
                    )}
                </div>
            )}

            {/* Section 2: Unknown Competitions */}
            {!loading && (
                <div className="mb-8">
                    <h3 className="text-xl font-bold mb-4 text-gray-700 flex items-center gap-2">
                        2. Unknown Competitions
                        <span className="text-sm bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">{data.unknowns.length} Found</span>
                        {data.totalUnknowns > data.showing && (
                            <span className="text-xs text-gray-400 font-normal ml-2">(Showing top {data.showing} of {data.totalUnknowns})</span>
                        )}
                    </h3>
                    {data.unknowns.length === 0 ? (
                        <div className="p-4 bg-gray-50 rounded text-gray-500 italic">No unknown competitions found.</div>
                    ) : (
                        <div className="bg-white shadow rounded-lg overflow-hidden pb-4">
                            <table className="w-full text-left border-collapse mb-4">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-3 border-b font-semibold text-gray-600">Player</th>
                                        <th className="p-3 border-b font-semibold text-gray-600">Stats</th>
                                        <th className="p-3 border-b font-semibold text-gray-600">Suggestion</th>
                                        <th className="p-3 border-b font-semibold text-gray-600">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginate(data.unknowns, unknownPage).map(u => (
                                        <tr key={u.stat_id} className="hover:bg-gray-50">
                                            <td className="p-3 border-b">
                                                <div className="font-bold text-gray-800">{u.first_name} {u.last_name}</div>
                                                <div className="text-sm text-gray-500">{u.club_name} ({u.season})</div>
                                                {u.country_name && <div className="text-xs text-blue-500">{u.country_name}</div>}
                                            </td>
                                            <td className="p-3 border-b">
                                                <div className="text-sm">M: {u.matches_played}, G: {u.goals}</div>
                                            </td>
                                            <td className="p-3 border-b">
                                                {u.suggestion ? (
                                                    <div>
                                                        <div className="font-bold text-green-600 text-sm">{u.suggestion.competition_name}</div>
                                                        <div className="text-xs text-gray-500">Why: {u.suggestionRule}</div>
                                                        <button
                                                            onClick={() => handleAssign(u.stat_id, u.suggestion.competition_id)}
                                                            className="mt-1 bg-green-100 text-green-700 px-2 py-1 rounded text-xs hover:bg-green-200 border border-green-300"
                                                        >
                                                            Accept Suggestion
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic text-sm">No auto-suggestion</span>
                                                )}
                                            </td>
                                            <td className="p-3 border-b">
                                                <div className="flex flex-col gap-2">
                                                    <select
                                                        className="border p-1 rounded text-sm w-full max-w-xs"
                                                        onFocus={() => loadComps(u.stat_id, u.country_id)}
                                                        onChange={(e) => {
                                                            if (e.target.value) handleAssign(u.stat_id, e.target.value);
                                                        }}
                                                        value=""
                                                    >
                                                        <option value="">-- Assign Manually --</option>
                                                        {(compOptions[u.stat_id] || []).map(c => (
                                                            <option key={c.competition_id} value={c.competition_id}>
                                                                {c.competition_name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {/* Pagination */}
                            {renderPagination(data.unknowns.length, unknownPage, setUnknownPage)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DataCleanup;
