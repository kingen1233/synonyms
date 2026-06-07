import type { SxProps, Theme } from '@mui/material';
import { IconButton, Stack, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';

interface WordActionButtonsProps {
  onRename: () => void;
  onDelete: () => void;
  size?: 'small' | 'medium';
  sx?: SxProps<Theme>;
}

export function WordActionButtons({
  onRename,
  onDelete,
  size = 'small',
  sx,
}: WordActionButtonsProps) {
  return (
    <Stack direction="row" sx={sx}>
      <Tooltip title="Rename word">
        <IconButton size={size} onClick={onRename}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete word">
        <IconButton size={size} color="error" onClick={onDelete}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
