import React from 'react';

const LeagueSelector = ({
    countries,
    selectedCountry,
    setSelectedCountry,
    leagues,
    selectedLeague,
    setSelectedLeague,
    disabled
}) => {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    🌍 Select Country
                </label>
                <div className="relative">
                    <select
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                        disabled={disabled}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white appearance-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <option value="">-- Choose Country --</option>
                        {countries.map(c => (
                            <option key={c.name} value={c.name}>
                                {c.name} {c.code ? `(${c.code})` : ''}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className={`transition-opacity duration-300 ${!selectedCountry ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    🏆 Select League
                </label>
                <div className="relative">
                    <select
                        value={selectedLeague}
                        onChange={(e) => setSelectedLeague(e.target.value)}
                        disabled={disabled || !selectedCountry}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white appearance-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <option value="">-- Choose League --</option>
                        {leagues.map(l => (
                            <option key={l.league.id} value={l.league.id}>
                                {l.league.name}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeagueSelector;
