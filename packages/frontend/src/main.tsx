import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n/i18n';        // inicializa i18n antes del render
import './styles/index.css';
import { BrowserRouter } from 'react-router-dom';

ReactDOM.createRoot(
	document.getElementById('root') as HTMLElement
).render(
	<React.StrictMode>
		<BrowserRouter>
			<App />
		</BrowserRouter>
	</React.StrictMode>
);