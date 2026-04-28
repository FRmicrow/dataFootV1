import PropTypes from 'prop-types';

export const summaryShape = PropTypes.shape({
  record: PropTypes.string,
  goals_for_total: PropTypes.number,
  goals_against_total: PropTypes.number,
  xg_for_avg: PropTypes.number,
  xg_against_avg: PropTypes.number,
});

export const matchShape = PropTypes.shape({
  opponent: PropTypes.string.isRequired,
  opponent_logo: PropTypes.string,
  isHome: PropTypes.bool.isRequired,
  result: PropTypes.oneOf(['W', 'D', 'L']).isRequired,
  score: PropTypes.shape({
    for: PropTypes.number.isRequired,
    against: PropTypes.number.isRequired,
  }).isRequired,
  xg: PropTypes.shape({
    for: PropTypes.number,
    against: PropTypes.number,
  }),
  meta: PropTypes.string,
  match_date: PropTypes.string,
});
