import { useNavigate } from 'react-router-dom';
import { PageContainer, FormCard, LinkButton } from '../../../shared/components/ui';

export default function TermsPage() {
	const navigate = useNavigate();
	return (
		<PageContainer>
			<FormCard title='TERMS OF SERVICE' wide>
				<div className='text-purple-300 text-xs leading-relaxed space-y-4'>
					<p>Transcendence is an educational project. By using the application you accept these terms.</p>

					<div>
						<p className='text-white font-bold mb-1'>Use of the service</p>
						<p>Transcendence is an online game with user accounts, matches (online, local, vs bot), matchmaking, and friends. By using it you agree to these terms.</p>
					</div>

					<div>
						<p className='text-white font-bold mb-1'>Responsibility</p>
						<p>You are responsible for the activity on your account and for using the service in a respectful manner. Keep your password confidential.</p>
					</div>

					<div>
						<p className='text-white font-bold mb-1'>Prohibitions</p>
						<p>Do not misuse the service, attempt to disrupt or alter it, or access it in an unauthorized way.</p>
					</div>

					<div>
						<p className='text-white font-bold mb-1'>Consequences</p>
						<p>Accounts may be suspended or removed if these terms are violated.</p>
					</div>

					<div>
						<p className='text-white font-bold mb-1'>Educational project</p>
						<p>This service is an academic project. It may be modified or discontinued at any time.</p>
					</div>

					<div>
						<p className='text-white font-bold mb-1'>Contact</p>
						<p>For questions about these terms: <a href='mailto:pong.42.barcelona@gmail.com' className='text-purple-400 hover:text-white transition-colors'>pong.42.barcelona@gmail.com</a></p>
					</div>
				</div>

				<div className='text-right mt-6'>
					<LinkButton onClick={() => navigate(-1)}>← Back</LinkButton>
				</div>
			</FormCard>
		</PageContainer>
	);
}
