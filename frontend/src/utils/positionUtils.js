export const POSITION_MAP = {
    'Goalkeeper': 'G',
    'Defender': 'D',
    'Midfielder': 'M',
    'Attacker': 'A'
};

export const getShortPosition = (position) => {
    return POSITION_MAP[position] || position?.charAt(0) || '?';
};
