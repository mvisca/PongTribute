import { useNavigate } from 'react-router-dom';
import { ArcadeButton, NeonButton } from '../../../shared/components/ui';

export default function PublicHomePage() {
	const navigate = useNavigate();

	return (
		<div className='retro-bg flex flex-col items-center justify-center min-h-screen gap-8 px-8'>
			<h1 className='text-2xl text-white text-purple-400' style={{ textShadow: '0 0 20px #a855f7' }}>PING🏓PONG</h1>
			<p className='text-purple-400'>42's famous Transcendence</p>
			
			<div className='relative w-64 h-40 border border-purple-600 overflow-hidden bg-purple-950/50'>
				<div className='absolute left-1/2 top-0 bottom-0 border-l-2 border-dashed border-purple-700' />
				<div className='absolute left-3 top-1/2 -translate-y-1/2 w-2 h-12 bg-purple-400 rounded' />
				<div className='absolute right-3 top-1/2 -translate-y-1/2 w-2 h-12 bg-purple-400 rounded' />
				<div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full'
					style={{ boxShadow: '0 0 8px #fff' }} />
				<span className='absolute top-2 left-1/4 text-xs text-purple-400 font-bold'>0</span>
				<span className='absolute top-2 right-1/4 text-xs text-purple-400 font-bold'>0</span>
			</div>

			<div className='flex flex-col gap-4 w-full max-w-xs'>
				<ArcadeButton onClick={() => navigate('/login')}>LOGIN</ArcadeButton>
				<NeonButton onClick={() => navigate('/register')}>REGISTER</NeonButton>
			</div>
		</div>
	);
}