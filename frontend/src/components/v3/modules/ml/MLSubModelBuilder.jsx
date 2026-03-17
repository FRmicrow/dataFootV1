import React, { useState, useEffect, useCallback } from 'react';
import { Card, Badge, Button, Skeleton, Stack } from '../../../../design-system';
import api from '../../../../services/api';
import MLHubGlossaryFooter from './shared/MLHubGlossaryFooter';
import './MLSubModelBuilder.css';

const BASE_MODEL_OPTIONS = [
    { value: 'FT_RESULT',     label: '1X2 Full Time',   icon: '⚽' },
    { value: 'HT_RESULT',     label: '1X2 Half Time',   icon: '⏱️' },
    { value: 'CORNERS_TOTAL', label: 'Corners O/U 9.5', icon: '🚩' },
    { value: 'CARDS_TOTAL',   label: 'Cards O/U 3.5',   icon: '🟨' },
];

const HORIZON_OPTIONS = [
    { value: 'FULL_HISTORICAL', label: 'Historique complet' },
    { value: '5Y_ROLLING',      label: '5 ans glissants' },
    { value: '3Y_ROLLING',      label: '3 ans glissants' },
];

const STATUS_CONFIG = {
    draft:    { label: 'Draft',       color: 'default' },
    training: { label: 'Entraîn…',   color: 'warning' },
    trained:  { label: 'Entraîné',   color: 'success' },
    failed:   { label: 'Échec',      color: 'danger'  },
    deleted:  { label: 'Supprimé',   color: 'default' },
};

