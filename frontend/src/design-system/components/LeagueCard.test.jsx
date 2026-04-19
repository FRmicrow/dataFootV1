import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LeagueCard from './LeagueCard';

describe('LeagueCard', () => {
    const baseProps = {
        id: '1',
        name: 'Bundesliga',
        logo: 'https://example.com/bundesliga.png',
        countryName: 'Germany',
        countryFlag: 'https://example.com/de.png',
    };

    it('renders league card with basic props', () => {
        render(<LeagueCard {...baseProps} />);
        expect(screen.getByText('Bundesliga')).toBeInTheDocument();
        expect(screen.getByText('Germany')).toBeInTheDocument();
    });

    it('displays progress bar for league with current_matchday', () => {
        render(
            <LeagueCard
                {...baseProps}
                competition_type="league"
                current_matchday={32}
                total_matchdays={34}
            />
        );
        expect(screen.getByText('J32/34')).toBeInTheDocument();
        // Check that progress bar exists (query by className)
        const progressBar = document.querySelector('.ds-league-card-progress-bar-fill');
        expect(progressBar).toBeInTheDocument();
        // Check width is approximately 94% (32/34)
        expect(progressBar).toHaveStyle({ width: '94%' });
    });

    it('displays leader for league with leader data', () => {
        const leader = {
            club_id: '101',
            name: 'Bayern München',
            logo_url: 'https://example.com/bayern.png',
        };

        render(
            <LeagueCard
                {...baseProps}
                competition_type="league"
                current_matchday={32}
                total_matchdays={34}
                leader={leader}
            />
        );
        expect(screen.getByText('Leader:')).toBeInTheDocument();
        expect(screen.getByText('Bayern München')).toBeInTheDocument();
        const leaderLogos = screen.getAllByAltText('');
        const leaderLogo = leaderLogos.find(img => img.className.includes('ds-league-card-leader-logo'));
        expect(leaderLogo).toHaveClass('ds-league-card-leader-logo');
    });

    it('displays round label for cup', () => {
        render(
            <LeagueCard
                {...baseProps}
                competition_type="cup"
                latest_round_label="Quarter-finals"
            />
        );
        expect(screen.getByText('Quarter-finals')).toBeInTheDocument();
    });

    it('does not display progress bar for cup', () => {
        render(
            <LeagueCard
                {...baseProps}
                competition_type="cup"
                current_matchday={8}
                total_matchdays={16}
                latest_round_label="Quarter-finals"
            />
        );
        // Progress bar should not appear for cup
        const progressBar = document.querySelector('.ds-league-card-progress');
        expect(progressBar).not.toBeInTheDocument();
        // But round label should appear
        expect(screen.getByText('Quarter-finals')).toBeInTheDocument();
    });

    it('does not display leader for cup', () => {
        const leader = {
            club_id: '101',
            name: 'Bayern München',
            logo_url: 'https://example.com/bayern.png',
        };

        render(
            <LeagueCard
                {...baseProps}
                competition_type="cup"
                latest_round_label="Quarter-finals"
                leader={leader}
            />
        );
        // Leader should not appear for cup
        expect(screen.queryByText('Leader:')).not.toBeInTheDocument();
    });

    it('displays minimal card when no progression data', () => {
        render(
            <LeagueCard
                {...baseProps}
                competition_type="league"
                current_matchday={null}
                total_matchdays={null}
                leader={null}
            />
        );
        expect(screen.getByText('Bundesliga')).toBeInTheDocument();
        // No progress or leader sections
        expect(screen.queryByText(/^J\d+/)).not.toBeInTheDocument();
        expect(screen.queryByText('Leader:')).not.toBeInTheDocument();
    });

    it('truncates long league names with ellipsis', () => {
        render(
            <LeagueCard
                {...baseProps}
                name="This Is A Very Long League Name That Should Be Truncated"
            />
        );
        const nameElement = document.querySelector('.ds-league-card-name');
        expect(nameElement).toBeInTheDocument();
    });

    it('calculates progress percentage correctly', () => {
        const { rerender } = render(
            <LeagueCard
                {...baseProps}
                competition_type="league"
                current_matchday={1}
                total_matchdays={38}
            />
        );
        let progressBar = document.querySelector('.ds-league-card-progress-bar-fill');
        expect(progressBar).toHaveStyle({ width: '3%' }); // Math.round(1/38 * 100) = 3%

        rerender(
            <LeagueCard
                {...baseProps}
                competition_type="league"
                current_matchday={19}
                total_matchdays={38}
            />
        );
        progressBar = document.querySelector('.ds-league-card-progress-bar-fill');
        expect(progressBar).toHaveStyle({ width: '50%' }); // Math.round(19/38 * 100) = 50%
    });
});
