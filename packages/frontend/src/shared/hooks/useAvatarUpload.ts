import { useEffect, useState } from 'react';
import { Validators } from '@transcendence/shared/utils/validators.js';

type AvatarState = {
	preview: string | null; // Base64 para mostrar
	base64: string | null;
	error: string;
}

export function useAvatarUpload() {
	const [state, setState] = useState<AvatarState>({
		preview: null,
		base64: null,
		error: '',
	});
	
	function handleFile(file: File | null | undefined) {
		if (!file) return;
		
		// Validar tipo
		if (!Validators.avatarBase64.allowedTypes.includes(file.type as any)) {
			setState(s => ({ ...s, error: Validators.avatarBase64.message }));
			return;
		}
		
		// Validar tamaño (~10MB)
		if (file.size > 10_000_000) {
			setState(s => ({ ...s, error: Validators.avatarBase64.message }));
			return;
		}
		
		const reader = new FileReader();
		reader.onload = (e) => {
			const result = e.target?.result as string;

			if (!Validators.avatarBase64.pattern.test(result)) {
				setState(s => ({ ...s, error: 'Invalid image format' }));
				return;
			}

			// Comprimir/redimensionar a máximo 800x800 usando canvas
			const img = new Image();
			img.onload = () => {
				const MAX = 800;
				const scale = Math.min(1, MAX / Math.max(img.width, img.height));
				const w = Math.round(img.width * scale);
				const h = Math.round(img.height * scale);

				const canvas = document.createElement('canvas');
				canvas.width = w;
				canvas.height = h;
				const ctx = canvas.getContext('2d')!;
				ctx.drawImage(img, 0, 0, w, h);

				const compressed = canvas.toDataURL('image/webp', 0.85);
				setState({ preview: compressed, base64: compressed, error: '' });
			};
			img.src = result;
		};
		reader.readAsDataURL(file);
	}
	
	function clear() {
		setState({ preview: null, base64: null, error: '' });
	}
	
	return { ...state, handleFile, clear };
}