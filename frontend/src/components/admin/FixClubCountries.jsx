import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FixClubCountries = () => {
    const [countries, setCountries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [scanData, setScanData] = useState([]);
    const [scanning, setScanning] = useState(false);

    useEffect(() => {
        fetchCountries();
    }, []);

    const fetchCountries = async () => {
        try {
            const res = await axios.get('/api/admin/countries');
            setCountries(res.data);
        } catch (error) {
            console.error("Error fetching countries:", error);
        }
    };

    const handleScan = async () => {
        if (!window.confirm("This will scan all clubs in the database and check their API data for country discrepancies. This may take time. Continue?")) return;

        setScanning(true);
        setScanData([]);

        try {
            const res = await axios.post('/api/admin/scan-club-countries');
            // We expect the backend to return a list of mismatches
            setScanData(res.data.mismatches);
            alert(`Scan complete. Found ${res.data.mismatches.length} potential issues.`);
        } catch (error) {
            console.error("Scan failed:", error);
            alert("Scan failed. Check console.");
        } finally {
            setScanning(false);
        }
    };

    const handleFix = async (clubId, correctCountryId) => {
        try {
            await axios.post('/api/admin/fix-club-country', { clubId, countryId: correctCountryId });
            // Remove from list
            setScanData(prev => prev.filter(item => item.club_id !== clubId));
        } catch (error) {
            alert("Failed to update.");
        }
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Fix Club Countries</h2>
            <p className="mb-4 text-gray-600">
                Scan your database to find clubs that might be assigned to the wrong country (e.g., 'World' or a mismatch with API data).
            </p>

            <button
                onClick={handleScan}
                disabled={scanning}
                className="bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700 disabled:bg-gray-400"
            >
                {scanning ? 'Scanning (This may take a while)...' : 'Scan for Mismatches'}
            </button>

            {scanData.length > 0 && (
                <div className="mt-8 bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Club</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current DB Country</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">API Country (Suggestion)</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {scanData.map(item => (
                                <tr key={item.club_id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {item.club_logo_url && <img className="h-8 w-8 rounded-full mr-3" src={item.club_logo_url} alt="" />}
                                            <div className="text-sm font-medium text-gray-900">{item.club_name}</div>
                                            <div className="text-xs text-gray-500 ml-2">ID: {item.club_id}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-500 font-semibold">
                                        {item.db_country_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-bold">
                                        {item.api_country_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {item.suggested_country_id ? (
                                            <button
                                                onClick={() => handleFix(item.club_id, item.suggested_country_id)}
                                                className="text-white bg-green-500 hover:bg-green-600 px-3 py-1 rounded"
                                            >
                                                Fix &rarr; {item.api_country_name}
                                            </button>
                                        ) : (
                                            <span className="text-gray-400 text-xs">Country not in DB</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default FixClubCountries;
