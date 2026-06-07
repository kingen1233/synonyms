import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { useDeleteWord } from '../../api/generated/synonyms/synonyms';
import { getApiErrorMessage } from '../../api/errors';

interface DeleteWordDialogProps {
  open: boolean;
  word: string;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteWordDialog({ open, word, onClose, onDeleted }: DeleteWordDialogProps) {
  const deleteWord = useDeleteWord({
    mutation: {
      onSuccess: () => onDeleted(),
    },
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete “{word}”?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          This permanently removes “{word}” and all of its synonym links. This cannot be undone.
        </DialogContentText>
        {deleteWord.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {getApiErrorMessage(deleteWord.error, 'Could not delete word.')}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          color="error"
          variant="contained"
          disabled={deleteWord.isPending}
          onClick={() => deleteWord.mutate({ word })}
        >
          Delete word
        </Button>
      </DialogActions>
    </Dialog>
  );
}
