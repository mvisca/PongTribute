const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const host = window.location.host; // incluye puerto si hay

export const WS_COMMS_URL = `${protocol}//${host}/api/comms/ws`;
export const WS_GAME_URL  = `${protocol}//${host}/api/game/ws`;