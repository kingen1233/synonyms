import { createTheme } from '@mui/material/styles';

/**
 * Centralized MUI theme modeled on the Tailwind "slate + indigo" mockup:
 * a light slate canvas, indigo primary, near-black slate for secondary actions,
 * and flat, subtly-bordered cards. Keeping it here makes the visual identity
 * easy to adjust without touching components.
 */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#4f46e5', dark: '#4338ca', light: '#eef2ff' }, // indigo-600/700/50
    secondary: { main: '#0f172a', dark: '#1e293b' }, // slate-900/800
    success: { main: '#059669' },
    error: { main: '#dc2626' },
    background: { default: '#f8fafc', paper: '#ffffff' }, // slate-50 / white
    text: { primary: '#1e293b', secondary: '#475569' }, // slate-800 / slate-600
    divider: '#e2e8f0', // slate-200
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily:
      '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.025em' },
    h2: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
    overline: { fontWeight: 700, letterSpacing: '0.08em' },
  },
  components: {
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
    },
  },
});
