import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
} from '@mui/material';
import AddLinkIcon from '@mui/icons-material/AddLink';
import { useAddSynonym } from '../api/generated/synonyms/synonyms';
import { getApiErrorMessage } from '../api/errors';
import { CardHeader } from './CardHeader';

interface FormValues {
  wordA: string;
  wordB: string;
}

export function AddSynonymForm() {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { wordA: '', wordB: '' } });

  const addSynonym = useAddSynonym({
    mutation: {
      onSuccess: (_data, variables) => {
        setSuccessMessage(`Linked “${variables.data.wordA}” ↔ “${variables.data.wordB}”.`);
        // Any synonym lookups / searches may now be stale.
        queryClient.invalidateQueries();
        reset();
      },
    },
  });

  const onSubmit = (values: FormValues) => {
    setSuccessMessage(null);
    addSynonym.mutate({ data: values });
  };

  return (
    <Card>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', p: 3 }}>
        <CardHeader icon={<AddLinkIcon fontSize="small" />} title="Add synonym pair" tone="indigo" />

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ flexGrow: 1 }}>
          <Stack spacing={2}>
            <Controller
              name="wordA"
              control={control}
              rules={{ required: 'Required', maxLength: { value: 100, message: 'Max 100 characters' } }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="First word"
                  placeholder="e.g. clean"
                  fullWidth
                  error={!!errors.wordA}
                  helperText={errors.wordA?.message}
                />
              )}
            />
            <Controller
              name="wordB"
              control={control}
              rules={{
                required: 'Required',
                maxLength: { value: 100, message: 'Max 100 characters' },
                // Disallow linking a word to itself (server enforces this too; friendlier UX).
                validate: (value, all) =>
                  value.trim().toLowerCase() !== all.wordA.trim().toLowerCase()
                    ? true
                    : 'A word cannot be a synonym of itself.',
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Second word (synonym)"
                  placeholder="e.g. wash"
                  fullWidth
                  error={!!errors.wordB}
                  helperText={errors.wordB?.message}
                />
              )}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              startIcon={<AddLinkIcon />}
              disabled={addSynonym.isPending}
            >
              Connect words
            </Button>
          </Stack>
        </Box>

        {addSynonym.isError && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => addSynonym.reset()}>
            {getApiErrorMessage(addSynonym.error, 'Could not add synonyms.')}
          </Alert>
        )}
        {successMessage && (
          <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
