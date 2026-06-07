import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

interface CardHeaderProps {
  icon: ReactNode;
  title: string;
  /** Accent for the icon badge: indigo (primary action) or slate (neutral). */
  tone?: 'indigo' | 'slate';
}

const TONES = {
  indigo: { bg: '#eef2ff', fg: '#4f46e5' }, // indigo-50 / indigo-600
  slate: { bg: '#f1f5f9', fg: '#334155' }, // slate-100 / slate-700
} as const;

export function CardHeader({ icon, title, tone = 'indigo' }: CardHeaderProps) {
  const { bg, fg } = TONES[tone];
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2.5 }}>
      <Box
        sx={{
          display: 'flex',
          p: 0.75,
          borderRadius: 1.5,
          bgcolor: bg,
          color: fg,
        }}
      >
        {icon}
      </Box>
      <Typography variant="h6" component="h2">
        {title}
      </Typography>
    </Stack>
  );
}
