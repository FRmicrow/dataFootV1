# BUG_28b_V3_FE_POC_Studio_Form_Flow_Fix

## Develop this feature as Frontend Agent - Following the US related:
`BUG_28b_V3_FE_POC_Studio_Form_Flow_Fix`

Complete rewrite of the Studio form logic to match the corrected backend data flow.

---

**Role**: Frontend Expert Agent  
**Objective**: Fix the form to use real V3 data endpoints with no mocks.

## 🐛 Bug Description
The original form implementation had placeholder dropdowns and incorrect data flow. This fix aligns with the new backend endpoints from `BUG_28a`.

## ✅ Correct Form Flow

### Phase 1: Form Initialization (componentDidMount)

#### 1. Load Available Stats
```javascript
useEffect(() => {
  fetch('/api/v3/studio/stats')
    .then(res => res.json())
    .then(data => setAvailableStats(data.stats));
}, []);
```
**Result**: Stat dropdown populated with real `V3_Player_Stats` columns (Goals, Assists, Rating, etc.)

#### 2. Load Countries Filter
```javascript
useEffect(() => {
  fetch('/api/v3/studio/countries')
    .then(res => res.json())
    .then(data => setCountries(data));
}, []);
```
**Result**: Countries checkbox list shows France, England, Spain, etc. (sorted by importance_rank)

#### 3. Load Leagues Filter (conditional)
```javascript
useEffect(() => {
  const params = selectedCountries.length > 0 
    ? `?country=${selectedCountries.join(',')}` 
    : '';
  fetch(`/api/v3/studio/leagues${params}`)
    .then(res => res.json())
    .then(data => setLeagues(data));
}, [selectedCountries]);
```
**Result**: Leagues checkbox list updates based on selected countries

### Phase 2: Form Layout

