/** @jsxImportSource preact */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Button, Tooltip } from '@mui/material';
import ScannerIcon from '@mui/icons-material/Scanner';
import { ThemeScanDialog } from './ThemeScanDialog';
import type { 
    ScanResult, 
    ScanConfig, 
    ImportResult 
} from '../services/ThemeScanService';

/**
 * 主题导入按钮属性
 */
export interface ThemeImportButtonProps {
    /** 执行扫描回调 */
    onScan: (config: ScanConfig) => Promise<ScanResult>;
    /** 执行导入回调 */
    onImport: (themes: string[]) => Promise<ImportResult>;
    /** 是否禁用 */
    disabled?: boolean;
    /** 按钮文本 */
    children?: string;
    /** 工具提示 */
    tooltip?: string;
}

/**
 * 主题导入按钮组件
 */
export function ThemeImportButton({
    onScan,
    onImport,
    disabled = false,
    children = "扫描数据主题",
    tooltip = "从数据中扫描并导入新主题"
}: ThemeImportButtonProps) {
    const [dialogOpen, setDialogOpen] = useState(false);

    const handleClick = () => {
        setDialogOpen(true);
    };

    const handleClose = () => {
        setDialogOpen(false);
    };

    return (
        <>
            <Tooltip title={tooltip}>
                <Button
                    onClick={handleClick}
                    disabled={disabled}
                    variant="outlined"
                    size="small"
                    startIcon={<ScannerIcon />}
                >
                    {children}
                </Button>
            </Tooltip>

            <ThemeScanDialog
                open={dialogOpen}
                onClose={handleClose}
                onScan={onScan}
                onImport={onImport}
            />
        </>
    );
}
