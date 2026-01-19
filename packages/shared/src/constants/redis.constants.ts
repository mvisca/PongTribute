export const REDIS_CHANNELS = {
    EVENTS: 'transcendence:events' // Canal global de eventos
} as const;

export const REDIS_EVENTS = {
    USER_DISCONNECTED: 'user:disconnected' // El tipo de mensaje
} as const;