```jsx
<div className="studio-config-form">
  
  {/* Chart Type */}
  <div className="form-section">
    <label>Chart Type</label>
    <select value={chartType} onChange={e => setChartType(e.target.value)}>
      <option value="bar_race">Bar Chart Race</option>
      <option value="line_evolution">Line Evolution</option>
      <option value="radar">Radar Comparison</option>
    </select>
  </div>

  {/* Stat Selection */}
  <div className="form-section">
    <label>Stat to Track</label>
    <select value={selectedStat} onChange={e => setSelectedStat(e.target.value)}>
      <option value="">Select a stat...</option>
      {availableStats.map(s => (
        <option key={s.key} value={s.key}>{s.label}</option>
      ))}
    </select>
  </div>

  {/* Scope Filters */}
  <div className="form-section">
    <label>Filters (select at least one)</label>
    
    {/* Countries Checkbox Group */}
    <div className="filter-group">
      <label className="checkbox-label">
        <input 
          type="checkbox" 
          checked={filterByCountry}
          onChange={e => setFilterByCountry(e.target.checked)}
        />
        Filter by Country
      </label>
      {filterByCountry && (
        <div className="checkbox-list">
          {countries.map(c => (
            <label key={c.country_id}>
              <input 
                type="checkbox"
                value={c.name}
                checked={selectedCountries.includes(c.name)}
                onChange={e => handleCountryToggle(c.name)}
              />
              <img src={c.flag_url} alt={c.name} /> {c.name}
            </label>
          ))}
        </div>
      )}
    </div>

    {/* Leagues Checkbox Group */}
    <div className="filter-group">
      <label className="checkbox-label">
        <input 
          type="checkbox" 
          checked={filterByLeague}
          onChange={e => setFilterByLeague(e.target.checked)}
        />
        Filter by League
      </label>
      {filterByLeague && (
        <div className="checkbox-list">
          {leagues.map(l => (
            <label key={l.league_id}>
              <input 
                type="checkbox"
                value={l.league_id}
                checked={selectedLeagues.includes(l.league_id)}
                onChange={e => handleLeagueToggle(l.league_id)}
              />
              <img src={l.logo_url} alt={l.name} /> {l.name}
            </label>
          ))}
        </div>
      )}
    </div>
  </div>

  {/* Year Range */}
  <div className="form-section">
    <label>Year Range</label>
    <div className="year-range">
      <input 
        type="number" 
        value={yearStart} 
        onChange={e => setYearStart(e.target.value)}
        min="2000"
        max={new Date().getFullYear()}
      />
      <span>→</span>
      <input 
        type="number" 
        value={yearEnd} 
        onChange={e => setYearEnd(e.target.value)}
        min={yearStart}
        max={new Date().getFullYear()}
      />
    </div>
    <small>{yearEnd - yearStart + 1} years</small>
  </div>

  {/* Player Selection Mode */}
  {chartType !== 'radar' && (
    <div className="form-section">
      <label>Player Selection</label>
      
      <div className="radio-group">
        <label>
          <input 
            type="radio"
            name="selection_mode"
            value="top_n"
            checked={selectionMode === 'top_n'}
            onChange={e => setSelectionMode('top_n')}
          />
          Top N Players (by {availableStats.find(s => s.key === selectedStat)?.label})
        </label>
        {selectionMode === 'top_n' && (
          <div className="slider-container">
            <input 
              type="range"
              min="5"
              max="20"
              value={topN}
              onChange={e => setTopN(e.target.value)}
            />
            <span>{topN} players</span>
          </div>
        )}
      </div>

      <div className="radio-group">
        <label>
          <input 
            type="radio"
            name="selection_mode"
            value="manual"
            checked={selectionMode === 'manual'}
            onChange={e => setSelectionMode('manual')}
          />
          Manual Selection
        </label>
        {selectionMode === 'manual' && (
          <PlayerSearchAutocomplete 
            selectedStat={selectedStat}
            selectedLeagues={selectedLeagues}
            selectedCountries={selectedCountries}
            onSelect={handlePlayerSelect}
            selectedPlayers={selectedPlayers}
          />
        )}
      </div>
    </div>
  )}

  {/* Radar-specific: Player A vs Player B */}
  {chartType === 'radar' && (
    <div className="form-section">
      <label>Compare Players</label>
      <PlayerSearchAutocomplete 
        placeholder="Player A"
        onSelect={p => setPlayerA(p)}
      />
      <PlayerSearchAutocomplete 
        placeholder="Player B"
        onSelect={p => setPlayerB(p)}
      />
    </div>
  )}

  {/* Radar-specific: Configurable Stats */}
  {chartType === 'radar' && (
    <div className="form-section">
      <label>Radar Stats (select 3-8)</label>
      <div className="checkbox-list">
        {availableStats.filter(s => s.type === 'numeric').map(s => (
          <label key={s.key}>
            <input 
              type="checkbox"
              value={s.key}
              checked={radarStats.includes(s.key)}
              onChange={e => handleRadarStatToggle(s.key)}
              disabled={radarStats.length >= 8 && !radarStats.includes(s.key)}
            />
            {s.label}
          </label>
        ))}
      </div>
      <small>{radarStats.length} / 8 stats selected</small>
    </div>
  )}

  {/* Format Selection */}
  <div className="form-section">
    <label>Video Format</label>
    <div className="format-selector">
      <label className={format === '9:16' ? 'active' : ''}>
        <input type="radio" name="format" value="9:16" onChange={e => setFormat('9:16')} />
        📱 Vertical (TikTok/Reels)
      </label>
      <label className={format === '16:9' ? 'active' : ''}>
        <input type="radio" name="format" value="16:9" onChange={e => setFormat('16:9')} />
        🖥️ Horizontal (YouTube)
      </label>
      <label className={format === '1:1' ? 'active' : ''}>
        <input type="radio" name="format" value="1:1" onChange={e => setFormat('1:1')} />
        📷 Square (Instagram)
      </label>
    </div>
  </div>

  {/* Speed Control */}
  <div className="form-section">
    <label>Animation Speed</label>
    <input 
      type="range"
      min="0.5"
      max="3"
      step="0.1"
      value={speed}
      onChange={e => setSpeed(e.target.value)}
    />
    <span>{speed}x</span>
  </div>

  {/* Generate Button */}
  <button 
    className="btn-generate-preview"
    onClick={handleGenerate}
    disabled={!isFormValid()}
  >
    Generate Preview
  </button>
</div>
```

