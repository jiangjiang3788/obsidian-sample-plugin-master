/** @jsxImportSource preact */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { TextField } from '@mui/material';
import type { InlineEditorProps } from './types';

export function InlineEditor({ value, onSave }: InlineEditorProps) {
    const [current, setCurrent] = useState(value);
    
    const handleBlur = () => { 
        if (current.trim() !== value) { 
            onSave(current.trim()); 
        }
    };
    
    const handleKeyDown = (e: any) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
        }
        if (e.key === 'Escape') { 
            setCurrent(value); 
            (e.target as HTMLInputElement).blur(); 
        }
    };
    
    return ( 
        <TextField 
            autoFocus 
            fullWidth 
            variant="standard" 
            value={current} 
            onChange={e => setCurrent((e.target as HTMLInputElement).value)} 
            onBlur={handleBlur} 
            onKeyDown={handleKeyDown} 
            sx={{ '& .MuiInput-input': { py: '4px' } }}
        />
    );
}
