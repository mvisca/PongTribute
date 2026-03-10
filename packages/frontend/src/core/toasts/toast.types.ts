export const TOAST_TYPE = {
	INFO: 'info',
	SUCCESS: 'success',
	ERROR: 'error',
	WARNING: 'warning',
} as const;
export type ToastType = typeof TOAST_TYPE[keyof typeof TOAST_TYPE];

export const TOAST_BUTTON_STYLE = {
	PRIMARY: 'primary',
	DANGER: 'danger',
} as const;
export type ToastButtonStyle = typeof TOAST_BUTTON_STYLE[keyof typeof TOAST_BUTTON_STYLE];

export const TOAST_VARIANT = {
	SIMPLE: 'simple',
	ACTION: 'action',
} as const;
export type ToastVariant = typeof TOAST_VARIANT[keyof typeof TOAST_VARIANT];

export interface ToastButton {
	label: string;
	onClick: () => void;
	style?: ToastButtonStyle;
};

interface ToastBase {
	id: string;
	type: ToastType;
	message: string;
	duration: number // ms, 0 = no auto-dismiss
};

export interface ToastSimple extends ToastBase {
	variant: typeof TOAST_VARIANT.SIMPLE;
};

export interface ToastAction extends ToastBase {
	variant: typeof TOAST_VARIANT.ACTION;
	actions: ToastButton[];
	expiresAt?: number // timestamp Unix for countdown
};

export type Toast = ToastSimple | ToastAction;	