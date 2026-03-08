export interface IImageStorageService {
	ping(): Promise<void>;
	uploadAvatar(base64: string, oldAvatar?: string | null): Promise<string>;
	deleteAvatar(url: string): Promise<void>;
}
