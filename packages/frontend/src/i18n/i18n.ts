import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// ── EN ──
import commonEN from './locales/en/common.json';
import authEN from './locales/en/auth.json';
import navEN from './locales/en/nav.json';
import profileEN from './locales/en/profile.json';
import friendsEN from './locales/en/friends.json';
import lobbyEN from './locales/en/lobby.json';
import gameEN from './locales/en/game.json';
import toastsEN from './locales/en/toasts.json';
import homeEN from './locales/en/home.json';
import legalEN from './locales/en/legal.json';

// ── ES ──
import commonES from './locales/es/common.json';
import authES from './locales/es/auth.json';
import navES from './locales/es/nav.json';
import profileES from './locales/es/profile.json';
import friendsES from './locales/es/friends.json';
import lobbyES from './locales/es/lobby.json';
import gameES from './locales/es/game.json';
import toastsES from './locales/es/toasts.json';
import homeES from './locales/es/home.json';
import legalES from './locales/es/legal.json';

// ── FR ──
import commonFR from './locales/fr/common.json';
import authFR from './locales/fr/auth.json';
import navFR from './locales/fr/nav.json';
import profileFR from './locales/fr/profile.json';
import friendsFR from './locales/fr/friends.json';
import lobbyFR from './locales/fr/lobby.json';
import gameFR from './locales/fr/game.json';
import toastsFR from './locales/fr/toasts.json';
import homeFR from './locales/fr/home.json';
import legalFR from './locales/fr/legal.json';

// ── CA ──
import commonCA from './locales/ca/common.json';
import authCA from './locales/ca/auth.json';
import navCA from './locales/ca/nav.json';
import profileCA from './locales/ca/profile.json';
import friendsCA from './locales/ca/friends.json';
import lobbyCA from './locales/ca/lobby.json';
import gameCA from './locales/ca/game.json';
import toastsCA from './locales/ca/toasts.json';
import homeCA from './locales/ca/home.json';
import legalCA from './locales/ca/legal.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: {
                common: commonEN,
                auth: authEN,
                nav: navEN,
                profile: profileEN,
                friends: friendsEN,
                lobby: lobbyEN,
                game: gameEN,
                toasts: toastsEN,
				home: homeEN,
				legal: legalEN,
            },
            es: {
                common: commonES,
                auth: authES,
                nav: navES,
                profile: profileES,
                friends: friendsES,
                lobby: lobbyES,
                game: gameES,
                toasts: toastsES,
				home: homeES,
				legal: legalES,
            },
            fr: {
                common: commonFR,
                auth: authFR,
                nav: navFR,
                profile: profileFR,
                friends: friendsFR,
                lobby: lobbyFR,
                game: gameFR,
                toasts: toastsFR,
				home: homeFR,
				legal: legalFR
            },
            ca: {
                common: commonCA,
                auth: authCA,
                nav: navCA,
                profile: profileCA,
                friends: friendsCA,
                lobby: lobbyCA,
                game: gameCA,
                toasts: toastsCA,
				home: homeCA,
				legal: legalCA
            },
        },

        fallbackLng: 'en',
        defaultNS: 'common',

        interpolation: {
            escapeValue: false,
        },

        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'i18nextLng',
        },
    });

export default i18n;