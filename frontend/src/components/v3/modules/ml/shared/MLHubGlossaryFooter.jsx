import React from 'react';
import PropTypes from 'prop-types';
import { Badge, Button, Card, Stack } from '../../../../../design-system';
import { useNavigate } from 'react-router-dom';
import { ML_GLOSSARY_GROUPS, ML_GLOSSARY_TERMS } from './mlGlossaryData';
import './MLHubGlossaryFooter.css';

const MLHubGlossaryFooter = ({ topic = 'analytics' }) => {
    const navigate = useNavigate();
    const terms = (ML_GLOSSARY_GROUPS[topic] || [])
        .map((key) => ML_GLOSSARY_TERMS[key])
        .filter(Boolean);

    if (!terms.length) return null;

    return (
        <Card
            className="ml-glossary-footer"
            title="Glossaire"
            subtitle="Les termes utiles pour lire cette page sans ambiguïté."
            extra={<Badge variant="neutral" size="sm">{terms.length} notions</Badge>}
        >
            <div className="ml-glossary-footer__grid">
                {terms.map((item) => (
                    <div key={item.term} className="ml-glossary-footer__term">
                        <strong>{item.term}</strong>
                        <p>{item.definition}</p>
                    </div>
                ))}
            </div>
            <Stack row justify="end" className="ml-glossary-footer__actions">
                <Button variant="ghost" onClick={() => navigate('/machine-learning/glossary')}>
                    Ouvrir le glossaire complet
                </Button>
            </Stack>
        </Card>
    );
};

MLHubGlossaryFooter.propTypes = {
    topic: PropTypes.oneOf(['models', 'performance', 'foresight', 'analytics']),
};

export default MLHubGlossaryFooter;
