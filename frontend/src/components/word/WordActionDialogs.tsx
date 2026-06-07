import { Alert, Snackbar } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { RenameWordDialog } from './RenameWordDialog';
import { DeleteWordDialog } from './DeleteWordDialog';
import { getGetSynonymsQueryKey } from '../../api/generated/synonyms/synonyms';
import type { WordActionsState } from '../../hooks/useWordActions';

interface WordActionDialogsProps {
    word: string;
    actions: WordActionsState;
    /** Called after a successful rename. Receives the new word name. */
    onRenamed?: (newWord: string) => void;
    /** Called after a successful delete. */
    onDeleted?: () => void;
}

/**
 * Renders the Rename dialog, Delete dialog, and success Snackbar for a given word.
 * Intended to be used alongside `useWordActions` — pass the hook's return value as `actions`.
 */
export function WordActionDialogs({ word, actions, onRenamed, onDeleted }: WordActionDialogsProps) {
    const queryClient = useQueryClient();
    return (
        <>
            <RenameWordDialog
                open={actions.renameOpen}
                currentWord={word}
                onClose={actions.closeRename}
                onRenamed={(newWord) => {
                    actions.closeRename();
                    actions.setSuccess('Word renamed.');
                    actions.refresh();
                    onRenamed?.(newWord);
                }}
            />

            <DeleteWordDialog
                open={actions.deleteOpen}
                word={word}
                onClose={actions.closeDelete}
                onDeleted={() => {
                    actions.closeDelete();
                    actions.setSuccess('Word deleted.');
                    // Remove the synonyms query for this word from the cache before anything else.
                    // invalidateQueries() would trigger a refetch while selectedWord is still
                    // non-null in the current render, producing a 404. Removing it prevents that.
                    queryClient.removeQueries({ queryKey: getGetSynonymsQueryKey(word) });
                    onDeleted?.();
                    actions.refresh();
                }}
            />

            <Snackbar
                open={actions.successMessage !== null}
                autoHideDuration={3000}
                onClose={actions.clearSuccess}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    severity="success"
                    variant="filled"
                    onClose={actions.clearSuccess}
                    sx={{ width: '100%' }}
                >
                    {actions.successMessage}
                </Alert>
            </Snackbar>
        </>
    );
}
