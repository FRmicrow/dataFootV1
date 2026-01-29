import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MissingInfo = () => {
    const [clubs, setClubs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [updatingId, setUpdatingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [error, setError] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    useEffect(() => {
        fetchMissingInfoClubs();
    }, []);

    // Clear error automatically
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const fetchMissingInfoClubs = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get('/api/admin/clubs-missing-info');
            setClubs(response.data);
        } catch (error) {
            console.error('Error fetching clubs with missing info:', error);
            setError('Failed to fetch clubs. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleReloadData = async (club) => {
        setUpdatingId(club.club_id);
        setError(null);
        try {
            const response = await axios.post('/api/admin/update-club-data', {
                clubId: club.club_id,
                clubName: club.club_name,
                countryName: club.country_name
            });

            if (response.data.success) {
                setClubs(prev => prev.filter(c => c.club_id !== club.club_id));
            } else {
                setError('Could not update club data (API might not have returned data).');
            }
        } catch (error) {
            console.error('Error updating club data:', error);
            setError(`Failed to update data: ${error.response?.data?.details || error.message}`);
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDeleteClick = (clubId) => {
        if (confirmDeleteId === clubId) {
            handleDelete(clubId);
        } else {
            setConfirmDeleteId(clubId);
            setTimeout(() => setConfirmDeleteId(prev => prev === clubId ? null : prev), 3000);
        }
    };

    const handleDelete = async (clubId) => {
        setDeletingId(clubId);
        setConfirmDeleteId(null);
        setError(null);

        try {
            await axios.post('/api/admin/delete-club', { clubId });
            setClubs(prev => prev.filter(c => c.club_id !== clubId));
        } catch (error) {
            console.error('Error deleting club:', error);
            setError('Failed to delete club.');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="missing-info-page">
            <h2>Clubs with Missing Information</h2>
            <p className="page-description">
                These clubs are missing key details like stadium, city, or foundation year.
            </p>

            {error && (
                <div className="error-message" style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    borderRadius: '0.375rem',
                    border: '1px solid #fecaca'
                }}>
                    {error}
                </div>
            )}

            <div className="duplicates-list">
                {loading && <div>Loading...</div>}

                {!loading && clubs.length === 0 && !error && (
                    <div className="success-message">No clubs found with significant missing info!</div>
                )}

                {clubs.map(club => (
                    <div key={club.club_id} className="duplicate-card">
                        <div className="duplicate-pair">
                            <div className="club-item" style={{ flex: '0 0 auto', width: '100%' }}>
                                <span className="club-id">#{club.club_id}</span>
                                {club.club_logo_url && <img src={club.club_logo_url} alt="" className="club-logo" />}
                                <div className="club-details-col">
                                    <span className="club-name">{club.club_name}</span>
                                    <span className="club-meta">{club.country_name}</span>
                                    <div className="missing-tags">
                                        {!club.stadium_name && <span className="badge warning">No Stadium</span>}
                                        {!club.city && <span className="badge warning">No City</span>}
                                        {!club.founded_year && <span className="badge warning">No Founded Year</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="merge-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                className="btn-primary"
                                onClick={() => handleReloadData(club)}
                                disabled={updatingId === club.club_id || deletingId === club.club_id}
                            >
                                {updatingId === club.club_id ? 'Updating...' : 'Reload Data'}
                            </button>
                            <button
                                className="btn-secondary"
                                style={{
                                    backgroundColor: confirmDeleteId === club.club_id ? '#dc2626' : '#fee2e2',
                                    color: confirmDeleteId === club.club_id ? '#ffffff' : '#dc2626',
                                    borderColor: confirmDeleteId === club.club_id ? '#dc2626' : '#fecaca',
                                    transition: 'all 0.2s',
                                    minWidth: '80px'
                                }}
                                onClick={() => handleDeleteClick(club.club_id)}
                                disabled={updatingId === club.club_id || deletingId === club.club_id}
                            >
                                {deletingId === club.club_id ? 'Deleting...' : confirmDeleteId === club.club_id ? 'Confirm?' : 'Delete'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MissingInfo;
