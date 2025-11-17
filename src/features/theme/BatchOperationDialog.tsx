/** @jsxImportSource preact */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Stack,
    FormControlLabel,
    Switch,
    Button
} from '@mui/material';
import type { BatchOperationDialogProps } from './index';

export function BatchOperationDialog({ 
    open, 
    onClose, 
    selectedCount, 
    onConfirm 
}: BatchOperationDialogProps) {
    const [operation, setOperation] = useState<'activate' | 'archive' | 'delete'>('activate');
    
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>批量操作</DialogTitle>
            <DialogContent>
                <Typography variant="body2" sx={{ mb: 2 }}>
                    已选择 {selectedCount} 个主题
                </Typography>
                <Stack spacing={2}>
                    <FormControlLabel
                        control={<Switch checked={operation === 'activate'} onChange={() => setOperation('activate')} />}
                        label="批量激活"
                    />
                    <FormControlLabel
                        control={<Switch checked={operation === 'archive'} onChange={() => setOperation('archive')} />}
                        label="批量归档"
                    />
                    <FormControlLabel
                        control={<Switch checked={operation === 'delete'} onChange={() => setOperation('delete')} />}
                        label="批量删除（仅限非预定义主题）"
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>取消</Button>
                <Button onClick={() => { onConfirm(operation); onClose(); }} variant="contained">
                    确认
                </Button>
            </DialogActions>
        </Dialog>
    );
}
