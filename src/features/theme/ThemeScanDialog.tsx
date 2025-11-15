/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useEffect, useMemo } from 'preact/hooks';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Chip,
    Checkbox,
    FormControlLabel,
    FormGroup,
    Alert,
    LinearProgress,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Grid,
    Card,
    CardContent
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import type { 
    ScanResult, 
    ScanConfig, 
    ImportResult,
    ScanStats
} from '@core/theme-matrix/services/ThemeScanService';

/**
 * 主题扫描对话框属性
 */
export interface ThemeScanDialogProps {
    /** 是否打开 */
    open: boolean;
    /** 关闭回调 */
    onClose: () => void;
    /** 执行扫描回调 */
    onScan: (config: ScanConfig) => Promise<ScanResult>;
    /** 执行导入回调 */
    onImport: (themes: string[]) => Promise<ImportResult>;
    /** 初始扫描配置 */
    initialConfig?: Partial<ScanConfig>;
}

/**
 * 对话框状态
 */
type DialogState = 'config' | 'scanning' | 'results' | 'importing' | 'completed';

/**
 * 主题扫描对话框组件
 */
export function ThemeScanDialog({
    open,
    onClose,
    onScan,
    onImport,
    initialConfig = {}
}: ThemeScanDialogProps) {
    // 状态管理
    const [state, setState] = useState<DialogState>('config');
    const [scanConfig, setScanConfig] = useState<ScanConfig>({
        includeTasks: true,
        includeBlocks: true,
        minUsageCount: 1,
        ...initialConfig
    });
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set());
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // 重置状态
    const resetDialog = () => {
        setState('config');
        setScanResult(null);
        setSelectedThemes(new Set());
        setImportResult(null);
        setError(null);
    };

    // 当对话框关闭时重置状态
    useEffect(() => {
        if (!open) {
            resetDialog();
        }
    }, [open]);

    // 当扫描结果改变时，默认选择所有新主题
    useEffect(() => {
        if (scanResult) {
            setSelectedThemes(new Set(scanResult.deduplicationResult.newThemes));
        }
    }, [scanResult]);

    // 执行扫描
    const handleScan = async () => {
        try {
            setState('scanning');
            setError(null);
            const result = await onScan(scanConfig);
            setScanResult(result);
            setState('results');
        } catch (err) {
            setError(`扫描失败: ${err}`);
            setState('config');
        }
    };

    // 执行导入
    const handleImport = async () => {
        if (!scanResult || selectedThemes.size === 0) return;

        try {
            setState('importing');
            setError(null);
            const result = await onImport(Array.from(selectedThemes));
            setImportResult(result);
            setState('completed');
        } catch (err) {
            setError(`导入失败: ${err}`);
            setState('results');
        }
    };

    // 切换主题选择
    const toggleThemeSelection = (theme: string) => {
        const newSelected = new Set(selectedThemes);
        if (newSelected.has(theme)) {
            newSelected.delete(theme);
        } else {
            newSelected.add(theme);
        }
        setSelectedThemes(newSelected);
    };

    // 全选/取消全选
    const handleSelectAll = (checked: boolean) => {
        if (!scanResult) return;
        if (checked) {
            setSelectedThemes(new Set(scanResult.deduplicationResult.newThemes));
        } else {
            setSelectedThemes(new Set());
        }
    };

    // 计算选择统计
    const selectionStats = useMemo(() => {
        if (!scanResult) return { selected: 0, total: 0 };
        return {
            selected: selectedThemes.size,
            total: scanResult.deduplicationResult.newThemes.length
        };
    }, [selectedThemes, scanResult]);

    // 渲染配置阶段
    const renderConfigStep = () => (
        <Box>
            <Typography variant="h6" gutterBottom>
                扫描配置
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                配置扫描参数，决定从哪些数据源提取主题信息。
            </Typography>

            <FormGroup sx={{ mb: 2 }}>
                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <input
                        type="checkbox"
                        checked={scanConfig.includeTasks}
                        onChange={(e) => setScanConfig(prev => ({
                            ...prev,
                            includeTasks: (e.target as HTMLInputElement).checked
                        }))}
                        style={{ marginRight: '8px' }}
                    />
                    包含任务主题
                </label>
                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <input
                        type="checkbox"
                        checked={scanConfig.includeBlocks}
                        onChange={(e) => setScanConfig(prev => ({
                            ...prev,
                            includeBlocks: (e.target as HTMLInputElement).checked
                        }))}
                        style={{ marginRight: '8px' }}
                    />
                    包含Block主题
                </label>
            </FormGroup>

            <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                    最小使用次数: {scanConfig.minUsageCount}
                </Typography>
                <input
                    type="range"
                    min="1"
                    max="10"
                    value={scanConfig.minUsageCount}
                    onChange={(e) => setScanConfig(prev => ({
                        ...prev,
                        minUsageCount: parseInt((e.target as HTMLInputElement).value)
                    }))}
                    style={{ width: '100%' }}
                />
                <Typography variant="caption" color="text.secondary">
                    只扫描使用次数不少于此值的主题
                </Typography>
            </Box>

            {(!scanConfig.includeTasks && !scanConfig.includeBlocks) && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                    必须至少选择一种数据源类型
                </Alert>
            )}
        </Box>
    );

    // 渲染扫描统计
    const renderScanStats = (stats: ScanStats) => {
        const AnyGrid = Grid as any;
        const AnyCard = Card as any;
        const AnyCardContent = CardContent as any;
        
        return (
            <AnyGrid container spacing={2} sx={{ mb: 2 }}>
                <AnyGrid item xs={6} sm={3}>
                    <AnyCard variant="outlined">
                        <AnyCardContent sx={{ textAlign: 'center', py: 1 }}>
                            <Typography variant="h6" color="primary">
                                {stats.totalItems}
                            </Typography>
                            <Typography variant="caption">
                                总数据项
                            </Typography>
                        </AnyCardContent>
                    </AnyCard>
                </AnyGrid>
                <AnyGrid item xs={6} sm={3}>
                    <AnyCard variant="outlined">
                        <AnyCardContent sx={{ textAlign: 'center', py: 1 }}>
                            <Typography variant="h6" color="primary">
                                {stats.uniqueThemes}
                            </Typography>
                            <Typography variant="caption">
                                发现主题
                            </Typography>
                        </AnyCardContent>
                    </AnyCard>
                </AnyGrid>
                <AnyGrid item xs={6} sm={3}>
                    <AnyCard variant="outlined">
                        <AnyCardContent sx={{ textAlign: 'center', py: 1 }}>
                            <Typography variant="h6" color="success.main">
                                {stats.newThemes}
                            </Typography>
                            <Typography variant="caption">
                                新主题
                            </Typography>
                        </AnyCardContent>
                    </AnyCard>
                </AnyGrid>
            </AnyGrid>
        );
    };

    // 渲染结果阶段
    const renderResultsStep = () => {
        if (!scanResult) return null;

        return (
            <Box>
                <Typography variant="h6" gutterBottom>
                    扫描结果
                </Typography>

                {renderScanStats(scanResult.stats)}

                {scanResult.deduplicationResult.newThemes.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle1">
                                新发现的主题 ({selectionStats.selected}/{selectionStats.total})
                            </Typography>
                            <label style={{ display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={selectionStats.selected === selectionStats.total && selectionStats.total > 0}
                                    ref={(el) => {
                                        if (el) {
                                            el.indeterminate = selectionStats.selected > 0 && selectionStats.selected < selectionStats.total;
                                        }
                                    }}
                                    onChange={(e) => handleSelectAll((e.target as HTMLInputElement).checked)}
                                    style={{ marginRight: '8px' }}
                                />
                                全选
                            </label>
                        </Box>

                        <div style={{ marginLeft: '16px' }}>
                            {scanResult.deduplicationResult.newThemes.map((theme) => (
                                <div key={theme} style={{ display: 'flex', alignItems: 'center', padding: '8px 0' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedThemes.has(theme)}
                                        onChange={() => toggleThemeSelection(theme)}
                                        style={{ marginRight: '12px' }}
                                    />
                                    <span style={{ fontSize: '14px' }}>{theme}</span>
                                </div>
                            ))}
                        </div>
                    </Box>
                )}

                {scanResult.deduplicationResult.newThemes.length === 0 && (
                    <Alert severity="info">
                        没有发现新的主题。所有扫描到的主题都已存在于系统中。
                    </Alert>
                )}
            </Box>
        );
    };

    // 渲染完成阶段
    const renderCompletedStep = () => {
        if (!importResult) return null;

        return (
            <Box>
                <Typography variant="h6" gutterBottom>
                    导入完成
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Box sx={{ flex: 1, textAlign: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                        <Typography variant="h6" color="success.main">
                            {importResult.imported}
                        </Typography>
                        <Typography variant="caption">
                            成功导入
                        </Typography>
                    </Box>
                    <Box sx={{ flex: 1, textAlign: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                        <Typography variant="h6" color="warning.main">
                            {importResult.skipped}
                        </Typography>
                        <Typography variant="caption">
                            跳过
                        </Typography>
                    </Box>
                    <Box sx={{ flex: 1, textAlign: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                        <Typography variant="h6" color="error.main">
                            {importResult.failed}
                        </Typography>
                        <Typography variant="caption">
                            失败
                        </Typography>
                    </Box>
                </Box>

                {importResult.errors.length > 0 && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            导入错误:
                        </Typography>
                        <ul style={{ margin: 0, paddingLeft: '20px' }}>
                            {importResult.errors.map((error, index) => (
                                <li key={index}>{error}</li>
                            ))}
                        </ul>
                    </Alert>
                )}

                {importResult.imported > 0 && (
                    <Alert severity="success">
                        成功导入 {importResult.imported} 个新主题！它们现在可以在主题配置矩阵中使用。
                    </Alert>
                )}
            </Box>
        );
    };

    // 渲染操作按钮
    const renderActions = () => {
        switch (state) {
            case 'config':
                return (
                    <>
                        <Button onClick={onClose} startIcon={<CloseIcon />}>
                            取消
                        </Button>
                        <Button
                            onClick={handleScan}
                            variant="contained"
                            startIcon={<RefreshIcon />}
                            disabled={!scanConfig.includeTasks && !scanConfig.includeBlocks}
                        >
                            开始扫描
                        </Button>
                    </>
                );
            case 'scanning':
                return (
                    <Button disabled>
                        扫描中...
                    </Button>
                );
            case 'results':
                return (
                    <>
                        <Button onClick={() => setState('config')} startIcon={<RefreshIcon />}>
                            重新扫描
                        </Button>
                        <Button onClick={onClose}>
                            取消
                        </Button>
                        <Button
                            onClick={handleImport}
                            variant="contained"
                            startIcon={<DownloadIcon />}
                            disabled={selectedThemes.size === 0}
                        >
                            导入选中主题 ({selectedThemes.size})
                        </Button>
                    </>
                );
            case 'importing':
                return (
                    <Button disabled>
                        导入中...
                    </Button>
                );
            case 'completed':
                return (
                    <>
                        <Button onClick={() => setState('config')} startIcon={<RefreshIcon />}>
                            再次扫描
                        </Button>
                        <Button onClick={onClose} variant="contained" startIcon={<CheckCircleIcon />}>
                            完成
                        </Button>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: { minHeight: '400px' }
            }}
        >
            <DialogTitle>
                扫描数据主题
                {state === 'scanning' && <LinearProgress sx={{ mt: 1 }} />}
                {state === 'importing' && <LinearProgress sx={{ mt: 1 }} />}
            </DialogTitle>

            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {state === 'config' && renderConfigStep()}
                {state === 'scanning' && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography>正在扫描数据中的主题...</Typography>
                    </Box>
                )}
                {state === 'results' && renderResultsStep()}
                {state === 'importing' && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography>正在导入选中的主题...</Typography>
                    </Box>
                )}
                {state === 'completed' && renderCompletedStep()}
            </DialogContent>

            <DialogActions>
                {renderActions()}
            </DialogActions>
        </Dialog>
    );
}
