import { Box, Container, Stack, Typography } from '@mui/material';
import { AddSynonymForm } from './AddSynonymForm';
import { SearchSynonyms } from './SearchSynonyms';

export function SynonymDashboard() {
  return (
    <Box sx={{ minHeight: '100vh', py: { xs: 5, md: 8 }, px: { xs: 2, sm: 3 } }}>
      <Container maxWidth="md" disableGutters>
        <Stack spacing={4}>
          <Box component="header" sx={{ textAlign: 'center' }}>
            <Typography
              variant="h1"
              component="h1"
              sx={{ fontSize: { xs: '2rem', md: '2.25rem' }, color: 'text.primary' }}
            >
              Synonym Directory
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1, maxWidth: 460, mx: 'auto' }}
            >
              Add word relationships seamlessly and find transitive, bidirectional matches
              instantly.
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 4,
              alignItems: 'start',
            }}
          >
            <AddSynonymForm />
            <SearchSynonyms />
          </Box>

          <Box
            component="footer"
            sx={{
              bgcolor: '#f1f5f9',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              p: 2,
              textAlign: 'center',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Synonyms are bidirectional and resolve transitively.
            </Typography>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

