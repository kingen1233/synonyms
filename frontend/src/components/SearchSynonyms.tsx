import { useState } from 'react';
import {
    Alert,
    Autocomplete,
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    IconButton,
    Snackbar,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import LinkIcon from '@mui/icons-material/Link';
import { useQueryClient } from '@tanstack/react-query';
import {
    useSearchWords,
    useGetAllWords,
    useGetSynonyms,
    useDeleteLink,
} from '../api/generated/synonyms/synonyms';
import { useDebounce } from '../hooks/useDebounce';
import { getApiErrorMessage } from '../api/errors';
import { getHighlightSegments } from '../utils/highlight';
import { RenameWordDialog } from './RenameWordDialog';
import { DeleteWordDialog } from './DeleteWordDialog';
import { CardHeader } from './CardHeader';

// Cap how many options render at once 
const MAX_OPTIONS = 20;


export function SearchSynonyms() {
    const queryClient = useQueryClient();
    const [inputValue, setInputValue] = useState('');
    const [open, setOpen] = useState(false);
    const [selectedWord, setSelectedWord] = useState<string | null>(null);
    const [renameOpen, setRenameOpen] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const debouncedInput = useDebounce(inputValue, 300);
    const trimmedInput = debouncedInput.trim();

    // Don't treat the autocomplete-populated value as a search query — only fire when the
    // user is actively typing (i.e. the input doesn't match the already-selected word).
    const isSelectionActive = selectedWord !== null && inputValue === selectedWord;
    const hasQuery = trimmedInput.length > 0 && !isSelectionActive;

    // Two data sources: the full word list (shown on focus with an empty box) and the
    // substring search (once the user types). Each only fires when it can actually be shown.
    const allWordsQuery = useGetAllWords({ query: { enabled: open && !hasQuery } });
    const searchQuery = useSearchWords(
        { term: trimmedInput },
        { query: { enabled: hasQuery } },
    );

    // Synonym lookup for the selected word.
    const synonymsQuery = useGetSynonyms(selectedWord ?? '', {
        query: { enabled: !!selectedWord },
    });

    const refresh = () => queryClient.invalidateQueries();

    const deleteLink = useDeleteLink({
        mutation: {
            onSuccess: () => {
                setSuccessMessage('Link removed.');
                refresh();
            },
        },
    });

    const options = searchQuery.data?.words ?? [];
    const result = synonymsQuery.data;
    const direct = result?.directSynonyms ?? [];
    const transitive = result?.transitiveSynonyms ?? [];
    const totalMatches = direct.length + transitive.length;

    // Whichever source backs the dropdown right now, capped so a big dictionary stays snappy.
    const allWords = allWordsQuery.data?.words ?? [];
    const matchedWords = hasQuery ? options : allWords;
    const visibleOptions = matchedWords.slice(0, MAX_OPTIONS);
    const isLoadingOptions = hasQuery ? searchQuery.isFetching : allWordsQuery.isFetching;

    return (
        <Card>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', p: 3 }}>
                <CardHeader icon={<SearchIcon fontSize="small" />} title="Search dictionary" tone="slate" />

                <Autocomplete
                    options={visibleOptions}
                    open={open}
                    onOpen={() => setOpen(true)}
                    onClose={() => setOpen(false)}
                    // Options are already filtered by the server — keep them all.
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
                            label="Search for a word or browse all…"
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
                {deleteLink.isError && (
                    <Alert severity="error" sx={{ mt: 2 }} onClose={() => deleteLink.reset()}>
                        {getApiErrorMessage(deleteLink.error, 'Could not remove link.')}
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
                                    <IconButton size="small" onClick={() => setRenameOpen(true)}>
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete word">
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => setConfirmDeleteOpen(true)}
                                    >
                                        <DeleteOutlineIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Stack>

                            {totalMatches === 0 ? (
                                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                    No synonyms tracked for this word yet.
                                </Typography>
                            ) : (
                                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                                    {/* Direct synonyms: indigo pills; the unlink icon removes the link. */}
                                    {direct.map((synonym) => (
                                        <Chip
                                            key={synonym}
                                            label={synonym}
                                            onDelete={() =>
                                                deleteLink.mutate({ data: { wordA: selectedWord, wordB: synonym } })
                                            }
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
                                    {/* Transitive synonyms: amber pills marked with a link icon; not directly
                      unlinkable since they are inferred via an intermediate word. */}
                                    {transitive.map((synonym) => (
                                        <Tooltip key={synonym.word} title={`Linked via “${synonym.closestNeighbour}” - remove that link to sever it`}>
                                            <Chip
                                                icon={<LinkIcon />}
                                                label={synonym.word}
                                                size="medium"
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
            </CardContent>

            {selectedWord && (
                <RenameWordDialog
                    open={renameOpen}
                    currentWord={selectedWord}
                    onClose={() => setRenameOpen(false)}
                    onRenamed={(newWord) => {
                        setRenameOpen(false);
                        setSelectedWord(newWord);
                        setInputValue(newWord);
                        setSuccessMessage('Word renamed.');
                        refresh();
                    }}
                />
            )}

            {selectedWord && (
                <DeleteWordDialog
                    open={confirmDeleteOpen}
                    word={selectedWord}
                    onClose={() => setConfirmDeleteOpen(false)}
                    onDeleted={() => {
                        setConfirmDeleteOpen(false);
                        setSelectedWord(null);
                        setInputValue('');
                        setSuccessMessage('Word deleted.');
                        refresh();
                    }}
                />
            )}

            <Snackbar
                open={successMessage !== null}
                autoHideDuration={3000}
                onClose={() => setSuccessMessage(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    severity="success"
                    variant="filled"
                    onClose={() => setSuccessMessage(null)}
                    sx={{ width: '100%' }}
                >
                    {successMessage}
                </Alert>
            </Snackbar>
        </Card>
    );
}
