import { useEffect, useState } from "react";
import { useToastStore } from "./toastStore.js";
import type { Toast } from './toast.types';
import { TOAST_VARIANT, TOAST_TYPE, TOAST_BUTTON_STYLE} from './toast.types';

// Icons for severity
const ICONS: Record<string, string> = {
    [TOAST_TYPE.INFO]:    '🔔',  // 'ⓘ ℹ'
    [TOAST_TYPE.SUCCESS]: '✅',   // '✓ ✔'
    [TOAST_TYPE.ERROR]:   '❌', // '✕ 🚫'
    [TOAST_TYPE.WARNING]: '⚠️', // '⚠'
};

// Color for severity
const COLORS: Record<string, string> = {
    [TOAST_TYPE.INFO]:    'border-purple-500 bg-purple-950',
    [TOAST_TYPE.SUCCESS]: 'border-green-500 bg-green-950',
    [TOAST_TYPE.ERROR]:   'border-red-500 bg-red-950',
    [TOAST_TYPE.WARNING]: 'border-yellow-500 bg-yellow-950',
};

export function ToastItem({ toast }: { toast: Toast }) {
	const dismiss = useToastStore(s => s.dismiss);
	const [countdown, setCountdown] = useState<number | null>(null);

	// Auto-dismiss on duration
	useEffect(() => {
		// duration=0 equals "fixed" toast with actions
		if (toast.duration === 0) return;

		// Programs dismiss after 'duration' ms
		const timer = setTimeout(() => dismiss(toast.id), toast.duration);

		// Cleanup: if the toast is closed before the timeout, the timer is cancelled
		return () => clearTimeout(timer);
	}, [toast.id, toast.duration]);

	// Countdown for invitations with countdown
	useEffect(() => {
		// Only for action toasts with expiration timestamp
		if (toast.variant !== TOAST_VARIANT.ACTION || !toast.expiresAt) return;

		const tick = () => {
			// Calculate remaining seconds (roundUp)
			const remaining = Math.max(0, Math.ceil((toast.expiresAt! - Date.now()) / 1000));
			setCountdown(remaining);

			if (remaining === 0) dismiss(toast.id);
		};

		tick();
		const interval = setInterval(tick, 1000); // Updates every 1 second

		return () => clearInterval(interval);
	}, [toast.id]);

	return (
		<div className={`flex flex-col gap-2 p-3 rounded-lg border text-sm min-w-64 max-w-80 shadow-lg ${COLORS[toast.type]}`}>

			{/*Upper row, for every toast*/}
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-center gap-2">
					<span>{ICONS[toast.type]}</span>
					<span className="text-purple-100">{toast.message}</span>
				</div>
				<button
					onClick={() => dismiss(toast.id)}
					className="text-purple-400 hover:text-purple-200 shrink-0"
				>
					✕
				</button>
			</div>

			{/*Lower row, for action toasts only*/}
			{toast.variant === TOAST_VARIANT.ACTION && (
				<div className="flex gap-2 justify-end items-center">
					{countdown !== null && (
						<span className="text-xs text-purple-400">{countdown}</span>
					)}
					{/*Action buttons*/}
					{toast.actions.map((action, i) => (
						<button
							key={i}
							onClick={() => {
								action.onClick();
								dismiss(toast.id);
							}}
							className={
								action.style === TOAST_BUTTON_STYLE.DANGER
									? 'text-xs text-red-400 hover:text-red-200 px-2 py-1'
									: 'text-xs text-purple-300 hover:text-white border border-purple-500 px-2 py-1 rounded'
							}
						>
							{action.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
