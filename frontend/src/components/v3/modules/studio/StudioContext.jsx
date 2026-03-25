import { createContext, useContext, useState, useMemo } from 'react';
import PropTypes from 'prop-types';

const StudioContext = createContext();

export const useStudio = () => useContext(StudioContext);

export const StudioProvider = ({ children }) => {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const [filters, setFilters] = useState({
        stat: '',
        scopeType: 'league',
        leagues: [],
        countries: [],
        years: [2015, 2024],
        selection: {
            mode: 'top_n',
            value: 10,
            players: []
        }
    });

    const [visual, setVisual] = useState({
        type: 'bar_race',
        speed: 2.0
    });

    const [chartData, setChartData] = useState(null);

    const nextStep = () => {
        if (step === 1 && !chartData) return;
        setStep(prev => Math.min(prev + 1, 2));
    };
    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));
    const goToStep = (s) => {
        if (s > 1 && !chartData) return;
        setStep(s);
    };

    const finalizeStep1 = (data, updatedFilters, mode) => {
        setChartData(data);
        setFilters(prev => ({
            ...prev,
            ...updatedFilters,
            contextType: mode
        }));
        setStep(2);
        setIsLoading(false);
    };

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
