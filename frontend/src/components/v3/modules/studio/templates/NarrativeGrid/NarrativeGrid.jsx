import React, { forwardRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import TemplateFrame from '../_shared/TemplateFrame';
import { assertValid } from '../_shared/validators';
import { contract } from './contract';
import demoData from './demo';
import NgVerticalStrip from './sublayouts/NgVerticalStrip';
import NgSquareGrid from './sublayouts/NgSquareGrid';
import NgHorizontalList from './sublayouts/NgHorizontalList';
import './NarrativeGrid.css';

/**
 * NarrativeGrid v2 — récap "10 derniers matchs" sans KPI inventé.
 *
 * Trois sublayouts spécialisés (un par aspect ratio) :
 *   - 9:16 → vertical strip (NgVerticalStrip)
 *   - 1:1  → square grid     (NgSquareGrid)
 *   - 16:9 → horizontal list (NgHorizontalList)
 *
 * Chaque sublayout reçoit le payload v2 `{ eyebrow, headline, subtitle,
 * summary, matches, takeaway, source, coverage }` et n'invente JAMAIS
 * de donnée manquante : si xG est null, le bloc xG est masqué ; si la
 * couverture est partielle, une bannière "Couverture incomplète" est
 * rendue.
 */
const SUBLAYOUTS = {
  '9:16': NgVerticalStrip,
  '1:1':  NgSquareGrid,
  '16:9': NgHorizontalList,
};

const NarrativeGrid = forwardRef(function NarrativeGrid(
  { data = demoData, theme = 'red-alert', fontPair, aspectRatio = '9:16', accent, scale },
  ref,
) {
  const safeData = useMemo(() => {
    assertValid(data, contract, 'NarrativeGrid');
    return data;
  }, [data]);

  const Sublayout = SUBLAYOUTS[aspectRatio] ?? SUBLAYOUTS['9:16'];

  return (
    <TemplateFrame
      ref={ref}
      theme={theme}
      fontPair={fontPair}
      aspectRatio={aspectRatio}
      accent={accent}
      scale={scale}
      className="narrative-grid"
    >
      <Sublayout
        eyebrow={safeData.eyebrow}
        headline={safeData.headline}
        subtitle={safeData.subtitle}
        summary={safeData.summary}
        matches={safeData.matches}
        takeaway={safeData.takeaway}
        source={safeData.source}
        coverage={safeData.coverage}
      />
    </TemplateFrame>
  );
});

NarrativeGrid.propTypes = {
  data: PropTypes.object,
  theme: PropTypes.string,
  fontPair: PropTypes.string,
  aspectRatio: PropTypes.oneOf(['9:16', '1:1', '16:9']),
  accent: PropTypes.string,
  scale: PropTypes.number,
};

export default NarrativeGrid;
