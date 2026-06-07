import { Alert, Snackbar } from '@mui/material';

interface SuccessSnackbarProps {
  message: string | null;
  onClose: () => void;
}

/** Displays a transient success toast anchored at the bottom-centre of the screen. */
export function SuccessSnackbar({ message, onClose }: SuccessSnackbarProps) {
  return (
    <Snackbar
      open={message !== null}
      autoHideDuration={3000}
      // Ignore clickaway so the snackbar isn't dismissed by accidental background clicks.
      onClose={(_event, reason) => {
        if (reason !== 'clickaway') onClose();
      }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert severity="success" variant="filled" onClose={onClose} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
}
