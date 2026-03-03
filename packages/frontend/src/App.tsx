import { AppRouter } from './core/router/AppRouter';
import Navbar from './shared/components/Navbar';

export default function App() {
	return (
		<>
			<Navbar />
			<div className='pt-14'>
				<AppRouter />;
			</div>
		</>
	)
}