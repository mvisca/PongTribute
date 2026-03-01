import { useState } from 'react';
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
			
			// Validar pattern base64
			if (!Validators.avatarBase64.pattern.test(result)) {
				setState(s => ({ ...s, error: 'Invalida image format' }));
				return;
			}
			
			setState({ preview: result, base64: result, error: '' });
		};
	}
	
	function clear() {
		setState({ preview: null, base64: null, error: '' });
	}
	
	return { ...state, handleFile, clear };
}