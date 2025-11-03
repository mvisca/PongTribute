import { BaseEvent } from "./BaseEvent";
import { Types } from "../schemas";

export namespace UserEvent {
	/**
	* Evento: Usuario registrado exitosamente
	*/
	class Registered extends BaseEvent {
		constructor(public readonly user: Types.UserPublic) {
			super('user.registered', 'auth-service');
		}
		
		toJSON(): object {
			return {
				id: this.id,
				eventType: this.eventType,
				timestamp: this.timestamp,
				user: this.user
			};
		}
	}
	
	/**
	* Evento: Usuario inició sesión
	*/
	class LoggedIn extends BaseEvent {
		constructor(
			public readonly userId: string,
			public readonly alias: string
		) {
			super('user.logged_in', 'auth-service');
		}
		
		toJSON(): object {
			return {
				id: this.id,
				eventType: this.eventType,
				timestamp: this.timestamp,
				userId: this.userId,
				alias: this.alias
			};
		}
	}
	
	/**
	* Evento: Usuario cerró sesión
	*/
	class LoggedOut extends BaseEvent {
		constructor(public readonly userId: string) {
			super('user.logged_out', 'auth-service');
		}
		
		toJSON(): object {
			return {
				id: this.id,
				eventType: this.eventType,
				timestamp: this.timestamp,
				userId: this.userId
			};
		}
	}
	
	/**
	* Evento: Perfil de usuario actualizado
	*/
	class ProfileUpdated extends BaseEvent {
		constructor(
			public readonly userId: string,
			public readonly updatedFields: string[]
		) {
			super('user.profile_updated', 'user-service');
		}
		
		toJSON(): object {
			return {
				id: this.id,
				eventType: this.eventType,
				timestamp: this.timestamp,
				userId: this.userId,
				updatedFields: this.updatedFields
			};
		}
	}
	
	/**
	* Evento: Usuario cambió estado online/offline
	*/
	class StatusChanged extends BaseEvent {
		constructor(
			public readonly userId: string,
			public readonly isOnline: boolean
		) {
			super('user.status_changed', 'user-service');
		}
		
		toJSON(): object {
			return {
				id: this.id,
				eventType: this.eventType,
				timestamp: this.timestamp,
				userId: this.userId,
				isOnline: this.isOnline
			};
		}
	}
	
	/**
	* Evento: Usuario eliminado
	*/
	class Deleted extends BaseEvent {
		constructor(public readonly userId: string) {
			super('user.deleted', 'user-service');
		}
		
		toJSON(): object {
			return {
				id: this.id,
				eventType: this.eventType,
				timestamp: this.timestamp,
				userId: this.userId
			};
		}
	}
}