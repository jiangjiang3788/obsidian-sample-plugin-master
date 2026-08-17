/** @jsxImportSource preact */
import { SimpleSelect, ThinkToggle } from '@shared/ui/public';

export interface BlockDefinition { id: string; name: string }

export interface FiltersBarProps {
    enableRetrieval: boolean;
    setEnableRetrieval: (enabled: boolean) => void;
    goals: string[];
    selectedGoalPath: string;
    setSelectedGoalPath: (path: string) => void;
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
    goals,
    selectedGoalPath,
    setSelectedGoalPath,
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
    const goalOptions = [
        { value: '', label: '全部目标' },
        ...goals.map((path) => ({ value: path, label: path })),
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

            {enableRetrieval && goals.length > 0 ? (
                <SimpleSelect
                    className="think-ai-chat-filters__select"
                    value={selectedGoalPath}
                    options={goalOptions}
                    onChange={setSelectedGoalPath}
                    placeholder="全部目标"
                />
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
