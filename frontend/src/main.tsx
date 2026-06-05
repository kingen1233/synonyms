import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import axios from 'axios'
import App from './App.tsx'
import { theme } from './theme.ts'
import { seedSynonyms } from './api/seed.ts'

const MAX_RETRIES = 3

// Retry only 4xx errors
const retryOnServerErrors = (failureCount: number, error: unknown): boolean => {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined
  if (status !== undefined && status >= 400 && status < 500) {
    return false
  }
  return failureCount < MAX_RETRIES
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: retryOnServerErrors, refetchOnWindowFocus: false },
    mutations: { retry: retryOnServerErrors },
  },
})

// Fire the sample-data calls once on startup so the app opens with content to explore.
void seedSynonyms()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
