// src/shared/components/dialogs/ActionDialog.tsx
/** @jsxImportSource preact */
import { h, VNode } from 'preact';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, Stack } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface ActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: VNode | string;
  actions?: VNode;
  fullWidth?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
}

export function ActionDialog({
  isOpen,
  onClose,
  title,
  children,
  actions,
  fullWidth = true,
  maxWidth = 'sm',
}: ActionDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth={fullWidth} maxWidth={maxWidth} disablePortal>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          {title}
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>{children}</DialogContent>
      {actions && <DialogActions>{actions}</DialogActions>}
    </Dialog>
  );
}