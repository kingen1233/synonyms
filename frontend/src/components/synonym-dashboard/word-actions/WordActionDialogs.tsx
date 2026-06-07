import { useQueryClient } from '@tanstack/react-query';
import { RenameWordDialog } from './RenameWordDialog';
import { DeleteWordDialog } from './DeleteWordDialog';
import { SuccessSnackbar } from '../../shared/SuccessSnackbar';
import { getGetSynonymsQueryKey } from '../../../api/generated/synonyms/synonyms';
import type { WordActionsState } from '../../../hooks/useWordActions';

interface WordActionDialogsProps {
  word: string;
  wordActions: WordActionsState;
  /** Called after a successful rename. Receives the new word name. */
  onRenamed?: (newWord: string) => void;
  /** Called after a successful delete. */
  onDeleted?: () => void;
}

/**
 * Renders the Rename dialog, Delete dialog, and success Snackbar for a given word.
 * Intended to be used alongside `useWordActions` — pass the hook's return value as `wordActions`.
 */
export function WordActionDialogs({ word, wordActions, onRenamed, onDeleted }: WordActionDialogsProps) {
  const queryClient = useQueryClient();
  return (
    <>
      <RenameWordDialog
        open={wordActions.renameOpen}
        currentWord={word}
        onClose={wordActions.closeRename}
        onRenamed={(newWord) => {
          wordActions.closeRename();
          wordActions.setSuccess('Word renamed.');
          wordActions.refresh();
          onRenamed?.(newWord);
        }}
      />

      <DeleteWordDialog
        open={wordActions.deleteOpen}
        word={word}
        onClose={wordActions.closeDelete}
        onDeleted={() => {
          wordActions.closeDelete();
          wordActions.setSuccess('Word deleted.');
          // Remove the synonyms query for this word so that invalidate queries doesn't trigger a refetch.
          queryClient.removeQueries({ queryKey: getGetSynonymsQueryKey(word) });
          onDeleted?.();
          wordActions.refresh();
        }}
      />

      <SuccessSnackbar message={wordActions.successMessage} onClose={wordActions.clearSuccess} />
    </>
  );
}
