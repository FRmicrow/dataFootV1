import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FixCompetitionCountries = () => {
    // Search/Filter State
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [selectedCountryFilter, setSelectedCountryFilter] = useState('1,2');

    // Data State
    const [competitions, setCompetitions] = useState([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);

    // Reference Data
    const [allCountries, setAllCountries] = useState([]);

    useEffect(() => {
        fetchCountries();
    }, []);

    useEffect(() => {
        fetchCompetitions();
    }, [page, selectedCountryFilter, search]);

    const fetchCountries = async () => {
        try {
            const res = await axios.get('/api/admin/countries');
            setAllCountries(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchCompetitions = async () => {
        setLoading(true);
        try {
            const params = { page, search };
            if (selectedCountryFilter) params.countryId = selectedCountryFilter;

            const res = await axios.get('/api/admin/cleanup-competitions-list', { params });
            setCompetitions(res.data.data);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const updateCountry = async (competitionId, countryId) => {
        try {
            await axios.post('/api/admin/cleanup-comp-country', { competitionId, countryId });
            setCompetitions(prev => prev.map(c =>
                c.competition_id === competitionId
                    ? { ...c, country_id: countryId }
                    : c
            ));
        } catch (error) {
            alert("Failed to update country");
            console.error(error);
        }
    };

    // Helper: Sort countries but keep regions separate if needed
    const sortedCountries = [...allCountries].sort((a, b) => a.country_name.localeCompare(b.country_name));

    return (
        <div className="container" style={{ maxWidth: '1200px', padding: '2rem' }}>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Fix Competition Countries</h2>

            {/* Config / Tools Section */}
            <div className="bg-white p-4 rounded shadow mb-6 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Search Competition</label>
                    <input
                        type="text"
                        className="w-full border p-2 rounded"
                        placeholder="e.g. Cup, League..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Filter by Assigned Country</label>
                    <select
                        className="w-full border p-2 rounded"
                        value={selectedCountryFilter}
                        onChange={e => { setSelectedCountryFilter(e.target.value); setPage(1); }}
                    >
                        <option value="1,2">Generic Regions: World (1) & Europe (2)</option>
                        <option value="">-- All Competitions --</option>
                        <option value="NULL">No Country Assigned</option>
                        <optgroup label="Regions">
                            {sortedCountries.filter(c => c.country_id >= 1 && c.country_id <= 6).map(c => (
                                <option key={c.country_id} value={c.country_id}>{c.country_name}</option>
                            ))}
                        </optgroup>
                        <optgroup label="Countries">
                            {sortedCountries.filter(c => c.country_id > 6).map(c => (
                                <option key={c.country_id} value={c.country_id}>{c.country_name}</option>
                            ))}
                        </optgroup>
                    </select>
                </div>
                <button
                    onClick={async () => {
                        try {
                            const params = { page: 1, limit: 10000, search };
                            if (selectedCountryFilter) params.countryId = selectedCountryFilter;

                            const res = await axios.get('/api/admin/cleanup-competitions-list', { params });
                            const text = res.data.data.map(c => `${c.competition_id}\t${c.competition_name}`).join('\n');
                            await navigator.clipboard.writeText(text);
                            alert(`Copied ${res.data.data.length} IDs and Names to clipboard!`);
                        } catch (e) {
                            console.error(e);
                            alert("Failed to copy");
                        }
                    }}
                    className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 font-semibold h-[42px] flex items-center gap-2"
                    title="Copy All Matching Results to Clipboard"
                >
                    📋 Copy All MATCHING
                </button>
                <button
                    onClick={fetchCompetitions}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-semibold h-[42px]"
                >
                    Refresh
                </button>
            </div>

            {/* List */}
            <div className="bg-white shadow rounded overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                        <tr>
                            <th className="p-3 border-b">ID</th>
                            <th className="p-3 border-b">Competition Name</th>
                            <th className="p-3 border-b">Current Country Link</th>
                            <th className="p-3 border-b text-right">Assign Country</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" className="p-8 text-center text-gray-500">Loading...</td></tr>
                        ) : competitions.length === 0 ? (
                            <tr><td colSpan="4" className="p-8 text-center text-gray-500">No competitions found.</td></tr>
                        ) : (
                            competitions.map(comp => (
                                <tr key={comp.competition_id} className="hover:bg-gray-50 border-b last:border-0">
                                    <td className="p-3 text-gray-500 text-sm">{comp.competition_id}</td>
                                    <td className="p-3 font-medium text-gray-800">{comp.competition_name}</td>
                                    <td className="p-3">
                                        {comp.country_id ? (
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${[1, 2].includes(comp.country_id) ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                                                }`}>
                                                {allCountries.find(c => c.country_id === comp.country_id)?.country_name || `ID: ${comp.country_id}`}
                                            </span>
                                        ) : (
                                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">
                                                Unassigned
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right">
                                        <select
                                            className="border p-1 rounded text-sm max-w-[200px]"
                                            value={comp.country_id || ''}
                                            onChange={(e) => updateCountry(comp.competition_id, e.target.value)}
                                        >
                                            <option value="">-- Assign Country --</option>
                                            <optgroup label="Regions (International)">
                                                {allCountries.filter(c => c.country_id >= 1 && c.country_id <= 6).map(c => (
                                                    <option key={c.country_id} value={c.country_id}>{c.country_name}</option>
                                                ))}
                                            </optgroup>
                                            <optgroup label="Countries">
                                                {sortedCountries.filter(c => c.country_id > 6).map(c => (
                                                    <option key={c.country_id} value={c.country_id}>{c.country_name}</option>
                                                ))}
                                            </optgroup>
                                        </select>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {!loading && totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 bg-white border rounded disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="text-gray-600">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2 bg-white border rounded disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default FixCompetitionCountries;
