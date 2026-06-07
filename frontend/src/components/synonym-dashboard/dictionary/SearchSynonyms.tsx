import { useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { getApiErrorMessage } from '../../../api/errors';
import { getHighlightSegments } from '../../../utils/highlight';
import { CardHeader } from '../../shared/CardHeader';
import { SynonymChips } from './SynonymChips';
import { WordActionDialogs } from '../word-actions/WordActionDialogs';
import { WordActionButtons } from '../word-actions/WordActionButtons';
import { useWordActions } from '../../../hooks/useWordActions';
import { useWordsList } from '../../../hooks/useWordsList';
import { useSynonymsFor } from '../../../hooks/useSynonymsFor';

const MAX_OPTIONS = 40;

export function SearchSynonyms() {
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const wordActions = useWordActions();

  const { words: allWords, isFetching: isLoadingOptions } = useWordsList();
  const synonyms = useSynonymsFor(selectedWord);
  const { result, direct, transitive, totalSynonyms: totalMatches } = synonyms;

  // If starting a new search while having a word selected, ensure all options are displayed and not just the currently selected one
  const trimmedInput = inputValue.trim();
  const isInputReflectingSelection = selectedWord !== null && inputValue === selectedWord;
  const visibleOptions = useMemo(() => {
    const filtered =
      trimmedInput && !isInputReflectingSelection
        ? allWords.filter((w) => w.toLowerCase().includes(trimmedInput.toLowerCase()))
        : allWords;
    return filtered.slice(0, MAX_OPTIONS);
  }, [allWords, trimmedInput, isInputReflectingSelection]);

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <CardHeader
          icon={<SearchIcon fontSize="small" />}
          title="Search the dictionary"
          tone="slate"
        />
        <Autocomplete
          options={visibleOptions}
          open={open}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
          loading={isLoadingOptions}
          value={selectedWord}
          onChange={(_event, value) => setSelectedWord(value)}
          inputValue={inputValue}
          onInputChange={(_event, value) => setInputValue(value)}
          noOptionsText={isLoadingOptions ? 'Loading…' : 'No matching words'}
          isOptionEqualToValue={(option, value) => option === value}
          renderOption={(props, option) => {
            const { key, ...liProps } = props as typeof props & { key: string };
            return (
              <Box component="li" key={key} {...liProps}>
                {getHighlightSegments(option, inputValue).map((segment, index) =>
                  segment.matched ? (
                    <Box
                      component="span"
                      key={index}
                      sx={{ fontWeight: 700, color: 'primary.main' }}
                    >
                      {segment.text}
                    </Box>
                  ) : (
                    <span key={index}>{segment.text}</span>
                  ),
                )}
              </Box>
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Start typing to narrow down the results"
              slotProps={{
                ...params.slotProps,
                input: {
                  ...params.slotProps.input,
                  endAdornment: (
                    <>
                      {isLoadingOptions ? <CircularProgress size={18} /> : null}
                      {params.slotProps?.input?.endAdornment}
                    </>
                  ),
                },
              }}
            />
          )}
        />

        {synonyms.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {getApiErrorMessage(synonyms.error, 'Could not load synonyms.')}
          </Alert>
        )}

        <Box sx={{ flexGrow: 1, mt: selectedWord && result ? 3 : 0 }}>
          {selectedWord && result && (
            <>
              <Stack direction="row" spacing={0.5} sx={{ mb: 1.5, alignItems: 'center' }}>
                <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, mr: 0.5 }}>
                  {result.word}
                </Typography>
                <WordActionButtons onRename={wordActions.openRename} onDelete={wordActions.openDelete} />
              </Stack>

              <SynonymChips
                word={selectedWord}
                direct={direct}
                transitive={transitive}
                onUnlinked={() => {
                  wordActions.setSuccess('Link removed.');
                  wordActions.refresh();
                }}
                chipSize="medium"
              />
            </>
          )}
        </Box>

        {selectedWord && result && (
          <Box
            sx={{
              mt: 3,
              pt: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
              color: 'text.secondary',
            }}
          >
            <Typography variant="caption">Matches found: {totalMatches}</Typography>
          </Box>
        )}
      </Box>

      <WordActionDialogs
        word={selectedWord ?? ''}
        wordActions={wordActions}
        onRenamed={(newWord) => {
          setSelectedWord(newWord);
          setInputValue(newWord);
        }}
        onDeleted={() => {
          setSelectedWord(null);
          setInputValue('');
        }}
      />
    </>
  );
}
