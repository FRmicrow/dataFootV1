import React from 'react';
import PropTypes from 'prop-types';
import { getTemplate } from '../templates';
import { themes } from '../templates/_shared/themes';

/**
 * Carte compacte d'une idée du jour.
 * Visuel thème-accentué pour que la DA saute aux yeux dès la liste.
 */
const IdeaCard = ({ idea, isActive, onSelect }) => {
    const tpl = getTemplate(idea.templateId);
    const theme = themes[idea.theme] || null;
    const accent = theme?.accent || 'var(--accent-primary)';

    return (
        <button
            type="button"
            className={`ihub-card ${isActive ? 'is-active' : ''}`}
            onClick={() => onSelect(idea.id)}
            style={{ '--ihub-card-accent': accent }}
        >
            <div className="ihub-card-stripe" aria-hidden />

            <header className="ihub-card-head">
                <span className={`ihub-card-status ihub-card-status--${idea.status}`}>
                    {idea.status === 'ready' && '● Prêt'}
                    {idea.status === 'draft' && '○ Draft'}
                    {idea.status === 'live' && '◆ Live'}
                </span>
                <span className="ihub-card-template">{tpl?.name || idea.templateId}</span>
            </header>

            <h4 className="ihub-card-title">{idea.title}</h4>
            <p className="ihub-card-sub">{idea.subtitle}</p>

            <footer className="ihub-card-foot">
                <span className="ihub-card-angle">{idea.hookAngle}</span>
                <span className="ihub-card-da" style={{ color: accent }}>
                    {theme?.label || '—'}
                </span>
            </footer>
        </button>
    );
};

IdeaCard.propTypes = {
    idea: PropTypes.object.isRequired,
    isActive: PropTypes.bool,
    onSelect: PropTypes.func.isRequired,
};

export default IdeaCard;
