import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import MLPerformanceAnalyticsPage from '../../components/v3/modules/ml/MLPerformanceAnalyticsPage';
import MLForesightHub from '../../components/v3/modules/ml/MLForesightHub';
import api from '../../services/api';

// Mock API service
vi.mock('../../services/api', () => ({
    default: {
        getV4MLStats: vi.fn(),
        getV4ForesightCompetitions: vi.fn(),
        getV4ForesightMatches: vi.fn(),
    },
}));

// Mock react-router-dom hooks
vi.mock('react-router-dom', () => ({
    ...vi.importActual('react-router-dom'),
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/machine-learning/performance' }),
}));

describe('ML Hub V4 Components', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('MLPerformanceAnalyticsPage', () => {
        it('renders loading state then metrics', async () => {
            api.getV4MLStats.mockResolvedValueOnce({
                total_predictions: 5000,
                hit_rate: 0.7251,
                hit_rate_sample: 1000,
                covered_competitions: 15,
                upcoming_with_pred: 42,
                accuracy_by_competition: [],
                accuracy_by_confidence: []
            });

            render(<MLPerformanceAnalyticsPage />);
            
            // Should show skeletons initially (optional check)
            
            await waitFor(() => {
                expect(screen.getByText('72.5%')).toBeInTheDocument();
                expect(screen.getByText('5000')).toBeInTheDocument();
            });
        });

        it('renders error state on API failure', async () => {
            api.getV4MLStats.mockRejectedValueOnce(new Error('Failed to fetch'));

            render(<MLPerformanceAnalyticsPage />);

            await waitFor(() => {
                expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument();
            });
        });
    });

    describe('MLForesightHub', () => {
        it('renders Hero and Metric Strip', async () => {
            api.getV4ForesightCompetitions.mockResolvedValueOnce([]);
            api.getV4MLStats.mockResolvedValueOnce({
                hit_rate: 0.75,
                upcoming_with_pred: 100
            });

            render(<MLForesightHub />);

            expect(screen.getByText('Prédictions ML')).toBeInTheDocument();
            await waitFor(() => {
                expect(screen.getByText('75%')).toBeInTheDocument();
            });
        });
    });
});
