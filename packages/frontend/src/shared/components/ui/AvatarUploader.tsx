import { useEffect } from 'react';
import { useAvatarUpload } from '../../hooks/useAvatarUpload';
import AvatarDisplay from './AvatarDisplay';
import AlertError from './AlertError';

interface Props {
	currentSrc?: string | null;
	onFileChange: (base64: string | null) => void;
	onError?: (msg: string) => void;
}

export default function AvatarUploader({ onFileChange, onError, currentSrc }: Props) {
	const { preview, base64, error, handleFile, clear } = useAvatarUpload();
	const isDefault = currentSrc === import.meta.env.VITE_DEFAULT_AVATAR;

	useEffect(() => {
		onFileChange(base64);
	}, [base64]);

	useEffect(() => {
		if (error) onError?.(error);
	}, [error]);
	
	return (
		<div className='mb-4 flex flex-col items-center gap-3'>
			<AvatarDisplay src={preview ?? currentSrc ?? null} size='lg' />
			
			{(!isDefault || preview) &&
				<button
					onClick={() => { clear(); onFileChange(null); }}
				>
					Reset
				</button>
			}

			<label className='cursor-pointer px-4 py-2 text-xs text-purple-300 hover:text-white transition-colors'>
			<span className='arcade-btn px-4 py-2 text-xs'>SELECT IMAGE</span>
			<input
				type='file'
				className='hidden'
				accept='image/png,image/jpeg,image/jpg,image/webp'
				onChange={(e) => handleFile(e.target.files?.[0])}
			/>
			</label>
			<p>ALERT DESDE EL AvatarUploader.ts</p>
			<AlertError message={error} />
		</div>
	);
} // TODO remover el AlertError si se duplica