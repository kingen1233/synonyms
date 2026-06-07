import { useState } from 'react';
import {
    Alert,
    Autocomplete,
    Box,
    CircularProgress,
    IconButton,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import {
    useGetAllWords,
    useGetSynonyms,
} from '../../api/generated/synonyms/synonyms';
import { getApiErrorMessage } from '../../api/errors';
import { getHighlightSegments } from '../../utils/highlight';
import { CardHeader } from '../word/CardHeader';
import { SynonymChips } from './SynonymChips';
import { WordActionDialogs } from '../word/WordActionDialogs';
import { useWordActions } from '../../hooks/useWordActions';

// Cap how many options render at once 
const MAX_OPTIONS = 40;


export function SearchSynonyms() {
    const [inputValue, setInputValue] = useState('');
    const [open, setOpen] = useState(false);
    const [selectedWord, setSelectedWord] = useState<string | null>(null);
    const actions = useWordActions();

    // Cache policy: fetches the full word list on page load so the dropdown is always
    // instant. staleTime keeps the response "fresh" for 8 s; after that, the next open
    // or window-focus triggers a silent background refetch so changes by other users
    // appear without any loading spinner.
    const allWordsQuery = useGetAllWords({
        query: {
            staleTime: 8 * 1000,
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: true,
        },
    });

    // Filter the cached word list client-side — no extra network round-trip needed.
    const trimmedInput = inputValue.trim();
    const isSelectionActive = selectedWord !== null && inputValue === selectedWord;

    // Synonym lookup for the selected word.
    const synonymsQuery = useGetSynonyms(selectedWord ?? '', {
        query: { enabled: !!selectedWord },
    });

    const result = synonymsQuery.data;
    const direct = result?.directSynonyms ?? [];
    const transitive = result?.transitiveSynonyms ?? [];
    const totalMatches = direct.length + transitive.length;

    // Filter the full word list client-side, capped so a big dictionary stays snappy.
    const allWords = allWordsQuery.data?.words ?? [];
    const matchedWords =
        trimmedInput && !isSelectionActive
            ? allWords.filter((w) => w.toLowerCase().includes(trimmedInput.toLowerCase()))
            : allWords;
    const visibleOptions = matchedWords.slice(0, MAX_OPTIONS);
    const isLoadingOptions = allWordsQuery.isFetching;

    return (
        <>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <CardHeader icon={<SearchIcon fontSize="small" />} title="Search the dictionary" tone="slate" />
                <Autocomplete
                    options={visibleOptions}
                    open={open}
                    onOpen={() => setOpen(true)}
                    onClose={() => setOpen(false)}
                    // Options are already filtered client-side — prevent MUI from double-filtering.
                    filterOptions={(x) => x}
                    loading={isLoadingOptions}
                    value={selectedWord}
                    onChange={(_event, value) => setSelectedWord(value)}
                    inputValue={inputValue}
                    onInputChange={(_event, value) => setInputValue(value)}
                    noOptionsText={isLoadingOptions ? 'Loading…' : 'No matching words'}
                    isOptionEqualToValue={(option, value) => option === value}
                    renderOption={(props, option) => {
                        // Bold the matched substring so users see why each option surfaced.
                        const { key, ...liProps } = props as typeof props & { key: string };
                        return (
                            <Box component="li" key={key} {...liProps}>
                                {getHighlightSegments(option, inputValue).map((segment, index) =>
                                    segment.matched ? (
                                        <Box component="span" key={index} sx={{ fontWeight: 700, color: 'primary.main' }}>
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
                                            {params.slotProps.input.endAdornment}
                                        </>
                                    ),
                                },
                            }}
                        />
                    )}
                />

                {synonymsQuery.isError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {getApiErrorMessage(synonymsQuery.error, 'Could not load synonyms.')}
                    </Alert>
                )}

                {/* Results grow to fill the card so the status footer stays pinned to the bottom. */}
                <Box sx={{ flexGrow: 1, mt: selectedWord && result ? 3 : 0 }}>
                    {selectedWord && result && (
                        <>
                            <Stack direction="row" spacing={0.5} sx={{ mb: 1.5, alignItems: 'center' }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, mr: 0.5 }}>
                                    {result.word}
                                </Typography>
                                <Tooltip title="Rename word">
                                    <IconButton size="small" onClick={actions.openRename}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete word">
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={actions.openDelete}
                                    >
                                        <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Stack>

                            <SynonymChips
                                    word={selectedWord}
                                    direct={direct}
                                    transitive={transitive}
                                    onUnlinked={() => { actions.setSuccess('Link removed.'); actions.refresh(); }}
                                    chipSize="medium"
                                />
                        </>
                    )}
                </Box>

                {selectedWord && result && (
                    <Stack
                        direction="row"
                        sx={{
                            mt: 3,
                            pt: 2,
                            borderTop: '1px solid',
                            borderColor: 'divider',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            color: 'text.secondary',
                        }}
                    >
                        <Typography variant="caption">Matches found: {totalMatches}</Typography>
                    </Stack>
                )}
            </Box>

            <WordActionDialogs
                word={selectedWord ?? ''}
                actions={actions}
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
