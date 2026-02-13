import { UserLogoutEvent, UserLoginEvent } from '../types/event.types.js';

export type UserEvent = UserLoginEvent | UserLogoutEvent;