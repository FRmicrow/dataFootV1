import React, { useState, useMemo } from 'react';
import { IDEAS, getIdea } from './ideas';
import IdeaCard from './IdeaCard';
import IdeaDetail from './IdeaDetail';
import './IdeasHub.css';

/**
 * Hub des idées du jour — chaque carte = un contenu prêt à publier.
 * Sélection → détail à droite avec preview live + copies sociales.
 */
const IdeasHub = () => {
    const [selectedId, setSelectedId] = useState(IDEAS[0]?.id || null);
    const idea = useMemo(() => getIdea(selectedId), [selectedId]);

    const readyCount = useMemo(
        () => IDEAS.filter((i) => i.status === 'ready').length,
        [],
    );

    return (
        <div className="ihub">
            <aside className="ihub-rail">
                <header className="ihub-rail-head">
                    <span className="ihub-rail-eyebrow">Idées du jour</span>
                    <h3 className="ihub-rail-title">
                        {IDEAS.length} contenus préparés
                    </h3>
                    <p className="ihub-rail-sub">
                        <strong>{readyCount}</strong> prêts à publier · data V4 + copies FR/EN.
                    </p>
                </header>

                <ul className="ihub-rail-list">
                    {IDEAS.map((i) => (
                        <li key={i.id}>
                            <IdeaCard
                                idea={i}
                                isActive={i.id === selectedId}
                                onSelect={setSelectedId}
                            />
                        </li>
                    ))}
                </ul>

                <footer className="ihub-rail-foot">
                    Contenus générés à partir de{' '}
                    <code>content/hot-topics/2026-04-20/</code>.
                </footer>
            </aside>

            <main className="ihub-main">
                {idea ? (
                    <IdeaDetail idea={idea} />
                ) : (
                    <div className="ihub-empty">
                        Sélectionne une idée à gauche pour prévisualiser son template.
                    </div>
                )}
            </main>
        </div>
    );
};

export default IdeasHub;
