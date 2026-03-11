import { create } from 'zustand';
import type { Toast, ToastAction } from './toast.types.js';
import { TOAST_TYPE, TOAST_VARIANT } from './toast.types.js';

interface ToastState {
	toasts: Toast[];
	dismiss: (id: string) => void;
	info: (message: string, duration?: number) => void;
	success: (message: string, duration?: number) => void;
	error: (message: string, duration?: number) => void;
	warning: (message: string, duration?: number) => void;
	action: (params: Omit<ToastAction, 'id' | 'variant'>) => void;
};

export const useToastStore = create<ToastState>((set) => ({
	toasts: [],

	dismiss: (id) => 
		set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),

	info: (message, duration = 3000) =>
		set((state) => ({ toasts: [...state.toasts, {
			id: crypto.randomUUID(),
			variant: TOAST_VARIANT.SIMPLE,
			type: TOAST_TYPE.INFO,
			message,
			duration
		}]})),
	
	success: (message, duration = 3000) => 
		set((state) => ({ toasts: [...state.toasts, {
			id: crypto.randomUUID(),
			variant: TOAST_VARIANT.SIMPLE,
			type: TOAST_TYPE.SUCCESS,
			message,
			duration
		}]})),
	
	error: (message, duration = 4000) => 
		set((state) => ({ toasts: [...state.toasts, {
			id: crypto.randomUUID(),
			variant: TOAST_VARIANT.SIMPLE,
			type: TOAST_TYPE.ERROR,
			message,
			duration
		}]})),
	
	warning: (message, duration = 3500) =>
		set((state) => ({ toasts: [...state.toasts, {
			id: crypto.randomUUID(),
			variant: TOAST_VARIANT.SIMPLE,
			type: TOAST_TYPE.WARNING,
			message,
			duration
		}]})),
	
	action: (params) =>
		set((state) => ({ toasts: [...state.toasts, {
			id: crypto.randomUUID(),
			variant: TOAST_VARIANT.ACTION,
			...params
		}]})),
}));