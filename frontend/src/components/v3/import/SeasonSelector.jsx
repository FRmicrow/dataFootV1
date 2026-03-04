import React from 'react';

const SeasonSelector = ({
    availableSeasons,
    fromYear,
    setFromYear,
    toYear,
    setToYear,
    skipExisting,
    setSkipExisting,
    leagueSyncStatus,
    disabled
}) => {
    return (
        <div className="space-y-6 animate-slide-up">

            {/* Range Selectors */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">From Season</label>
                    <div className="relative">
                        <select
                            value={fromYear}
                            onChange={(e) => setFromYear(e.target.value)}
                            disabled={disabled}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50 appearance-none transition-colors"
                        >
                            <option value="">Start Year</option>
                            {availableSeasons.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">To Season</label>
                    <div className="relative">
                        <select
                            value={toYear}
                            onChange={(e) => setToYear(e.target.value)}
                            disabled={disabled}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50 appearance-none transition-colors"
                        >
                            <option value="">End Year</option>
                            {availableSeasons.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Availability Matrix */}
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Availability Status</label>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 p-1">
                    {leagueSyncStatus.map(s => {
                        const isFull = s.status === 'FULL';
                        const isPartial = s.status === 'PARTIAL' || s.status === 'PARTIAL_DISCOVERY';
                        const inRange = fromYear && toYear && s.year >= Math.min(fromYear, toYear) && s.year <= Math.max(fromYear, toYear);

                        return (
                            <div
                                key={s.year}
                                title={isFull ? "Fully Imported" : isPartial ? "Partially Imported" : "Not Imported"}
                                className={`
                                    relative flex flex-col items-center justify-center p-2 rounded-lg text-xs font-mono font-medium border transition-all cursor-default select-none
                                    ${isFull
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
                                        : isPartial
                                            ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400'
                                            : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500'
                                    }
                                    ${inRange ? 'ring-2 ring-blue-400 ring-offset-1 dark:ring-offset-slate-900 shadow-md transform scale-105' : 'opacity-80 hover:opacity-100'}
                                `}
                            >
                                <span className="text-[10px] mb-0.5 opacity-75">{isFull ? '✅' : isPartial ? '⚠️' : '⭕'}</span>
                                {s.year}
                                {s.is_current && (
                                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Skip Toggle */}
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/50">
                <input
                    type="checkbox"
                    id="skipExisting"
                    checked={skipExisting}
                    onChange={(e) => setSkipExisting(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600"
                />
                <label htmlFor="skipExisting" className="text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                    Skip years already fully imported
                </label>
            </div>

            {/* Sync Warning */}
            {(() => {
                if (!fromYear || !toYear) return null;
                const start = parseInt(fromYear);
                const end = parseInt(toYear);
                const alreadyInDb = leagueSyncStatus.filter(s =>
                    s.year >= Math.min(start, end) &&
                    s.year <= Math.max(start, end) &&
                    s.status === 'FULL'
                ).length;

                return alreadyInDb > 0 && !skipExisting ? (
                    <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded border border-amber-100 dark:border-amber-800">
                        <span>⚠️</span>
                        <span>Warning: {alreadyInDb} season(s) in range are already imported. Re-importing might duplicate data if not handled cleanly. Enable "Skip" to avoid this.</span>
                    </div>
                ) : null;
            })()}

        </div>
    );
};

export default SeasonSelector;
