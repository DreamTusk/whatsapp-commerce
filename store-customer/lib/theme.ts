export type ThemeKey = 'green' | 'blue' | 'orange' | 'purple' | 'red'

export interface ThemeConfig {
  name: string
  primary: string
  primaryDark: string
  primaryLight: string
  headerBg: string       // header background color
  headerText: string     // header text/icon color
  badgeColor: string     // discount badge background
}

export const THEMES: Record<ThemeKey, ThemeConfig> = {
  green: {
    name: 'Fresh Green',
    primary: '#25D366',
    primaryDark: '#1ebe5d',
    primaryLight: '#e7faf0',
    headerBg: '#128C7E',
    headerText: '#ffffff',
    badgeColor: '#ff6161',
  },
  blue: {
    name: 'Ocean Blue',
    primary: '#2874F0',
    primaryDark: '#1a5dc7',
    primaryLight: '#ebf3ff',
    headerBg: '#2874F0',
    headerText: '#ffffff',
    badgeColor: '#ff6161',
  },
  orange: {
    name: 'Sunset Orange',
    primary: '#FF6B35',
    primaryDark: '#e55a25',
    primaryLight: '#fff3ef',
    headerBg: '#FF6B35',
    headerText: '#ffffff',
    badgeColor: '#c0392b',
  },
  purple: {
    name: 'Royal Purple',
    primary: '#7C3AED',
    primaryDark: '#6D28D9',
    primaryLight: '#f3effd',
    headerBg: '#7C3AED',
    headerText: '#ffffff',
    badgeColor: '#ff6161',
  },
  red: {
    name: 'Crimson',
    primary: '#E53935',
    primaryDark: '#c62828',
    primaryLight: '#fdecea',
    headerBg: '#E53935',
    headerText: '#ffffff',
    badgeColor: '#b71c1c',
  },
}

// Store admin will update this from their settings page (future).
// Changing this constant switches the theme for all customers.
export const ACTIVE_THEME: ThemeKey = 'green'
export const theme = THEMES[ACTIVE_THEME]
