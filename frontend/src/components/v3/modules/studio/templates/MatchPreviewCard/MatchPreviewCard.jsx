import React, { forwardRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import TemplateFrame from '../_shared/TemplateFrame';
import { assertValid } from '../_shared/validators';
import { contract } from './contract';
import demoData from './demo';
import './MatchPreviewCard.css';

// ─── Pure helpers (no hardcoded stats) ───────────────────────────────────────

const DATE_LOCALE = 'fr-FR';
const DAY_FORMATTER = new Intl.DateTimeFormat(DATE_LOCALE, {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});
const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat(DATE_LOCALE, {
  day: '2-digit', month: '2-digit', year: '2-digit',
});
const STAMP_FORMATTER = new Intl.DateTimeFormat(DATE_LOCALE, {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

function safeDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtLongDate(iso) {
  const d = safeDate(iso);
  return d ? DAY_FORMATTER.format(d) : '—';
}

function fmtShortDate(iso) {
  const d = safeDate(iso);
  return d ? SHORT_DATE_FORMATTER.format(d) : '—';
}

function fmtStamp(iso) {
  const d = safeDate(iso);
  return d ? STAMP_FORMATTER.format(d) : '—';
}

function pct(n) {
  if (!Number.isFinite(n)) return '—';
  return `${Math.round(n * 100)}%`;
}

function signedInt(n) {
  if (!Number.isFinite(n)) return '—';
  return n > 0 ? `+${n}` : String(n);
}

function monogram(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || '?').toUpperCase();
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const FormChips = ({ form }) => {
  const slots = 5;
  const items = Array.from({ length: slots }, (_, i) => form[i] || null);
  return (
    <div className="mpc-form">
      {items.map((v, i) => (
        <span
          key={`slot-${i}`}
          className={`mpc-form-chip mpc-form-chip-${v ? v.toLowerCase() : 'empty'}`}
          aria-label={v || 'no data'}
        >
          {v || '—'}
        </span>
      ))}
    </div>
  );
};

FormChips.propTypes = { form: PropTypes.array.isRequired };

const ClubHeader = ({ club, side }) => (
  <div className={`mpc-club mpc-club-${side}`}>
    <div className="mpc-club-logo" aria-hidden>
      {club.logo_url ? (
        <img src={club.logo_url} alt="" />
      ) : (
        <span className="mpc-club-logo-fallback">{monogram(club.name)}</span>
      )}
    </div>
    <div className="mpc-club-name tpl-display">{club.short_name || club.name}</div>
    <div className="mpc-club-sub tpl-soft">
      {club.standings ? `#${club.standings.position} · ${club.standings.points} pts` : 'Classement n/a'}
    </div>
  </div>
);

ClubHeader.propTypes = {
  club: PropTypes.object.isRequired,
  side: PropTypes.oneOf(['home', 'away']).isRequired,
};

const StatsTable = ({ home, away }) => {
  const rows = useMemo(() => {
    const hs = home.standings;
    const as = away.standings;
    return [
      {
        label: 'Points',
        home: hs ? String(hs.points) : '—',
        away: as ? String(as.points) : '—',
      },
      {
        label: 'Différence de buts',
        home: hs ? signedInt(hs.goal_diff) : '—',
        away: as ? signedInt(as.goal_diff) : '—',
      },
      {
        label: 'xG / match',
        home: Number.isFinite(home.season_xg_avg) ? home.season_xg_avg.toFixed(2) : '—',
        away: Number.isFinite(away.season_xg_avg) ? away.season_xg_avg.toFixed(2) : '—',
      },
      {
        label: 'Victoires à domicile',
        home: home.home_away_record ? pct(home.home_away_record.win_rate) : '—',
        away: '—', // semantic: away team's *away* record is the comparable one below
      },
      {
        label: "Victoires à l'extérieur",
        home: '—',
        away: away.home_away_record ? pct(away.home_away_record.win_rate) : '—',
      },
    ];
  }, [home, away]);

  return (
    <div className="mpc-stats tpl-reveal">
      {rows.map((r) => (
        <div key={r.label} className="mpc-stat-row">
          <div className="mpc-stat-cell mpc-stat-cell-home tpl-display">{r.home}</div>
          <div className="mpc-stat-cell mpc-stat-cell-label tpl-soft">{r.label}</div>
          <div className="mpc-stat-cell mpc-stat-cell-away tpl-display">{r.away}</div>
        </div>
      ))}
    </div>
  );
};

StatsTable.propTypes = {
  home: PropTypes.object.isRequired,
  away: PropTypes.object.isRequired,
};

const H2HBlock = ({ h2h, homeClubId }) => {
  if (!h2h || h2h.last_meetings.length === 0) {
    return (
      <div className="mpc-h2h mpc-h2h-empty tpl-reveal">
        <div className="mpc-section-title">Confrontations directes</div>
        <p className="mpc-h2h-empty-msg tpl-soft">
          Aucune confrontation directe enregistrée en base V4.
        </p>
      </div>
    );
  }

  return (
    <div className="mpc-h2h tpl-reveal">
      <div className="mpc-section-title">Dernières confrontations</div>
      <ul className="mpc-h2h-list">
        {h2h.last_meetings.slice(0, 3).map((m) => {
          const homeIsCurrentHome = String(m.home_name) && homeClubId; // used only for CSS hint
          return (
            <li key={m.match_id} className="mpc-h2h-item">
              <span className="mpc-h2h-date tpl-soft">{fmtShortDate(m.date)}</span>
              <span className="mpc-h2h-comp tpl-soft">{m.competition_name}</span>
              <span className="mpc-h2h-teams">
                <span className={`mpc-h2h-team ${homeIsCurrentHome ? '' : ''}`}>{m.home_name}</span>
                <span className="mpc-h2h-score tpl-display">
                  {m.home_score}–{m.away_score}
                </span>
                <span className="mpc-h2h-team">{m.away_name}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

H2HBlock.propTypes = {
  h2h: PropTypes.object,
  homeClubId: PropTypes.string,
};

const PredictionBlock = ({ prediction }) => {
  if (!prediction) {
    return (
      <div className="mpc-prediction mpc-prediction-empty tpl-reveal">
        <div className="mpc-section-title">Prédiction ML</div>
        <p className="mpc-prediction-empty-msg tpl-soft">
          Prédiction non disponible pour ce match (pipeline V4).
        </p>
      </div>
    );
  }

  const { probs, confidence_score, model_name } = prediction;
  const bars = [
    { key: 'home_win', label: '1', value: probs.home_win, color: 'home' },
    { key: 'draw', label: 'N', value: probs.draw, color: 'draw' },
    { key: 'away_win', label: '2', value: probs.away_win, color: 'away' },
  ];

  return (
    <div className="mpc-prediction tpl-reveal">
      <div className="mpc-section-title">Prédiction ML</div>
      <div className="mpc-prediction-bars">
        {bars.map((b) => (
          <div key={b.key} className={`mpc-prediction-bar mpc-prediction-bar-${b.color}`}>
            <div className="mpc-prediction-bar-label tpl-display">{b.label}</div>
            <div className="mpc-prediction-bar-track">
              <div
                className="mpc-prediction-bar-fill"
                style={{ width: `${Math.max(0, Math.min(100, b.value * 100))}%` }}
              />
            </div>
            <div className="mpc-prediction-bar-value tpl-display">{pct(b.value)}</div>
          </div>
        ))}
      </div>
      <div className="mpc-prediction-meta tpl-soft">
        Confiance {pct(confidence_score)} · modèle {model_name}
      </div>
    </div>
  );
};

PredictionBlock.propTypes = { prediction: PropTypes.object };

// ─── Main template ───────────────────────────────────────────────────────────

const MatchPreviewCard = forwardRef(function MatchPreviewCard(
  {
    data = demoData,
    theme = 'noir-gold',
    fontPair,
    aspectRatio = '9:16',
    accent,
    scale,
    brandLabel = 'statFoot V4',
  },
  ref,
) {
  const safe = useMemo(() => {
    assertValid(data, contract, 'MatchPreviewCard');
    return data;
  }, [data]);

  const gapsLabel = safe.data_gaps.length > 0
    ? `data_gaps: [${safe.data_gaps.join(', ')}]`
    : 'toutes sources disponibles';

  return (
    <TemplateFrame
      ref={ref}
      theme={theme}
      fontPair={fontPair}
      aspectRatio={aspectRatio}
      accent={accent}
      scale={scale}
      brandLabel={brandLabel}
      className="match-preview-card"
    >
      <header className="mpc-header tpl-reveal">
        <div className="mpc-header-comp">
          {safe.match.competition_logo ? (
            <img className="mpc-comp-logo" src={safe.match.competition_logo} alt="" />
          ) : (
            <span className="mpc-comp-logo mpc-comp-logo-fallback" aria-hidden>
              {monogram(safe.match.competition_name)}
            </span>
          )}
          <div className="mpc-header-comp-meta">
            <div className="mpc-comp-name tpl-display">{safe.match.competition_name}</div>
            <div className="mpc-comp-sub tpl-soft">
              {safe.match.matchday != null
                ? `Journée ${safe.match.matchday} · ${safe.match.season}`
                : safe.match.round_label || safe.match.season}
            </div>
          </div>
        </div>
        <div className="mpc-header-when">
          <div className="mpc-date tpl-display">{fmtLongDate(safe.match.match_date)}</div>
          <div className="mpc-kickoff tpl-soft">
            {safe.match.kickoff_time ? `Coup d'envoi ${safe.match.kickoff_time}` : 'Horaire non communiqué'}
            {safe.match.venue_name ? ` · ${safe.match.venue_name}` : ' · Stade non communiqué'}
          </div>
        </div>
      </header>

      <section className="mpc-versus tpl-reveal">
        <ClubHeader club={safe.home} side="home" />
        <div className="mpc-vs" aria-hidden>
          <span className="mpc-vs-text tpl-display">VS</span>
        </div>
        <ClubHeader club={safe.away} side="away" />
      </section>

      <section className="mpc-forms tpl-reveal">
        <div className="mpc-form-row">
          <span className="mpc-form-side tpl-soft">{safe.home.short_name || safe.home.name}</span>
          <FormChips form={safe.home.recent_form} />
        </div>
        <div className="mpc-form-row">
          <span className="mpc-form-side tpl-soft">{safe.away.short_name || safe.away.name}</span>
          <FormChips form={safe.away.recent_form} />
        </div>
      </section>

      <section className="mpc-section">
        <div className="mpc-section-title">Comparatif saison</div>
        <StatsTable home={safe.home} away={safe.away} />
      </section>

      <section className="mpc-section">
        <H2HBlock h2h={safe.h2h} homeClubId={safe.home.club_id} />
      </section>

      <section className="mpc-section">
        <PredictionBlock prediction={safe.prediction} />
      </section>

      <footer className="mpc-footer tpl-reveal">
        <div className="tpl-divider" />
        <div className="mpc-footer-source">
          <span className="mpc-footer-dot" aria-hidden />
          <span className="mpc-footer-text tpl-soft">
            Données au {fmtStamp(safe.generated_at)} · statFoot V4 · {gapsLabel}
          </span>
        </div>
      </footer>
    </TemplateFrame>
  );
});

MatchPreviewCard.propTypes = {
  data: PropTypes.object,
  theme: PropTypes.string,
  fontPair: PropTypes.string,
  aspectRatio: PropTypes.oneOf(['9:16', '1:1', '16:9']),
  accent: PropTypes.string,
  scale: PropTypes.number,
  brandLabel: PropTypes.string,
};

export default MatchPreviewCard;
