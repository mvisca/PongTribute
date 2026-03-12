import { useNavigate } from 'react-router-dom';
import { PageContainer, FormCard, LinkButton } from '../../../shared/components/ui';

export default function PrivacyPage() {
	const navigate = useNavigate();
	return (
		<PageContainer>
			<FormCard title='PRIVACY POLICY' wide>
				<div className='text-purple-300 text-xs leading-relaxed space-y-4'>
					<p>Transcendence is a project developed for educational purposes as part of ft_transcendence, belonging to the common core of school 42 Barcelona. This policy describes in simple terms how we handle data in the application.</p>

					<div>
						<p className='text-white font-bold mb-1'>What data we collect</p>
						<ul className='list-disc list-inside space-y-1'>
							<li>Email, username, and password (stored encrypted) to create and manage your account.</li>
							<li>Avatar (optional), stored via an external image hosting service.</li>
							<li>Game usage data (matches, results, friends) needed for the application to work.</li>
						</ul>
					</div>

					<div>
						<p className='text-white font-bold mb-1'>What we use it for</p>
						<ul className='list-disc list-inside space-y-1'>
							<li>To allow registration, login, and password recovery.</li>
							<li>To display your profile (username, avatar) and manage your friends list.</li>
							<li>To enable online matches, matchmaking, and local play.</li>
						</ul>
					</div>

					<div>
						<p className='text-white font-bold mb-1'>Who we share it with</p>
						<ul className='list-disc list-inside space-y-1'>
							<li>Data is used within the project. We do not sell or give your data to third parties for commercial purposes.</li>
							<li>Your avatar may be stored with an image hosting provider (e.g. Cloudinary).</li>
							<li>In an academic context, the project may be reviewed by teaching staff for assessment purposes.</li>
						</ul>
					</div>

					<div>
						<p className='text-white font-bold mb-1'>How we protect it</p>
						<p>Passwords are stored with secure hashing; communication uses HTTPS; we offer optional two-factor verification (2FA).</p>
					</div>

					<div>
						<p className='text-white font-bold mb-1'>Your rights</p>
						<p>You can request access, correction, or deletion of your data by contacting: <a href='mailto:pong.42.barcelona@gmail.com' className='text-purple-400 hover:text-white transition-colors'>pong.42.barcelona@gmail.com</a></p>
						<p className='mt-1'>If you delete your account, your email and associated data are permanently removed from our systems.</p>
					</div>

					<div>
						<p className='text-white font-bold mb-1'>Contact</p>
						<p>For questions about this policy: <a href='mailto:pong.42.barcelona@gmail.com' className='text-purple-400 hover:text-white transition-colors'>pong.42.barcelona@gmail.com</a></p>
					</div>
				</div>

				<div className='text-right mt-6'>
					<LinkButton onClick={() => navigate(-1)}>← Back</LinkButton>
				</div>
			</FormCard>
		</PageContainer>
	);
}