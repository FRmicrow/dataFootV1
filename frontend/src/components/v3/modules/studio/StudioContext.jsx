import React, { createContext, useContext, useState, useMemo } from 'react';
import PropTypes from 'prop-types';


const StudioContext = createContext();

export const useStudio = () => useContext(StudioContext);

export const StudioProvider = ({ children }) => {
    // Current active step
    const [step, setStep] = useState(1);

    // Loading & Error states
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // 1. Data Configuration (Input for Query)
    const [filters, setFilters] = useState({
        // Stat Key
        stat: '',

        // Logical Scope
        scopeType: 'league', // 'league' | 'country'
        leagues: [],         // Array of IDs
        countries: [],       // Array of Strings (Names)

        // Time Range
        years: [2015, 2024], // [min, max]

        // Selection Logic
        selection: {
            mode: 'top_n',   // 'top_n' | 'manual'
            value: 10,       // N
            players: []      // Array of IDs for manual
        },

        cumulative: true
    });

    // 2. Visual Configuration (For Renderer)
    const [visual, setVisual] = useState({
        type: 'bar_race',    // 'bar_race' | 'line' | 'radar'
        theme: 'v3_dark',    // 'v3_dark' | 'light' | 'neon'
        format: '9:16',      // '9:16' | '1:1' | '16:9'
        speed: 1.0           // Multiplier
    });

    // 3. Fetched Data (From Backend)
    // Should match the Data Contract: { meta: {...}, timeline: [...] }
    const [chartData, setChartData] = useState(null);

    // Navigation Helpers with Integrity Guards
    const nextStep = () => {
        if (step === 1 && !chartData) return;
        setStep(prev => Math.min(prev + 1, 4));
    };
    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));
    const goToStep = (s) => {
        if (s > 1 && !chartData) return;
        setStep(s);
    };

    // Atomic State Transition for Step 1 -> Step 2
    // Ensures all data is committed before navigation
    const finalizeStep1 = (data, updatedFilters, mode) => {
        // 1. Commit Data
        setChartData(data);

        // 2. Commit Metadata to Filters
        setFilters(prev => ({
            ...prev,
            ...updatedFilters,
            contextType: mode
        }));

        // 3. Trigger Navigation
        setStep(2);
        setIsLoading(false);
    };

    // Reset Flow
    const resetWizard = () => {
        setStep(1);
        setChartData(null);
        setError(null);
    };

    const contextValue = useMemo(() => ({
        step, setStep, nextStep, prevStep, goToStep, resetWizard,
        finalizeStep1,
        isLoading, setIsLoading,
        error, setError,
        filters, setFilters,
        visual, setVisual,
        chartData, setChartData
    }), [
        step, isLoading, error, filters, visual, chartData
    ]);

    return (
        <StudioContext.Provider value={contextValue}>
            {children}
        </StudioContext.Provider>
    );
};

StudioProvider.propTypes = {
    children: PropTypes.node.isRequired
};

