import { IImageStorageService } from './ports/IImageStorageService.js';

export interface ImagesAppDependencies {
	cloudinaryService: IImageStorageService;
}
