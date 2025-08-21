// src/core/settings/ui/components/EditableAccordionList.tsx
/** @jsxImportSource preact */
import { h, ComponentChild } from 'preact';
import { Accordion, AccordionSummary, AccordionDetails, Box, Stack, Typography, IconButton, Tooltip } from '@mui/material';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

// 定义组件接收的 Props 类型
interface ItemWithId {
    id: string;
    [key: string]: any;
}

interface EditableAccordionListProps<T extends ItemWithId> {
    // 列表数据
    items: T[];
    // 从 item 中获取标题的函数
    getItemTitle: (item: T) => string;
    // 渲染手风琴展开内容的函数
    renderItem: (item: T) => ComponentChild;
    // 状态：当前展开的 item ID
    openId: string | null;
    // 更新展开 ID 的函数
    setOpenId: (id: string | null) => void;
    // 删除回调
    onDeleteItem: (id: string, name: string) => void;
    // 移动回调
    onMoveItem: (id: string, direction: 'up' | 'down') => void;
    // 复制回调
    onDuplicateItem: (id: string) => void;
    // 删除前的确认提示信息
    deleteConfirmationText?: (name: string) => string;
}

/**
 * @description 一个通用的、可编辑的手风琴列表UI组件。
 * 封装了列表渲染、展开/折叠、上移、下移、复制和删除的通用逻辑。
 */
export function EditableAccordionList<T extends ItemWithId>({
    items,
    getItemTitle,
    renderItem,
    openId,
    setOpenId,
    onDeleteItem,
    onMoveItem,
    onDuplicateItem,
    deleteConfirmationText,
}: EditableAccordionListProps<T>) {

    const handleDelete = (e: MouseEvent, item: T) => {
        e.stopPropagation();
        const title = getItemTitle(item);
        const confirmation = deleteConfirmationText
            ? deleteConfirmationText(title)
            : `确认删除 "${title}" 吗？`;
        if (confirm(confirmation)) {
            onDeleteItem(item.id, title);
        }
    };

    return (
        <Stack spacing={1}>
            {items.map((item, index) => {
                const title = getItemTitle(item);
                return (
                    <Accordion
                        key={item.id}
                        expanded={openId === item.id}
                        onChange={() => setOpenId(openId === item.id ? null : item.id)}
                        disableGutters
                        elevation={1}
                        sx={{ '&:before': { display: 'none' } }}
                    >
                        <AccordionSummary
                            sx={{
                                minHeight: 48,
                                '& .MuiAccordionSummary-content': { my: '12px', alignItems: 'center', justifyContent: 'space-between' },
                                cursor: 'pointer',
                            }}
                        >
                            <Typography fontWeight={500}>{title}</Typography>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                <Tooltip title="上移">
                                    <span>
                                        <IconButton size="small" sx={{ fontSize: '1.2em' }} disabled={index === 0} onClick={e => { e.stopPropagation(); onMoveItem(item.id, 'up'); }}>
                                            ▲
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip title="下移">
                                    <span>
                                        <IconButton size="small" sx={{ fontSize: '1.2em' }} disabled={index === items.length - 1} onClick={e => { e.stopPropagation(); onMoveItem(item.id, 'down'); }}>
                                            ▼
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip title={`复制"${title}"`}>
                                    <IconButton size="small" onClick={e => { e.stopPropagation(); onDuplicateItem(item.id); }}>
                                        <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={`删除"${title}"`}>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => handleDelete(e as unknown as MouseEvent, item)}
                                        sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                                    >
                                        <DeleteForeverOutlinedIcon />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                        </AccordionSummary>
                        <AccordionDetails sx={{ bgcolor: 'action.hover', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                            {/* 调用传入的渲染函数来渲染具体内容 */}
                            {renderItem(item)}
                        </AccordionDetails>
                    </Accordion>
                );
            })}
        </Stack>
    );
}