import { useNavigate } from 'react-router-dom';
import { PageContainer, FormCard, LinkButton } from '../../../shared/components/ui';

const mailLink = 'mailto:pong.42.barcelona@gmail.com';
const linkClass = 'text-purple-400 hover:text-white transition-colors';

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
							<li>Avatar (optional), stored and served via an external image hosting provider (Cloudinary).</li>
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
							<li>Your avatar images are stored and delivered by Cloudinary; see &quot;Third-party services&quot; below.</li>
							<li>In an academic context, the project may be reviewed by teaching staff or other students for assessment or educational purposes.</li>
						</ul>
					</div>

					<div>
						<p className='text-white font-bold mb-1'>Third-party services</p>
						<p className='mb-2'>The application loads resources from external providers. Those providers may receive technical data (such as your IP address, browser type, and the fact that you requested a resource) in accordance with their own privacy policies.</p>
						<ul className='list-disc list-inside space-y-1'>
							<li><strong>Cloudinary</strong> (res.cloudinary.com): We use Cloudinary to store and serve profile avatars (including a default avatar). When you view the site or upload an avatar, your browser may request images from Cloudinary. Their privacy policy: <a href='https://cloudinary.com/privacy' target='_blank' rel='noopener noreferrer' className={linkClass}>cloudinary.com/privacy</a>.</li>
							<li><strong>Google Fonts</strong> (fonts.googleapis.com, fonts.gstatic.com): We use Google Fonts to load typography (e.g. the &quot;Share Tech Mono&quot; font). When you load our pages, your browser may request font files from Google&apos;s servers. Google&apos;s privacy policy: <a href='https://policies.google.com/privacy' target='_blank' rel='noopener noreferrer' className={linkClass}>policies.google.com/privacy</a>.</li>
						</ul>
						<p className='mt-2'>If your browser blocks &quot;tracking content&quot; or third-party resources, fonts and avatars may not load correctly and the site&apos;s appearance or some features may be affected. You can manage this in your browser&apos;s privacy or protection settings.</p>
					</div>

					<div>
						<p className='text-white font-bold mb-1'>How we protect it</p>
						<p>Passwords are stored with secure hashing; communication uses HTTPS; we offer optional two-factor verification (2FA).</p>
					</div>

					<div>
						<p className='text-white font-bold mb-1'>Your rights</p>
						<p>You can request access, correction, or deletion of your data by contacting: <a href={mailLink} className={linkClass}>pong.42.barcelona@gmail.com</a></p>
						<p className='mt-1'>If you delete your account, your email and associated data are permanently removed from our systems. Avatar images stored with Cloudinary are removed in line with our data deletion process.</p>
					</div>

					<div>
						<p className='text-white font-bold mb-1'>Contact</p>
						<p>For questions about this policy: <a href={mailLink} className={linkClass}>pong.42.barcelona@gmail.com</a></p>
					</div>
				</div>

				<div className='text-right mt-6'>
					<LinkButton onClick={() => navigate(-1)}>← Back</LinkButton>
				</div>
			</FormCard>
		</PageContainer>
	);
}