const SubModelCard = ({ model, onRetrain, onDelete }) => {
    const st = STATUS_CONFIG[model.status] ?? STATUS_CONFIG.draft;
    const baseModel = BASE_MODEL_OPTIONS.find(m => m.value === model.base_model_type);
    const metrics = model.metrics_json ? (typeof model.metrics_json === 'string' ? JSON.parse(model.metrics_json) : model.metrics_json) : null;

    return (
        <Card className="ml-submodel__card">
            <div className="ml-submodel__card-header">
                <span className="ml-submodel__card-icon">{baseModel?.icon ?? '🤖'}</span>
                <div className="ml-submodel__card-info">
                    <h3 className="ml-submodel__card-name">{model.display_name}</h3>
                    <div className="ml-submodel__card-badges">
                        <Badge variant={st.color}>{st.label}</Badge>
                        {baseModel && <Badge variant="default">{baseModel.label}</Badge>}
                        {model.league_name && <Badge variant="info">{model.league_name}</Badge>}
                    </div>
                </div>
            </div>

            {model.description && (
                <p className="ml-submodel__card-desc">{model.description}</p>
            )}

            <div className="ml-submodel__card-meta">
                <span>Horizon: {HORIZON_OPTIONS.find(h => h.value === model.horizon_type)?.label ?? model.horizon_type}</span>
                {model.season_year && <span>Saison: {model.season_year}</span>}
                {model.last_trained_at && (
                    <span>MAJ: {new Date(model.last_trained_at).toLocaleDateString('fr-FR')}</span>
                )}
            </div>

            {metrics && (
                <div className="ml-submodel__card-metrics">
                    {metrics.hit_rate != null && (
                        <div className="ml-submodel__metric">
                            <span className="ml-submodel__metric-label">Hit Rate</span>
                            <span className="ml-submodel__metric-value">{Math.round(metrics.hit_rate * 100)}%</span>
                        </div>
                    )}
                    {metrics.brier_score != null && (
                        <div className="ml-submodel__metric">
                            <span className="ml-submodel__metric-label">Brier</span>
                            <span className="ml-submodel__metric-value">{metrics.brier_score.toFixed(3)}</span>
                        </div>
                    )}
                    {metrics.samples != null && (
                        <div className="ml-submodel__metric">
                            <span className="ml-submodel__metric-label">Échantillons</span>
                            <span className="ml-submodel__metric-value">{metrics.samples.toLocaleString()}</span>
                        </div>
                    )}
                </div>
            )}

            {model.status === 'training' && (
                <div className="ml-submodel__training-indicator">
                    <span className="ml-submodel__training-dot" />
                    Entraînement en cours…
                </div>
            )}

            <div className="ml-submodel__card-actions">
                {model.league_id && model.status !== 'training' && (
                    <Button variant="secondary" size="sm" onClick={() => onRetrain(model)}>
                        🔄 Réentraîner
                    </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => onDelete(model.id)}>
                    🗑️ Supprimer
                </Button>
            </div>
        </Card>
    );
};

// ── Auto-naming helper ─────────────────────────────────────────────────────────
const MODEL_SHORT = { FT_RESULT: 'FT', HT_RESULT: 'HT', CORNERS_TOTAL: 'CRN', CARDS_TOTAL: 'CRD' };
const HORIZON_SHORT = { FULL_HISTORICAL: 'FULL', '5Y_ROLLING': '5Y', '3Y_ROLLING': '3Y' };

const buildStandardName = (baseModelType, leagueName, horizonType) => {
    if (!leagueName) return '';
    // Build a league code from the name: first 2-4 uppercase letters
    const words = leagueName.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(Boolean);
    const leagueCode = words.length === 1
        ? words[0].slice(0, 4).toUpperCase()
        : words.map(w => w[0]).join('').slice(0, 4).toUpperCase();
    const modelCode = MODEL_SHORT[baseModelType] ?? baseModelType;
    const horizonCode = HORIZON_SHORT[horizonType] ?? horizonType;
    return `${leagueCode}-${modelCode}-${horizonCode}`;
};

// ── Create Form ────────────────────────────────────────────────────────────────
const CreateSubmodelForm = ({ leagues, onCreated, onCancel }) => {
    const [form, setForm] = useState({
        displayName: '',
        description: '',
        baseModelType: 'FT_RESULT',
        leagueId: '',
        seasonYear: '',
        horizonType: 'FULL_HISTORICAL',
        trainNow: false,
    });
    const [nameLocked, setNameLocked] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const update = (field, value) => {
        setForm(prev => {
            const next = { ...prev, [field]: value };
            // Auto-update name unless user manually edited it
            if (!nameLocked && (field === 'baseModelType' || field === 'leagueId' || field === 'horizonType')) {
                const league = leagues.find(l => String(l.league_id) === String(field === 'leagueId' ? value : next.leagueId));
                next.displayName = buildStandardName(next.baseModelType, league?.name ?? '', next.horizonType);
            }
            return next;
        });
    };

    const submit = async (trainNow) => {
        if (!form.displayName.trim()) { setError('Le nom est requis.'); return; }
        setSaving(true);
        setError(null);
        try {
            const payload = {
                ...form,
                leagueId: form.leagueId ? parseInt(form.leagueId) : undefined,
                seasonYear: form.seasonYear ? parseInt(form.seasonYear) : undefined,
                trainNow,
            };
            const result = await api.createSubmodel(payload);
            onCreated(result);
        } catch (e) {
            setError(e.message ?? 'Erreur lors de la création.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card className="ml-submodel__create-form">
            <h3 className="ml-submodel__form-title">🧬 Nouveau Sub-Model</h3>

            {error && <p className="ml-submodel__form-error">⚠️ {error}</p>}

            <div className="ml-submodel__form-grid">
                <label className="ml-submodel__form-label">
                    Nom *
                    <input
                        className="ml-submodel__form-input"
                        placeholder="Auto-généré selon la sélection"
                        value={form.displayName}
                        onChange={e => { setNameLocked(true); setForm(p => ({ ...p, displayName: e.target.value })); }}
                        onFocus={() => setNameLocked(true)}
                    />
                    {!nameLocked && <span className="ml-submodel__form-hint">Sélectionne une ligue pour auto-générer le nom</span>}
                    {nameLocked && <button type="button" className="ml-submodel__reset-name" onClick={() => { setNameLocked(false); update('baseModelType', form.baseModelType); }}>↺ Regénérer</button>}
                </label>

                <label className="ml-submodel__form-label">
                    Description
                    <input
                        className="ml-submodel__form-input"
                        placeholder="Optionnel"
                        value={form.description}
                        onChange={e => update('description', e.target.value)}
                    />
                </label>

                <label className="ml-submodel__form-label">
                    Modèle de base *
                    <select className="ml-submodel__form-input" value={form.baseModelType} onChange={e => update('baseModelType', e.target.value)}>
                        {BASE_MODEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.icon} {o.label}</option>)}
                    </select>
                </label>

                <label className="ml-submodel__form-label">
                    Ligue (scope)
                    <select className="ml-submodel__form-input" value={form.leagueId} onChange={e => update('leagueId', e.target.value)}>
                        <option value="">— Toutes ligues (global) —</option>
                        {leagues.map(l => <option key={l.league_id} value={l.league_id}>{l.name}</option>)}
                    </select>
                </label>

                <label className="ml-submodel__form-label">
                    Saison (optionnel)
                    <input
                        className="ml-submodel__form-input"
                        type="number"
                        placeholder="ex: 2024"
                        min={2015} max={2030}
                        value={form.seasonYear}
                        onChange={e => update('seasonYear', e.target.value)}
                    />
                </label>

                <label className="ml-submodel__form-label">
                    Horizon d'entraînement
                    <select className="ml-submodel__form-input" value={form.horizonType} onChange={e => update('horizonType', e.target.value)}>
                        {HORIZON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </label>
            </div>

            <div className="ml-submodel__form-actions">
                <Button variant="ghost" onClick={onCancel} disabled={saving}>Annuler</Button>
                <Button variant="secondary" onClick={() => submit(false)} disabled={saving}>
                    Créer (draft)
                </Button>
                <Button variant="primary" onClick={() => submit(true)} disabled={saving || !form.leagueId}>
                    {saving ? 'Création…' : '🚀 Créer & Entraîner'}
                </Button>
            </div>
            {!form.leagueId && <p className="ml-submodel__form-hint">ℹ️ Sélectionne une ligue pour lancer l'entraînement immédiatement.</p>}
        </Card>
    );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const MLSubModelBuilder = () => {
    const [submodels, setSubmodels] = useState([]);
    const [leagues, setLeagues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState(null);

    const loadSubmodels = useCallback(() => {
        setLoading(true);
        api.getSubmodels()
            .then(data => setSubmodels(Array.isArray(data) ? data.filter(m => m.status !== 'deleted') : []))
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        loadSubmodels();
        // Also fetch leagues for the form
        api.getImportedLeagues()
            .then(data => setLeagues(Array.isArray(data) ? data : []))
            .catch(() => {});
    }, [loadSubmodels]);

    const handleCreated = (newModel) => {
        setSubmodels(prev => [newModel, ...prev]);
        setShowForm(false);
    };

    const handleDelete = async (id) => {
        try {
            await api.deleteSubmodel(id);
            setSubmodels(prev => prev.filter(m => m.id !== id));
        } catch (e) {
            setError(e.message);
        }
    };

    const handleRetrain = async (model) => {
        try {
            setSubmodels(prev => prev.map(m => m.id === model.id ? { ...m, status: 'training' } : m));
            await api.buildForgeModels({ leagueId: model.league_id, seasonYear: model.season_year });
        } catch (e) {
            setError(e.message);
            setSubmodels(prev => prev.map(m => m.id === model.id ? { ...m, status: 'failed' } : m));
        }
    };

    return (
        <div className="ml-submodel">
            <Card
                className="ml-submodel__error"
                title="Atelier avancé"
                subtitle="Toujours utile pour les expérimentations ciblées, mais désormais secondaire par rapport aux vues produit du ML Hub."
            >
                <p>
                    Utilise cette page pour les sous-modèles expérimentaux. Pour comprendre le système, lire les runs et suivre les ligues,
                    les pages principales sont maintenant plus adaptées.
                </p>
            </Card>
            <div className="ml-submodel__header">
                <div>
                    <h2 className="ml-submodel__title">🧬 Sub-Models</h2>
                    <p className="ml-submodel__subtitle">Modèles spécialisés sur des niches ou ligues spécifiques</p>
                </div>
                <Button variant="primary" onClick={() => setShowForm(true)} disabled={showForm}>
                    + Nouveau Sub-Model
                </Button>
            </div>

            {error && (
                <Card className="ml-submodel__error">⚠️ {error}</Card>
            )}

            {showForm && (
                <CreateSubmodelForm
                    leagues={leagues}
                    onCreated={handleCreated}
                    onCancel={() => setShowForm(false)}
                />
            )}

            {loading ? (
                <div className="ml-submodel__grid">
                    {[1,2,3].map(i => <Skeleton key={i} height="200px" />)}
                </div>
            ) : submodels.length === 0 && !showForm ? (
                <Card className="ml-submodel__empty">
                    <Stack direction="col" gap="sm" className="ds-items-center ds-text-center">
                        <span style={{ fontSize: '2.5rem' }}>🧬</span>
                        <p>Aucun sub-model créé.</p>
                        <p className="ml-submodel__empty-hint">
                            Crée un modèle spécialisé pour une ligue, une niche de marché,<br />
                            ou un contexte particulier (ex: "Ligue 1 Domicile FT").
                        </p>
                    </Stack>
                </Card>
            ) : (
                <div className="ml-submodel__grid">
                    {submodels.map(model => (
                        <SubModelCard
                            key={model.id}
                            model={model}
                            onRetrain={handleRetrain}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}
            <MLHubGlossaryFooter topic="models" />
        </div>
    );
};

export default MLSubModelBuilder;
