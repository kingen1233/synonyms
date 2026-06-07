import { Alert, Chip, Stack, Tooltip, Typography } from '@mui/material';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import LinkIcon from '@mui/icons-material/Link';
import { useQueryClient } from '@tanstack/react-query';
import { useDeleteLink } from '../../../api/generated/synonyms/synonyms';
import { getApiErrorMessage } from '../../../api/errors';
import type { TransitiveSynonymResponse } from '../../../api/generated/model';

interface SynonymChipsProps {
  word: string;
  direct: string[];
  transitive: TransitiveSynonymResponse[];
  /** Called after a link is successfully removed — use to show a snackbar etc. */
  onUnlinked?: () => void;
  chipSize?: 'small' | 'medium';
}

export function SynonymChips({
  word,
  direct,
  transitive,
  onUnlinked,
  chipSize = 'small',
}: SynonymChipsProps) {
  const queryClient = useQueryClient();

  const deleteLink = useDeleteLink({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries();
        onUnlinked?.();
      },
    },
  });

  if (direct.length === 0 && transitive.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
        No synonyms tracked for this word yet.
      </Typography>
    );
  }

  return (
    <>
      {deleteLink.isError && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => deleteLink.reset()}>
          {getApiErrorMessage(deleteLink.error, 'Could not remove link.')}
        </Alert>
      )}
      {direct.length > 0 && (
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ flexWrap: 'wrap', mb: transitive.length > 0 ? 1.5 : 0 }}
        >
          {direct.map((synonym) => (
            <Chip
              key={synonym}
              label={synonym}
              size={chipSize}
              onDelete={() => deleteLink.mutate({ data: { wordA: word, wordB: synonym } })}
              deleteIcon={
                <Tooltip title="Remove this synonym link">
                  <LinkOffIcon />
                </Tooltip>
              }
              disabled={deleteLink.isPending}
              sx={{
                fontWeight: 600,
                bgcolor: '#eef2ff',
                color: '#4338ca',
                border: '1px solid #e0e7ff',
              }}
            />
          ))}
        </Stack>
      )}
      {transitive.length > 0 && (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {transitive.map((entry) => (
            <Tooltip key={entry.word} title={`Linked via "${entry.closestNeighbour}"`}>
              <Chip
                icon={<LinkIcon />}
                label={entry.word}
                size={chipSize}
                sx={{
                  fontWeight: 600,
                  bgcolor: '#fffbeb',
                  color: '#92400e',
                  border: '1px solid #fef3c7',
                  '& .MuiChip-icon': { color: '#d97706' },
                }}
              />
            </Tooltip>
          ))}
        </Stack>
      )}
    </>
  );
}
