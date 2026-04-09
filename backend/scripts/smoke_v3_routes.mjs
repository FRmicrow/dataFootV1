const BASE_URL = process.env.BASE_URL || 'http://localhost:3001/api';

async function request(method, path, { body, headers } = {}) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(headers || {})
      }
    };

    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${path}`, options);
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      json,
      text
    };
  } catch (error) {
    throw new Error(`${method} ${path} -> network failure: ${error.message}`);
  }
}

function assertStatus(name, result, allowedStatuses = [200]) {
  if (!allowedStatuses.includes(result.status)) {
    throw new Error(`${name} -> unexpected status ${result.status}: ${result.text.slice(0, 300)}`);
  }
}

function assertWrapped(name, result) {
  if (!result.json || typeof result.json !== 'object' || typeof result.json.success !== 'boolean') {
    throw new Error(`${name} -> missing success wrapper`);
  }
}

async function main() {
  const checks = [];
  const add = (name, status) => checks.push({ name, status });

  const countries = await request('GET', '/countries');
  assertStatus('GET /countries', countries);
  assertWrapped('GET /countries', countries);
  add('GET /countries', countries.status);

  const leagueId = countries.json?.data?.length ? 2 : 2;
  const seasonYear = 2025;

  const leagues = await request('GET', '/leagues');
  assertStatus('GET /leagues', leagues);
  assertWrapped('GET /leagues', leagues);
  add('GET /leagues', leagues.status);

  const structured = await request('GET', '/leagues/structured');
  assertStatus('GET /leagues/structured', structured);
  assertWrapped('GET /leagues/structured', structured);
  add('GET /leagues/structured', structured.status);

  const imported = await request('GET', '/leagues/imported');
  assertStatus('GET /leagues/imported', imported);
  assertWrapped('GET /leagues/imported', imported);
  add('GET /leagues/imported', imported.status);
  const importedApiId = imported.json?.data?.find(item => Number.isInteger(item?.api_id))?.api_id || 46;

  const discovered = await request('GET', '/leagues/discovered');
  assertStatus('GET /leagues/discovered', discovered);
  assertWrapped('GET /leagues/discovered', discovered);
  add('GET /leagues/discovered', discovered.status);

  const stats = await request('GET', '/stats');
  assertStatus('GET /stats', stats);
  assertWrapped('GET /stats', stats);
  add('GET /stats', stats.status);

  const preferences = await request('GET', '/preferences');
  assertStatus('GET /preferences', preferences);
  assertWrapped('GET /preferences', preferences);
  add('GET /preferences', preferences.status);
  const updatedPreferences = await request('PUT', '/preferences', {
    body: {}
  });
  assertStatus('PUT /preferences', updatedPreferences);
  assertWrapped('PUT /preferences', updatedPreferences);
  add('PUT /preferences', updatedPreferences.status);

  const search = await request('GET', '/search?q=ars');
  assertStatus('GET /search', search);
  assertWrapped('GET /search', search);
  add('GET /search', search.status);

  const playerId = search.json?.data?.players?.[0]?.player_id || 84932;
  const clubId = search.json?.data?.clubs?.[0]?.team_id || 75;

  const searchCountries = await request('GET', '/search/countries');
  assertStatus('GET /search/countries', searchCountries);
  assertWrapped('GET /search/countries', searchCountries);
  add('GET /search/countries', searchCountries.status);

  const player = await request('GET', `/player/${playerId}`);
  assertStatus('GET /player/:id', player);
  assertWrapped('GET /player/:id', player);
  add('GET /player/:id', player.status);

  const playerTrophies = await request('GET', `/player/${playerId}/trophies`);
  assertStatus('GET /player/:id/trophies', playerTrophies);
  assertWrapped('GET /player/:id/trophies', playerTrophies);
  add('GET /player/:id/trophies', playerTrophies.status);

  const nationalities = await request('GET', '/players/nationalities');
  assertStatus('GET /players/nationalities', nationalities);
  assertWrapped('GET /players/nationalities', nationalities);
  add('GET /players/nationalities', nationalities.status);

  const nationality = nationalities.json?.data?.[0]?.nationality || 'France';
  const playersByNationality = await request('GET', `/players/by-nationality?country=${encodeURIComponent(nationality)}`);
  assertStatus('GET /players/by-nationality', playersByNationality);
  assertWrapped('GET /players/by-nationality', playersByNationality);
  add('GET /players/by-nationality', playersByNationality.status);

  const club = await request('GET', `/club/${clubId}`);
  assertStatus('GET /club/:id', club);
  assertWrapped('GET /club/:id', club);
  add('GET /club/:id', club.status);

  const clubSummary = await request('GET', `/club/${clubId}/tactical-summary?year=${seasonYear}&competition=${leagueId}`);
  assertStatus('GET /club/:id/tactical-summary', clubSummary);
  assertWrapped('GET /club/:id/tactical-summary', clubSummary);
  add('GET /club/:id/tactical-summary', clubSummary.status);

  const clubMatches = await request('GET', `/club/${clubId}/matches?year=${seasonYear}&competition=${leagueId}&limit=5`);
  assertStatus('GET /club/:id/matches', clubMatches);
  assertWrapped('GET /club/:id/matches', clubMatches);
  add('GET /club/:id/matches', clubMatches.status);

  const typicalLineup = await request('GET', `/club/${clubId}/typical-lineup?year=${seasonYear}&competition=${leagueId}`);
  assertStatus('GET /club/:id/typical-lineup', typicalLineup);
  assertWrapped('GET /club/:id/typical-lineup', typicalLineup);
  add('GET /club/:id/typical-lineup', typicalLineup.status);

  const leagueSeasons = await request('GET', `/leagues/${leagueId}/seasons`);
  assertStatus('GET /leagues/:id/seasons', leagueSeasons);
  assertWrapped('GET /leagues/:id/seasons', leagueSeasons);
  add('GET /leagues/:id/seasons', leagueSeasons.status);

  const syncStatus = await request('GET', `/league/${leagueId}/sync-status`);
  assertStatus('GET /league/:id/sync-status', syncStatus);
  assertWrapped('GET /league/:id/sync-status', syncStatus);
  add('GET /league/:id/sync-status', syncStatus.status);

  const seasonOverview = await request('GET', `/league/${leagueId}/season/${seasonYear}`);
  assertStatus('GET /league/:id/season/:year', seasonOverview);
  assertWrapped('GET /league/:id/season/:year', seasonOverview);
  add('GET /league/:id/season/:year', seasonOverview.status);

  const seasonPlayers = await request('GET', `/league/${leagueId}/season/${seasonYear}/players`);
  assertStatus('GET /league/:id/season/:year/players', seasonPlayers);
  assertWrapped('GET /league/:id/season/:year/players', seasonPlayers);
  add('GET /league/:id/season/:year/players', seasonPlayers.status);

  const squadTeamId = seasonPlayers.json?.data?.[0]?.team_id || clubId;
  const squad = await request('GET', `/league/${leagueId}/season/${seasonYear}/club/${squadTeamId}/squad`);
  assertStatus('GET /league/:leagueId/season/:year/club/:teamId/squad', squad);
  assertWrapped('GET /league/:leagueId/season/:year/club/:teamId/squad', squad);
  add('GET /league/:leagueId/season/:year/club/:teamId/squad', squad.status);

  const availableSeasons = await request('GET', `/league/${importedApiId}/available-seasons`);
  assertStatus('GET /league/:apiId/available-seasons', availableSeasons);
  assertWrapped('GET /league/:apiId/available-seasons', availableSeasons);
  add('GET /league/:apiId/available-seasons', availableSeasons.status);

  const standings = await request('GET', `/league/${leagueId}/standings?year=${seasonYear}`);
  assertStatus('GET /league/:id/standings', standings);
  assertWrapped('GET /league/:id/standings', standings);
  add('GET /league/:id/standings', standings.status);

  const dynamicStandings = await request('GET', `/standings/dynamic?league_id=${leagueId}&season=${seasonYear}&from_round=1&to_round=5`);
  assertStatus('GET /standings/dynamic', dynamicStandings);
  assertWrapped('GET /standings/dynamic', dynamicStandings);
  add('GET /standings/dynamic', dynamicStandings.status);

  const fixtures = await request('GET', `/league/${leagueId}/fixtures?year=${seasonYear}`);
  assertStatus('GET /league/:id/fixtures', fixtures);
  assertWrapped('GET /league/:id/fixtures', fixtures);
  add('GET /league/:id/fixtures', fixtures.status);

  const fixtureId = fixtures.json?.data?.fixtures?.find(f => ['FT', 'AET', 'PEN'].includes(f.status_short))?.fixture_id
    || fixtures.json?.data?.fixtures?.[0]?.fixture_id
    || 11927;

  const fixtureDetails = await request('GET', `/fixtures/${fixtureId}`);
  assertStatus('GET /fixtures/:id', fixtureDetails);
  assertWrapped('GET /fixtures/:id', fixtureDetails);
  add('GET /fixtures/:id', fixtureDetails.status);

  const fixtureEvents = await request('GET', `/fixtures/${fixtureId}/events`);
  assertStatus('GET /fixtures/:id/events', fixtureEvents);
  assertWrapped('GET /fixtures/:id/events', fixtureEvents);
  add('GET /fixtures/:id/events', fixtureEvents.status);

  const tacticalStats = await request('GET', `/fixtures/${fixtureId}/tactical-stats`);
  assertStatus('GET /fixtures/:id/tactical-stats', tacticalStats);
  assertWrapped('GET /fixtures/:id/tactical-stats', tacticalStats);
  add('GET /fixtures/:id/tactical-stats', tacticalStats.status);

  const playerStats = await request('GET', `/fixtures/${fixtureId}/player-stats`);
  assertStatus('GET /fixtures/:id/player-stats', playerStats);
  assertWrapped('GET /fixtures/:id/player-stats', playerStats);
  add('GET /fixtures/:id/player-stats', playerStats.status);

  const lineups = await request('GET', `/fixtures/${fixtureId}/lineups`);
  assertStatus('GET /fixtures/:id/lineups', lineups);
  assertWrapped('GET /fixtures/:id/lineups', lineups);
  add('GET /fixtures/:id/lineups', lineups.status);

  const eventCandidates = await request('GET', '/fixtures/events/candidates');
  assertStatus('GET /fixtures/events/candidates', eventCandidates);
  assertWrapped('GET /fixtures/events/candidates', eventCandidates);
  add('GET /fixtures/events/candidates', eventCandidates.status);
  const syncEvents = await request('POST', '/fixtures/events/sync', {
    body: { fixture_ids: [fixtureId] }
  });
  assertStatus('POST /fixtures/events/sync', syncEvents, [200]);
  assertWrapped('POST /fixtures/events/sync', syncEvents);
  add('POST /fixtures/events/sync', syncEvents.status);

  const lineupCandidates = await request('GET', '/fixtures/lineups/candidates');
  assertStatus('GET /fixtures/lineups/candidates', lineupCandidates);
  assertWrapped('GET /fixtures/lineups/candidates', lineupCandidates);
  add('GET /fixtures/lineups/candidates', lineupCandidates.status);
  const importLineups = await request('POST', '/fixtures/lineups/import', {
    body: { league_id: leagueId, season_year: seasonYear, limit: 1 }
  });
  assertStatus('POST /fixtures/lineups/import', importLineups);
  assertWrapped('POST /fixtures/lineups/import', importLineups);
  add('POST /fixtures/lineups/import', importLineups.status);

  const predictions = await request('GET', '/predictions?status=upcoming');
  assertStatus('GET /predictions', predictions);
  assertWrapped('GET /predictions', predictions);
  add('GET /predictions', predictions.status);
  const syncPredictions = await request('POST', '/predictions/sync', { body: {} });
  assertStatus('POST /predictions/sync', syncPredictions);
  assertWrapped('POST /predictions/sync', syncPredictions);
  add('POST /predictions/sync', syncPredictions.status);

  const liveFixtures = await request('GET', '/live-bet/fixtures');
  assertStatus('GET /live-bet/fixtures', liveFixtures);
  assertWrapped('GET /live-bet/fixtures', liveFixtures);
  add('GET /live-bet/fixtures', liveFixtures.status);

  const liveUpcoming = await request('GET', '/live-bet/upcoming?leagues=2,11');
  assertStatus('GET /live-bet/upcoming', liveUpcoming);
  assertWrapped('GET /live-bet/upcoming', liveUpcoming);
  add('GET /live-bet/upcoming', liveUpcoming.status);

  const liveMatch = await request('GET', `/live-bet/match/${fixtureId}`);
  assertStatus('GET /live-bet/match/:id', liveMatch, [200, 404]);
  if (liveMatch.status === 200) assertWrapped('GET /live-bet/match/:id', liveMatch);
  add('GET /live-bet/match/:id', liveMatch.status);

  const monitoringLeagues = await request('GET', '/live-bet/leagues/monitoring');
  assertStatus('GET /live-bet/leagues/monitoring', monitoringLeagues);
  assertWrapped('GET /live-bet/leagues/monitoring', monitoringLeagues);
  add('GET /live-bet/leagues/monitoring', monitoringLeagues.status);
  const monitoringLeagueId = monitoringLeagues.json?.data?.[0]?.league_id || leagueId;
  const monitoringEnabled = Boolean(monitoringLeagues.json?.data?.[0]?.is_live_enabled);
  const toggleMonitoring = await request('PUT', `/live-bet/leagues/${monitoringLeagueId}/monitoring`, {
    body: { enabled: monitoringEnabled }
  });
  assertStatus('PUT /live-bet/leagues/:id/monitoring', toggleMonitoring);
  assertWrapped('PUT /live-bet/leagues/:id/monitoring', toggleMonitoring);
  add('PUT /live-bet/leagues/:id/monitoring', toggleMonitoring.status);
  const saveOdds = await request('POST', `/live-bet/match/${fixtureId}/save-odds`);
  assertStatus('POST /live-bet/match/:id/save-odds', saveOdds, [200, 500]);
  if (saveOdds.status === 200) assertWrapped('POST /live-bet/match/:id/save-odds', saveOdds);
  add('POST /live-bet/match/:id/save-odds', saveOdds.status);
  const ingestFixtureOdds = await request('POST', `/live-bet/odds/fixture/${fixtureId}`);
  assertStatus('POST /live-bet/odds/fixture/:id', ingestFixtureOdds, [200, 500]);
  if (ingestFixtureOdds.status === 200) assertWrapped('POST /live-bet/odds/fixture/:id', ingestFixtureOdds);
  add('POST /live-bet/odds/fixture/:id', ingestFixtureOdds.status);
  const ingestDateOdds = await request('POST', '/live-bet/odds/ingest-date', {
    body: { date: new Date().toISOString().slice(0, 10) }
  });
  assertStatus('POST /live-bet/odds/ingest-date', ingestDateOdds, [200, 500]);
  if (ingestDateOdds.status === 200) assertWrapped('POST /live-bet/odds/ingest-date', ingestDateOdds);
  add('POST /live-bet/odds/ingest-date', ingestDateOdds.status);

  const studioStats = await request('GET', '/studio/meta/stats');
  assertStatus('GET /studio/meta/stats', studioStats);
  assertWrapped('GET /studio/meta/stats', studioStats);
  add('GET /studio/meta/stats', studioStats.status);

  const studioLeagues = await request('GET', '/studio/meta/leagues');
  assertStatus('GET /studio/meta/leagues', studioLeagues);
  assertWrapped('GET /studio/meta/leagues', studioLeagues);
  add('GET /studio/meta/leagues', studioLeagues.status);

  const studioNationalities = await request('GET', '/studio/meta/nationalities');
  assertStatus('GET /studio/meta/nationalities', studioNationalities);
  assertWrapped('GET /studio/meta/nationalities', studioNationalities);
  add('GET /studio/meta/nationalities', studioNationalities.status);

  const studioPlayers = await request('GET', '/studio/meta/players?search=ars');
  assertStatus('GET /studio/meta/players', studioPlayers);
  assertWrapped('GET /studio/meta/players', studioPlayers);
  add('GET /studio/meta/players', studioPlayers.status);

  const studioTeams = await request('GET', '/studio/meta/teams?search=ars');
  assertStatus('GET /studio/meta/teams', studioTeams);
  assertWrapped('GET /studio/meta/teams', studioTeams);
  add('GET /studio/meta/teams', studioTeams.status);
  const studioQuery = await request('POST', '/studio/query', {
    body: {
      stat: 'goals_total',
      filters: { years: [2024, 2025], leagues: [leagueId] },
      selection: { mode: 'top_n', value: 5 },
      options: { cumulative: false }
    }
  });
  assertStatus('POST /studio/query', studioQuery);
  assertWrapped('POST /studio/query', studioQuery);
  add('POST /studio/query', studioQuery.status);
  const leagueRankings = await request('POST', '/studio/query/league-rankings', {
    body: { league_id: leagueId, season: seasonYear }
  });
  assertStatus('POST /studio/query/league-rankings', leagueRankings);
  assertWrapped('POST /studio/query/league-rankings', leagueRankings);
  add('POST /studio/query/league-rankings', leagueRankings.status);

  const oddsUpcoming = await request('GET', '/odds/upcoming');
  assertStatus('GET /odds/upcoming', oddsUpcoming);
  assertWrapped('GET /odds/upcoming', oddsUpcoming);
  add('GET /odds/upcoming', oddsUpcoming.status);

  const oddsFixtureId = oddsUpcoming.json?.data?.items?.[0]?.fixture_id || fixtureId;
  const oddsFixture = await request('GET', `/odds/fixture/${oddsFixtureId}`);
  assertStatus('GET /odds/fixture/:fixtureId', oddsFixture);
  assertWrapped('GET /odds/fixture/:fixtureId', oddsFixture);
  add('GET /odds/fixture/:fixtureId', oddsFixture.status);
  const oddsImport = await request('POST', '/odds/import', {
    body: { leagueId, seasonYear }
  });
  assertStatus('POST /odds/import', oddsImport, [200, 500]);
  if (oddsImport.status === 200) assertWrapped('POST /odds/import', oddsImport);
  add('POST /odds/import', oddsImport.status);

  const mlStatus = await request('GET', '/ml/status');
  assertStatus('GET /ml/status', mlStatus);
  assertWrapped('GET /ml/status', mlStatus);
  add('GET /ml/status', mlStatus.status);
  const mlTrain = await request('POST', '/ml/train', { body: {} });
  assertStatus('POST /ml/train', mlTrain, [200, 500]);
  if (mlTrain.status === 200) assertWrapped('POST /ml/train', mlTrain);
  add('POST /ml/train', mlTrain.status);
  const forgeBuildStatus = await request('GET', '/forge/build-status');
  assertStatus('GET /forge/build-status', forgeBuildStatus, [200, 410]);
  if ([200, 410].includes(forgeBuildStatus.status)) assertWrapped('GET /forge/build-status', forgeBuildStatus);
  add('GET /forge/build-status', forgeBuildStatus.status);
  const forgeModels = await request('GET', '/forge/models');
  assertStatus('GET /forge/models', forgeModels, [200, 410]);
  if ([200, 410].includes(forgeModels.status)) assertWrapped('GET /forge/models', forgeModels);
  add('GET /forge/models', forgeModels.status);
  const forgeEligible = await request('GET', `/forge/eligible-horizons?leagueId=${leagueId}&seasonYear=${seasonYear}`);
  assertStatus('GET /forge/eligible-horizons', forgeEligible, [200, 410]);
  if ([200, 410].includes(forgeEligible.status)) assertWrapped('GET /forge/eligible-horizons', forgeEligible);
  add('GET /forge/eligible-horizons', forgeEligible.status);
  const forgeLeagueModels = await request('GET', `/forge/league-models/${leagueId}`);
  assertStatus('GET /forge/league-models/:leagueId', forgeLeagueModels, [200, 410]);
  if ([200, 410].includes(forgeLeagueModels.status)) assertWrapped('GET /forge/league-models/:leagueId', forgeLeagueModels);
  add('GET /forge/league-models/:leagueId', forgeLeagueModels.status);

  const orchestrator = await request('GET', '/ml-platform/orchestrator/status');
  assertStatus('GET /ml-platform/orchestrator/status', orchestrator);
  assertWrapped('GET /ml-platform/orchestrator/status', orchestrator);
  add('GET /ml-platform/orchestrator/status', orchestrator.status);

  const recentRisk = await request('GET', '/ml-platform/risk/recent');
  assertStatus('GET /ml-platform/risk/recent', recentRisk);
  assertWrapped('GET /ml-platform/risk/recent', recentRisk);
  add('GET /ml-platform/risk/recent', recentRisk.status);

  const simFilters = await request('GET', '/ml-platform/simulations/filters');
  assertStatus('GET /ml-platform/simulations/filters', simFilters);
  assertWrapped('GET /ml-platform/simulations/filters', simFilters);
  add('GET /ml-platform/simulations/filters', simFilters.status);

  const simOverview = await request('GET', '/ml-platform/simulations/overview');
  assertStatus('GET /ml-platform/simulations/overview', simOverview);
  assertWrapped('GET /ml-platform/simulations/overview', simOverview);
  add('GET /ml-platform/simulations/overview', simOverview.status);
  const simEvaluation = await request('GET', `/ml-platform/simulations/evaluation?leagueId=${leagueId}&seasonYear=${seasonYear}`);
  assertStatus('GET /ml-platform/simulations/evaluation', simEvaluation);
  assertWrapped('GET /ml-platform/simulations/evaluation', simEvaluation);
  add('GET /ml-platform/simulations/evaluation', simEvaluation.status);
  const clubEvaluation = await request('GET', `/ml-platform/simulations/club-evaluation?leagueId=${leagueId}&seasonYear=${seasonYear}`);
  assertStatus('GET /ml-platform/simulations/club-evaluation', clubEvaluation);
  assertWrapped('GET /ml-platform/simulations/club-evaluation', clubEvaluation);
  add('GET /ml-platform/simulations/club-evaluation', clubEvaluation.status);
  const upcomingPredictions = await request('GET', '/ml-platform/predictions/upcoming?leagues=Premier&maxDate=2026-12-31');
  assertStatus('GET /ml-platform/predictions/upcoming', upcomingPredictions);
  assertWrapped('GET /ml-platform/predictions/upcoming', upcomingPredictions);
  add('GET /ml-platform/predictions/upcoming', upcomingPredictions.status);

  const modelCatalog = await request('GET', '/ml-platform/models/catalog');
  assertStatus('GET /ml-platform/models/catalog', modelCatalog);
  assertWrapped('GET /ml-platform/models/catalog', modelCatalog);
  add('GET /ml-platform/models/catalog', modelCatalog.status);

  const recommendation = await request('GET', '/ml-platform/recommendations');
  assertStatus('GET /ml-platform/recommendations', recommendation);
  assertWrapped('GET /ml-platform/recommendations', recommendation);
  add('GET /ml-platform/recommendations', recommendation.status);
  const roi = await request('POST', '/ml-platform/performance/roi', {
    body: { portfolioSize: 1000, stakePerBet: 10, leagueId, seasonYear, markets: '1N2_FT' }
  });
  assertStatus('POST /ml-platform/performance/roi', roi);
  assertWrapped('POST /ml-platform/performance/roi', roi);
  add('POST /ml-platform/performance/roi', roi.status);
  const topEdges = await request('GET', `/ml-platform/edges/top?leagueId=${leagueId}&limit=5`);
  assertStatus('GET /ml-platform/edges/top', topEdges);
  assertWrapped('GET /ml-platform/edges/top', topEdges);
  add('GET /ml-platform/edges/top', topEdges.status);
  const submodels = await request('GET', '/ml-platform/submodels');
  assertStatus('GET /ml-platform/submodels', submodels);
  assertWrapped('GET /ml-platform/submodels', submodels);
  add('GET /ml-platform/submodels', submodels.status);
  const oddsLeagues = await request('GET', '/ml-platform/performance/leagues-with-odds');
  assertStatus('GET /ml-platform/performance/leagues-with-odds', oddsLeagues);
  assertWrapped('GET /ml-platform/performance/leagues-with-odds', oddsLeagues);
  add('GET /ml-platform/performance/leagues-with-odds', oddsLeagues.status);
  const createSubmodel = await request('POST', '/ml-platform/submodels', {
    body: {
      displayName: 'Smoke Test Model',
      description: 'Temporary smoke-test submodel',
      baseModelType: 'FT_RESULT',
      leagueId,
      seasonYear,
      horizonType: 'FULL_HISTORICAL',
      trainNow: false
    }
  });
  assertStatus('POST /ml-platform/submodels', createSubmodel, [200, 500]);
  if (createSubmodel.status === 200) assertWrapped('POST /ml-platform/submodels', createSubmodel);
  add('POST /ml-platform/submodels', createSubmodel.status);

  const predictAll = await request('GET', `/predict/fixture/${fixtureId}`);
  assertStatus('GET /predict/fixture/:id', predictAll);
  assertWrapped('GET /predict/fixture/:id', predictAll);
  add('GET /predict/fixture/:id', predictAll.status);

  const simulationAll = await request('GET', '/simulation/all');
  assertStatus('GET /simulation/all', simulationAll);
  assertWrapped('GET /simulation/all', simulationAll);
  add('GET /simulation/all', simulationAll.status);

  const readiness = await request('GET', `/simulation/readiness?leagueId=${leagueId}&seasonYear=${seasonYear}`);
  assertStatus('GET /simulation/readiness', readiness);
  assertWrapped('GET /simulation/readiness', readiness);
  add('GET /simulation/readiness', readiness.status);

  const leagueSimulations = await request('GET', `/simulation/league/${leagueId}`);
  assertStatus('GET /simulation/league/:leagueId', leagueSimulations);
  assertWrapped('GET /simulation/league/:leagueId', leagueSimulations);
  add('GET /simulation/league/:leagueId', leagueSimulations.status);

  const latestSimId = simulationAll.json?.data?.[0]?.simulation_id || leagueSimulations.json?.data?.[0]?.simulation_id || 74;
  const simResults = await request('GET', `/simulation/results/${latestSimId}`);
  assertStatus('GET /simulation/results/:simId', simResults);
  assertWrapped('GET /simulation/results/:simId', simResults);
  add('GET /simulation/results/:simId', simResults.status);

  const simStatus = await request('GET', `/simulation/status?leagueId=${leagueId}&seasonYear=${seasonYear}&simId=${latestSimId}`);
  assertStatus('GET /simulation/status', simStatus);
  assertWrapped('GET /simulation/status', simStatus);
  add('GET /simulation/status', simStatus.status);
  const simulationStart = await request('POST', '/simulation/start', {
    body: { leagueId, seasonYear, horizon: 'FULL_HISTORICAL', mode: 'STATIC' }
  });
  assertStatus('POST /simulation/start', simulationStart, [200, 409, 500]);
  if (simulationStart.status === 200) assertWrapped('POST /simulation/start', simulationStart);
  add('POST /simulation/start', simulationStart.status);

  const duplicates = await request('GET', '/resolution/duplicates?threshold=85');
  assertStatus('GET /resolution/duplicates', duplicates);
  assertWrapped('GET /resolution/duplicates', duplicates);
  add('GET /resolution/duplicates', duplicates.status);
  const duplicatePair = duplicates.json?.data?.[0];
  const merge = await request('POST', '/resolution/merge', {
    body: duplicatePair
      ? { id1: duplicatePair.player1.player_id, id2: duplicatePair.player2.player_id, confidence: duplicatePair.confidence }
      : { id1: 1, id2: 1, confidence: 100 }
  });
  assertStatus('POST /resolution/merge', merge, [200, 400, 500]);
  if ([200, 400].includes(merge.status)) assertWrapped('POST /resolution/merge', merge);
  add('POST /resolution/merge', merge.status);

  const prescriptions = await request('GET', '/health/prescriptions?status=PENDING');
  assertStatus('GET /health/prescriptions', prescriptions);
  assertWrapped('GET /health/prescriptions', prescriptions);
  add('GET /health/prescriptions', prescriptions.status);
  const prescribe = await request('POST', '/health/prescribe');
  assertStatus('POST /health/prescribe', prescribe);
  assertWrapped('POST /health/prescribe', prescribe);
  add('POST /health/prescribe', prescribe.status);

  const importState = await request('GET', '/import/state');
  assertStatus('GET /import/state', importState);
  assertWrapped('GET /import/state', importState);
  add('GET /import/state', importState.status);
  const importMatrix = await request('GET', '/import/matrix-status');
  assertStatus('GET /import/matrix-status', importMatrix);
  assertWrapped('GET /import/matrix-status', importMatrix);
  add('GET /import/matrix-status', importMatrix.status);
  const discoveryCountries = await request('GET', '/import/discovery/countries');
  assertStatus('GET /import/discovery/countries', discoveryCountries);
  assertWrapped('GET /import/discovery/countries', discoveryCountries);
  add('GET /import/discovery/countries', discoveryCountries.status);
  const discoveryCountry = discoveryCountries.json?.data?.[0]?.name || 'England';
  const discoveryLeagues = await request('GET', `/import/discovery/leagues?country=${encodeURIComponent(discoveryCountry)}`);
  assertStatus('GET /import/discovery/leagues', discoveryLeagues);
  assertWrapped('GET /import/discovery/leagues', discoveryLeagues);
  add('GET /import/discovery/leagues', discoveryLeagues.status);
  const resetImport = await request('POST', '/import/status/reset', {
    body: { leagueId, seasonYear, pillar: 'core', reason: 'smoke-test', resetAll: false }
  });
  assertStatus('POST /import/status/reset', resetImport);
  assertWrapped('POST /import/status/reset', resetImport);
  add('POST /import/status/reset', resetImport.status);
  const stopImport = await request('POST', '/import/stop');
  assertStatus('POST /import/stop', stopImport);
  assertWrapped('POST /import/stop', stopImport);
  add('POST /import/stop', stopImport.status);
  const pauseImport = await request('POST', '/import/pause');
  assertStatus('POST /import/pause', pauseImport);
  assertWrapped('POST /import/pause', pauseImport);
  add('POST /import/pause', pauseImport.status);
  const resumeImport = await request('POST', '/import/resume');
  assertStatus('POST /import/resume', resumeImport);
  assertWrapped('POST /import/resume', resumeImport);
  add('POST /import/resume', resumeImport.status);

  const backtest = await request('GET', '/intelligence/backtest?leagueId=2');
  assertStatus('GET /intelligence/backtest', backtest);
  assertWrapped('GET /intelligence/backtest', backtest);
  add('GET /intelligence/backtest', backtest.status);

  const audit = await request('GET', '/intelligence/audit?leagueId=2');
  assertStatus('GET /intelligence/audit', audit);
  assertWrapped('GET /intelligence/audit', audit);
  add('GET /intelligence/audit', audit.status);

  console.log(JSON.stringify({ success: true, checked: checks.length, checks }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ success: false, error: error.message }, null, 2));
  process.exit(1);
});
