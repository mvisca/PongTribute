import { useEffect, useState } from 'react';

interface Props {
	active: boolean;
	durationMs: number;
	color?: string;
	height?: string;
}

export default function TimeoutBar({ active, durationMs, color = 'bg-yellow-500', height = 'h-[2px]' }: Props) {
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
		<div className={`absolute bottom-0 left-0 right-0 ${height} z-50`}>
			<div
				className={`h-full ${color} ml-auto`}
				style={{
					width: started ? '0%' : '100%',
					transition: started ? `width ${durationMs}ms linear` : 'none',
				}}
			/>
		</div>
	);
}