import { useEffect, useState } from 'react';

interface Props {
	active: boolean;
	durationMs: number;
}

export default function TimeoutBar({ active, durationMs }: Props) {
	const [started, setStarted] = useState(false);

	useEffect(() => {
		if (active) {
			// Small delay to ensure the browser renders at 100% before animating
			requestAnimationFrame(() => setStarted(true));
		} else {
			setStarted(false);
		}
	}, [active]);

	if (!active) return null;

	return (
		<div className='absolute bottom-0 left-0 right-0 h-[2px] z-50'>
			<div
				className='h-full bg-yellow-500 ml-auto'
				style={{
					width: started ? '0%' : '100%',
					transition: started ? `width ${durationMs}ms linear` : 'none',
				}}
			/>
		</div>
	);
}