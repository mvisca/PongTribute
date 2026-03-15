// packages/frontend/src/features/home/pages/TempPage.tsx
//Pagina temporal para alojar de momento el dashboard de friends
import { FriendsWidget } from '../../friends/components/FriendsWidget';

export default function TempPage() {
	return (
		<div className='retro-bg flex items-start justify-start p-3 h-full gap-4'>
			<FriendsWidget />
		</div>
	);
}
