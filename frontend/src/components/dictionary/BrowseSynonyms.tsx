import { Fragment, useMemo, useState } from 'react';
import {
    Box,
    CircularProgress,
    IconButton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import {
    useGetAllWords,
    useGetSynonyms,
} from '../../api/generated/synonyms/synonyms';
import { getApiErrorMessage } from '../../api/errors';
import { CardHeader } from '../word/CardHeader';
import { SynonymChips } from './SynonymChips';
import { WordActionDialogs } from '../word/WordActionDialogs';
import { useWordActions } from '../../hooks/useWordActions';

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

export function BrowseSynonyms() {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selectedWord, setSelectedWord] = useState<string | null>(null);
    const actions = useWordActions();

    // Same query key as SearchSynonyms — React Query serves the cached result, no extra request.
    const allWordsQuery = useGetAllWords({
        query: {
            staleTime: 8 * 1000,
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: true,
        },
    });

    const allWords = allWordsQuery.data?.words ?? [];

    const visibleRows = useMemo(() => {
        const start = page * rowsPerPage;
        return allWords.slice(start, start + rowsPerPage);
    }, [allWords, page, rowsPerPage]);

    // Synonyms are loaded lazily — only fetched when the user expands a row.
    const synonymsQuery = useGetSynonyms(selectedWord ?? '', {
        query: { enabled: !!selectedWord },
    });

    const result = synonymsQuery.data;
    const direct = result?.directSynonyms ?? [];
    const transitive = result?.transitiveSynonyms ?? [];
    const totalMatches = direct.length + transitive.length;

    const handleRowClick = (word: string) =>
        setSelectedWord((prev) => (prev === word ? null : word));

    return (
        <>
            <CardHeader icon={<FormatListBulletedIcon fontSize="small" />} title="Browse dictionary" tone="slate" />
            <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600 }}>Word</TableCell>
                                {/* Expand chevron column */}
                                <TableCell sx={{ width: 40 }} />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {allWordsQuery.isLoading && (
                                <TableRow>
                                    <TableCell colSpan={2} align="center" sx={{ py: 4 }}>
                                        <CircularProgress size={20} />
                                    </TableCell>
                                </TableRow>
                            )}

                            {!allWordsQuery.isLoading && allWords.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={2}
                                        align="center"
                                        sx={{ py: 4, color: 'text.secondary', fontStyle: 'italic' }}
                                    >
                                        No words in the dictionary yet.
                                    </TableCell>
                                </TableRow>
                            )}

                            {visibleRows.map((word) => {
                                const isExpanded = selectedWord === word;
                                const isLoadingSynonyms = isExpanded && synonymsQuery.isFetching;

                                return (
                                    <Fragment key={word}>
                                        <TableRow
                                            hover
                                            selected={isExpanded}
                                            onClick={() => handleRowClick(word)}
                                            sx={{ cursor: 'pointer' }}
                                        >
                                            <TableCell sx={{ fontWeight: isExpanded ? 600 : 400 }}>
                                                {word}
                                            </TableCell>
                                            <TableCell padding="checkbox">
                                                <IconButton size="small" tabIndex={-1}>
                                                    {isExpanded ? (
                                                        <KeyboardArrowUpIcon fontSize="small" />
                                                    ) : (
                                                        <KeyboardArrowDownIcon fontSize="small" />
                                                    )}
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>

                                        {isExpanded && (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={2}
                                                    sx={{ py: 1.5, px: 2.5, bgcolor: '#f8fafc', borderBottom: '2px solid', borderColor: 'divider' }}
                                                >
                                                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                                                        <Box sx={{ flex: 1 }}>
                                                            {isLoadingSynonyms ? (
                                                                <CircularProgress size={16} />
                                                            ) : synonymsQuery.isError ? (
                                                                <Typography variant="caption" color="error">
                                                                    {getApiErrorMessage(synonymsQuery.error, 'Could not load synonyms.')}
                                                                </Typography>
                                                            ) : totalMatches === 0 ? (
                                                                <Typography
                                                                    variant="caption"
                                                                    color="text.secondary"
                                                                    sx={{ fontStyle: 'italic' }}
                                                                >
                                                                    No synonyms tracked for this word yet.
                                                                </Typography>
                                                            ) : (
                                                                <SynonymChips
                                                                    word={word}
                                                                    direct={direct}
                                                                    transitive={transitive}
                                                                    onUnlinked={() => { actions.setSuccess('Link removed.'); actions.refresh(); }}
                                                                />
                                                            )}
                                                        </Box>

                                                        {/* Actions pinned to the right of the expanded panel */}
                                                        {!isLoadingSynonyms && !synonymsQuery.isError && (
                                                            <Stack direction="row" spacing={0} sx={{ ml: 1, flexShrink: 0 }}>
                                                                <Tooltip title="Rename word">
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            actions.openRename();
                                                                        }}
                                                                    >
                                                                        <EditIcon fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                <Tooltip title="Delete word">
                                                                    <IconButton
                                                                        size="small"
                                                                        color="error"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            actions.openDelete();
                                                                        }}
                                                                    >
                                                                        <DeleteOutlineIcon fontSize="small" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </Stack>
                                                        )}
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    count={allWords.length}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                    labelRowsPerPage="Per page:"
                />
            <WordActionDialogs
                word={selectedWord ?? ''}
                actions={actions}
                onRenamed={(newWord) => setSelectedWord(newWord)}
                onDeleted={() => setSelectedWord(null)}
            />
        </>
    );
}
