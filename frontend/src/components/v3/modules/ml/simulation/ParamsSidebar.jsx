import React from 'react';
import PropTypes from 'prop-types';
import LeagueSelector from './LeagueSelector';
import ModelSection from './ModelSection';
import SimulationParams from './SimulationParams';
import ProgressMonitor from './ProgressMonitor';
import SystemStatus from './SystemStatus';

const ParamsSidebar = ({
    leagues,
    selectedLeague,
    onLeagueChange,
    onRefreshLeagues,
    onShowDiscovery,
    hasModels,
    leagueModels,
    isBuildingModels,
    buildStatus,
    onBuildModels,
    mlStatus,
    years,
    selectedYear,
    onYearChange,
    selectedMode,
    onModeChange,
    eligibleHorizons,
    selectedHorizon,
    onHorizonChange,
    readiness,
    loading,
    onRunSimulation,
    jobStatus,
    metrics
}) => {
    return (
        <aside className="sim-params-card">
            <h3>Simulation Protocol</h3>

            <LeagueSelector
                leagues={leagues}
                selectedLeague={selectedLeague}
                onLeagueChange={onLeagueChange}
                onRefreshLeagues={onRefreshLeagues}
                onShowDiscovery={onShowDiscovery}
                loading={loading}
            />

            <ModelSection
                hasModels={hasModels}
                leagueModels={leagueModels}
                isBuildingModels={isBuildingModels}
                buildStatus={buildStatus}
                onBuildModels={onBuildModels}
                mlStatus={mlStatus}
                disabled={!selectedLeague}
            />

            <SimulationParams
                selectedYear={selectedYear}
                onYearChange={onYearChange}
                years={years}
                selectedMode={selectedMode}
                onModeChange={onModeChange}
                selectedHorizon={selectedHorizon}
                onHorizonChange={onHorizonChange}
                eligibleHorizons={eligibleHorizons}
                readiness={readiness}
                loading={loading}
                onRunSimulation={onRunSimulation}
                metrics={metrics}
                hasModels={hasModels}
                disabled={!selectedLeague || !hasModels}
            />

            <ProgressMonitor jobStatus={jobStatus} />

            <SystemStatus mlStatus={mlStatus} />
        </aside>
    );
};

ParamsSidebar.propTypes = {
    leagues: PropTypes.array.isRequired,
    selectedLeague: PropTypes.string.isRequired,
    onLeagueChange: PropTypes.func.isRequired,
    onRefreshLeagues: PropTypes.func.isRequired,
    onShowDiscovery: PropTypes.func.isRequired,
    hasModels: PropTypes.bool.isRequired,
    leagueModels: PropTypes.array.isRequired,
    isBuildingModels: PropTypes.bool.isRequired,
    buildStatus: PropTypes.object,
    onBuildModels: PropTypes.func.isRequired,
    mlStatus: PropTypes.object,
    years: PropTypes.array.isRequired,
    selectedYear: PropTypes.string.isRequired,
    onYearChange: PropTypes.func.isRequired,
    selectedMode: PropTypes.string.isRequired,
    onModeChange: PropTypes.func.isRequired,
    eligibleHorizons: PropTypes.array.isRequired,
    selectedHorizon: PropTypes.string.isRequired,
    onHorizonChange: PropTypes.func.isRequired,
    readiness: PropTypes.object,
    loading: PropTypes.bool.isRequired,
    onRunSimulation: PropTypes.func.isRequired,
    jobStatus: PropTypes.object,
    metrics: PropTypes.object
};

export default ParamsSidebar;
