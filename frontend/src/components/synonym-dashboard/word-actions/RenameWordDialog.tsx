import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { useRenameWord } from '../../../api/generated/synonyms/synonyms';
import { getApiErrorMessage } from '../../../api/errors';

interface RenameWordDialogProps {
  open: boolean;
  currentWord: string;
  onClose: () => void;
  onRenamed: (newWord: string) => void;
}

interface FormValues {
  newWord: string;
}

/**
 * Dialog for renaming a word everywhere it appears. Pre-fills the current name and calls the
 * generated renameWord mutation; surfaces the 409 conflict (target already exists) inline.
 */
export function RenameWordDialog({ open, currentWord, onClose, onRenamed }: RenameWordDialogProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { newWord: currentWord } });

  // Reset the field whenever the dialog is (re)opened for a different word.
  useEffect(() => {
    if (open) reset({ newWord: currentWord });
  }, [open, currentWord, reset]);

  const renameWord = useRenameWord({
    mutation: {
      onSuccess: (_data, variables) => onRenamed(variables.data.newWord),
    },
  });

  const onSubmit = (values: FormValues) =>
    renameWord.mutate({ word: currentWord, data: { newWord: values.newWord.trim() } });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogTitle>Rename “{currentWord}”</DialogTitle>
        <DialogContent>
          <Controller
            name="newWord"
            control={control}
            rules={{
              required: 'Required',
              maxLength: { value: 100, message: 'Max 100 characters' },
              validate: (value) => (value.trim().length > 0 ? true : 'Required'),
            }}
            render={({ field }) => (
              <TextField
                {...field}
                autoFocus
                margin="dense"
                label="New word"
                fullWidth
                error={Boolean(errors.newWord)}
                helperText={errors.newWord?.message}
              />
            )}
          />
          {renameWord.isError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {getApiErrorMessage(renameWord.error, 'Could not rename word.')}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={renameWord.isPending}>
            Rename
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
