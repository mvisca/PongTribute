import { useToastStore } from './toastStore';
import { ToastItem } from './ToastItem';

export function ToastContainer() {
	const toasts = useToastStore(store => store.toasts);
	if (toasts.length === 0) return null;

	return (

		<div className='fixed bottom-4 right-4 flex flex-col gap-2 z-50'>
			{toasts.map(toast =>
				<ToastItem key={toast.id} toast={toast} />
			)}
		</div>
	);
}