import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import api from '../../../../../services/api';

/**
 * MatchListPicker
 *
 * Liste les matchs à venir (v4.matches where match_date ≥ now) via le endpoint
 * V4 /v4/content/match-preview/upcoming et permet à l'utilisateur d'en
 * sélectionner un.
 *
 * Respecte la règle de fiabilité : aucune donnée inventée — si l'API renvoie
 * une liste vide, on affiche un message clair (pas de fallback silencieux).
 */
const DATE_LOCALE = 'fr-FR';
const DATE_FMT = new Intl.DateTimeFormat(DATE_LOCALE, {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return DATE_FMT.format(d);
}

function toIsoDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const MatchListPicker = ({ selectedMatchId, onSelect }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(14); // fenêtre de recherche

  // fromDate / toDate mémoïsés pour éviter loop infinie dans useEffect
  const { fromDate, toDate } = useMemo(() => {
    const now = new Date();
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return { fromDate: toIsoDate(now), toDate: toIsoDate(end) };
  }, [days]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const resp = await api.getUpcomingMatchesV4({
          limit: 40,
          fromDate,
          toDate,
        });
        // L'interceptor unwrap → resp = { matches, total, from_date, to_date }
        const list = Array.isArray(resp?.matches) ? resp.matches : [];
        if (!cancelled) {
          setMatches(list);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Impossible de charger les matchs à venir');
          setMatches([]);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fromDate, toDate]);

  return (
    <div className="mps-picker">
      <div className="mps-picker-header">
        <div>
          <div className="mps-picker-eyebrow">Source V4</div>
          <div className="mps-picker-title">Matchs à venir</div>
        </div>
        <div className="mps-picker-range">
          <label htmlFor="mps-picker-days">Fenêtre</label>
          <select
            id="mps-picker-days"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>7 jours</option>
            <option value={14}>14 jours</option>
            <option value={30}>30 jours</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="mps-picker-loading" role="status">
          Chargement des matchs V4…
        </div>
      )}

      {error && !loading && (
        <div className="mps-picker-error" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && matches.length === 0 && (
        <div className="mps-picker-empty">
          Aucun match programmé dans cette fenêtre (base V4).
        </div>
      )}

      {!loading && !error && matches.length > 0 && (
        <ul className="mps-picker-list">
          {matches.map((m) => {
            const isActive = String(m.match_id) === String(selectedMatchId);
            return (
              <li key={m.match_id}>
                <button
                  type="button"
                  className={`mps-picker-item ${isActive ? 'is-active' : ''}`}
                  onClick={() => onSelect(m.match_id)}
                >
                  <span className="mps-picker-item-date">{fmtDate(m.match_date)}</span>
                  <span className="mps-picker-item-comp">{m.competition_name}</span>
                  <span className="mps-picker-item-teams">
                    <span>{m.home_name}</span>
                    <span className="mps-picker-item-vs">vs</span>
                    <span>{m.away_name}</span>
                  </span>
                  {m.venue_name && (
                    <span className="mps-picker-item-venue">{m.venue_name}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

MatchListPicker.propTypes = {
  selectedMatchId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onSelect: PropTypes.func.isRequired,
};

export default MatchListPicker;
