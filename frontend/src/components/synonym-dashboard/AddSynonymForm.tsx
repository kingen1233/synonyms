import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Card, CardContent, Stack, TextField } from '@mui/material';
import AddLinkIcon from '@mui/icons-material/AddLink';
import { useAddSynonym } from '../../api/generated/synonyms/synonyms';
import type { AddSynonymRequest } from '../../api/generated/model';
import { getApiErrorMessage } from '../../api/errors';
import { CardHeader } from '../shared/CardHeader';
import { SuccessSnackbar } from '../shared/SuccessSnackbar';

export function AddSynonymForm() {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddSynonymRequest>({ defaultValues: { wordA: '', wordB: '' } });

  const addSynonym = useAddSynonym({
    mutation: {
      onSuccess: (_data, variables) => {
        setSuccessMessage(`Linked “${variables.data.wordA}” ↔ “${variables.data.wordB}”.`);

        queryClient.invalidateQueries();
        reset();
      },
    },
  });

  const onSubmit = (values: AddSynonymRequest) => {
    setSuccessMessage(null);
    addSynonym.mutate({ data: values });
  };

  return (
    <Card>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', p: 3 }}>
        <CardHeader
          icon={<AddLinkIcon fontSize="small" />}
          title="Add synonym pair"
          tone="indigo"
        />

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ flexGrow: 1 }}>
          <Stack spacing={2}>
            <Controller
              name="wordA"
              control={control}
              rules={{
                required: 'Required',
                maxLength: { value: 100, message: 'Max 100 characters' },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Word"
                  placeholder="e.g. Clean"
                  fullWidth
                  error={Boolean(errors.wordA)}
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
                validate: (value, form) =>
                  value.trim().toLowerCase() !== form.wordA.trim().toLowerCase()
                    ? true
                    : 'A word cannot be a synonym of itself.',
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Synonym"
                  placeholder="e.g. Wash"
                  fullWidth
                  error={Boolean(errors.wordB)}
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
        <SuccessSnackbar message={successMessage} onClose={() => setSuccessMessage(null)} />
      </CardContent>
    </Card>
  );
}