### Phase 3: Generate Preview Handler

```javascript
const handleGenerate = async () => {
  setIsGenerating(true);

  const payload = {
    chart_type: chartType,
    stat: selectedStat,
    leagues: filterByLeague ? selectedLeagues : null,
    countries: filterByCountry ? selectedCountries : null,
    year_start: parseInt(yearStart),
    year_end: parseInt(yearEnd),
    selection_mode: selectionMode,
    top_n: selectionMode === 'top_n' ? parseInt(topN) : null,
    players: selectionMode === 'manual' ? selectedPlayers.map(p => p.player_id) : null,
    format: format,
    speed: parseFloat(speed),
    // Radar-specific
    ...(chartType === 'radar' && {
      radar_stats: radarStats,
      season: parseInt(yearEnd) // Use the end year as the comparison season
    })
  };

  try {
    const res = await fetch('/api/v3/studio/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const chartData = await res.json();
    onChartDataReady(chartData); // Pass to parent component to render
    setIsGenerating(false);
  } catch (err) {
    console.error('Generation failed:', err);
    setIsGenerating(false);
  }
};
```

### Phase 4: Form Validation

```javascript
const isFormValid = () => {
  // Must select a stat
  if (!selectedStat) return false;

  // Must have at least one filter active
  const hasFilter = (filterByLeague && selectedLeagues.length > 0) ||
                    (filterByCountry && selectedCountries.length > 0);
  if (!hasFilter) return false;

  // Year range must be valid
  if (yearStart >= yearEnd) return false;

  // Radar-specific validation
  if (chartType === 'radar') {
    if (!playerA || !playerB) return false;
    if (radarStats.length < 3 || radarStats.length > 8) return false;
  }

  // Manual selection must have players
  if (selectionMode === 'manual' && selectedPlayers.length === 0) return false;

  return true;
};
```

## 🛠 New Component: PlayerSearchAutocomplete

```javascript
const PlayerSearchAutocomplete = ({ selectedStat, selectedLeagues, selectedCountries, onSelect, selectedPlayers }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (query.length < 2) return;

    const params = new URLSearchParams({
      stat: selectedStat,
      limit: 50
    });
    if (selectedLeagues?.length) params.append('leagues', selectedLeagues.join(','));
    if (selectedCountries?.length) params.append('countries', selectedCountries.join(','));

    fetch(`/api/v3/studio/players?${params}`)
      .then(res => res.json())
      .then(data => setResults(data));
  }, [query, selectedStat, selectedLeagues, selectedCountries]);

  return (
    <div className="player-autocomplete">
      <input 
        type="text"
        placeholder="Search players..."
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      {results.length > 0 && (
        <ul className="results-dropdown">
          {results.map(p => (
            <li key={p.player_id} onClick={() => onSelect(p)}>
              <img src={p.photo_url} alt={p.name} />
              <span>{p.name}</span>
              <small>{p.stat_value} {selectedStat}</small>
            </li>
          ))}
        </ul>
      )}
      {selectedPlayers?.length > 0 && (
        <div className="selected-chips">
          {selectedPlayers.map(p => (
            <span key={p.player_id} className="chip">
              {p.name} <button onClick={() => onRemove(p.player_id)}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
```

## ✅ Validation Rules
- [ ] At least one filter (League OR Country) must be active
- [ ] Year range: `year_start < year_end`
- [ ] Radar: 3-8 stats selected, Player A and Player B required
- [ ] Manual mode: At least 1 player selected
- [ ] Top N mode: Value between 5-20

## 🛠 Technical Notes
- **File**: `frontend/src/components/v3/ContentStudioV3.jsx`
- **Dependencies**: Requires `BUG_28a` (backend endpoints) to be completed first
- **No mocks**: All dropdowns populated from real API calls
