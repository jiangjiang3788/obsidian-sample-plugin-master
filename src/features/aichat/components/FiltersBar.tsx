/** @jsxImportSource preact */
import { SimpleSelect, ThinkToggle } from '@shared/ui/public';
import { ThemeTreeSelect } from '@shared/components/public';
import type { ThemeDefinition } from '@core/types/public';

export interface BlockDefinition { id: string; name: string }

export interface FiltersBarProps {
    enableRetrieval: boolean;
    setEnableRetrieval: (enabled: boolean) => void;
    themes: ThemeDefinition[];
    selectedThemes: string[];
    setSelectedThemes: (themes: string[]) => void;
    selectedType: string;
    setSelectedType: (t: string) => void;
    blocks: BlockDefinition[];
    selectedBlockId: string;
    setSelectedBlockId: (id: string) => void;
    indexItemCount: number;
}

export function FiltersBar({
    enableRetrieval,
    setEnableRetrieval,
    themes,
    selectedThemes,
    setSelectedThemes,
    selectedType,
    setSelectedType,
    blocks,
    selectedBlockId,
    setSelectedBlockId,
    indexItemCount,
}: FiltersBarProps) {
    const typeOptions = [
        { value: '', label: '全部类型' },
        { value: 'task', label: '任务' },
        { value: 'block', label: '记录' },
    ];
    const blockOptions = [
        { value: '', label: '全部记录' },
        ...blocks.map((block) => ({ value: block.id, label: block.name })),
    ];

    return (
        <div className="think-ai-chat-filters">
            <ThinkToggle
                className="think-ai-chat-filters__toggle"
                checked={enableRetrieval}
                onChange={(event) => setEnableRetrieval((event.currentTarget as HTMLInputElement).checked)}
                label="引用上下文"
            />

            {enableRetrieval && themes.length > 0 ? (
                <div className="think-ai-chat-filters__theme">
                    <ThemeTreeSelect
                        themes={themes}
                        selectedPaths={selectedThemes}
                        onSelectMultiple={setSelectedThemes}
                        multiSelect
                        searchable
                        placeholder="主题"
                        size="small"
                    />
                </div>
            ) : null}

            {enableRetrieval ? (
                <SimpleSelect
                    className="think-ai-chat-filters__select"
                    value={selectedType}
                    options={typeOptions}
                    onChange={setSelectedType}
                    placeholder="全部类型"
                />
            ) : null}

            {enableRetrieval && selectedType === 'block' && blocks.length > 0 ? (
                <SimpleSelect
                    className="think-ai-chat-filters__select think-ai-chat-filters__select--block"
                    value={selectedBlockId}
                    options={blockOptions}
                    onChange={setSelectedBlockId}
                    placeholder="全部记录"
                />
            ) : null}

            {enableRetrieval ? <span className="think-ai-chat-filters__index">索引 {indexItemCount}</span> : null}
        </div>
    );
}
