// src/shared/ui/SimpleSelect.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import { Box, Typography } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

// 定义组件接收的props类型
type SimpleSelectProps = {
    value: string;
    options: Array<{ value: string; label: string }>;
    onChange: (newValue: string) => void;
    placeholder?: string;
    fullWidth?: boolean;
    sx?: object;
};

export function SimpleSelect({ value, options, onChange, placeholder, fullWidth, sx }: SimpleSelectProps) {
    // 状态：控制下拉菜单是否展开
    const [isOpen, setIsOpen] = useState(false);
    // Ref：用于获取组件根元素的引用，以判断点击事件是否发生在组件外部
    const wrapperRef = useRef<HTMLDivElement>(null);

    // 获取当前选中项的显示标签
    const selectedLabel = options.find(opt => opt.value === value)?.label || value;

    // 处理外部点击事件
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            // 如果菜单是打开的，并且点击的位置不在组件内部，则关闭菜单
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        // 监听全局的mousedown事件
        document.addEventListener('mousedown', handleClickOutside);
        // 组件卸载时移除监听，防止内存泄漏
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [wrapperRef]); // 依赖项是ref本身

    // 处理选择一个选项
    const handleOptionClick = (optionValue: string) => {
        onChange(optionValue); // 调用父组件传入的回调
        setIsOpen(false); // 关闭菜单
    };

    return (
        <Box
            ref={wrapperRef}
            sx={{
                position: 'relative',
                width: fullWidth ? '100%' : 'auto',
                ...sx
            }}
        >
            {/* 显示当前值的区域 */}
            <Box
                onClick={() => setIsOpen(!isOpen)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    height: '36px',
                    border: '1px solid rgba(0,0,0,0.15)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    cursor: 'pointer',
                    bgcolor: '#fff',
                    '&:hover': {
                        borderColor: 'rgba(0,0,0,0.4)',
                    },
                }}
            >
                <Typography sx={{ fontSize: 13, color: value ? 'text.primary' : 'text.secondary' }}>
                    {value ? selectedLabel : (<em>{placeholder}</em>)}
                </Typography>
                <ArrowDropDownIcon sx={{ color: 'text.secondary', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </Box>

            {/* 下拉选项列表 */}
            {isOpen && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        mt: '4px',
                        bgcolor: 'background.paper',
                        border: '1px solid rgba(0,0,0,0.1)',
                        borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 1300, // 确保在其他元素之上
                    }}
                >
                    {options.map(option => (
                        <Box
                            key={option.value}
                            onClick={() => handleOptionClick(option.value)}
                            sx={{
                                padding: '8px 12px',
                                fontSize: 13,
                                cursor: 'pointer',
                                '&:hover': {
                                    bgcolor: 'action.hover',
                                },
                                ...(value === option.value && {
                                    bgcolor: 'action.selected',
                                    fontWeight: 500,
                                }),
                            }}
                        >
                            {option.label}
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
}