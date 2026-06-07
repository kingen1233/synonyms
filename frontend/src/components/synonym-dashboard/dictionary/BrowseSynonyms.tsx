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
  Typography,
} from '@mui/material';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { getApiErrorMessage } from '../../../api/errors';
import { CardHeader } from '../../shared/CardHeader';
import { SynonymChips } from './SynonymChips';
import { WordActionDialogs } from '../word-actions/WordActionDialogs';
import { WordActionButtons } from '../word-actions/WordActionButtons';
import { useWordActions } from '../../../hooks/useWordActions';
import { useWordsList } from '../../../hooks/useWordsList';
import { useSynonymsFor } from '../../../hooks/useSynonymsFor';

const ROWS_PER_PAGE_OPTIONS = [10, 25];

export function BrowseSynonyms() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const wordActions = useWordActions();

  const { words: allWords, isLoading: isLoadingWords } = useWordsList();

  // Synonyms are fetched when the user expands a row.
  const synonyms = useSynonymsFor(selectedWord);

  const visibleRows = useMemo(() => {
    const start = page * rowsPerPage;
    return allWords.slice(start, start + rowsPerPage);
  }, [allWords, page, rowsPerPage]);

  const handleRowClick = (word: string) => setSelectedWord((prev) => (prev === word ? null : word));

  return (
    <>
      <CardHeader
        icon={<FormatListBulletedIcon fontSize="small" />}
        title="Browse dictionary"
        tone="slate"
      />
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Word</TableCell>
              <TableCell sx={{ width: 40 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoadingWords && (
              <TableRow>
                <TableCell colSpan={2} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={20} />
                </TableCell>
              </TableRow>
            )}

            {!isLoadingWords && allWords.length === 0 && (
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
              const isLoadingSynonyms = isExpanded && synonyms.isFetching;

              return (
                <Fragment key={word}>
                  <TableRow
                    hover
                    selected={isExpanded}
                    onClick={() => handleRowClick(word)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell sx={{ fontWeight: isExpanded ? 600 : 400 }}>{word}</TableCell>
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
                        sx={{
                          py: 1.5,
                          px: 2.5,
                          bgcolor: '#f8fafc',
                          borderBottom: '2px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Stack
                          direction="row"
                          sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
                        >
                          <Box sx={{ flex: 1 }}>
                            {isLoadingSynonyms ? (
                              <CircularProgress size={16} />
                            ) : synonyms.isError ? (
                              <Typography variant="caption" color="error">
                                {getApiErrorMessage(synonyms.error, 'Could not load synonyms.')}
                              </Typography>
                            ) : (
                              <SynonymChips
                                word={word}
                                direct={synonyms.direct}
                                transitive={synonyms.transitive}
                                onUnlinked={() => {
                                  wordActions.setSuccess('Link removed.');
                                  wordActions.refresh();
                                }}
                              />
                            )}
                          </Box>

                          {!isLoadingSynonyms && !synonyms.isError && (
                            <WordActionButtons
                              onRename={wordActions.openRename}
                              onDelete={wordActions.openDelete}
                              sx={{ ml: 1, flexShrink: 0 }}
                            />
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
        wordActions={wordActions}
        onRenamed={(newWord) => setSelectedWord(newWord)}
        onDeleted={() => setSelectedWord(null)}
      />
    </>
  );
}
