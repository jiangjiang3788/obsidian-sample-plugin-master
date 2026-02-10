// src/shared/hooks/useIsMounted.ts
/** @jsxImportSource preact */

import { useEffect, useRef } from 'preact/hooks';

/**
 * useIsMounted
 * - 避免组件卸载后 setState
 */
export function useIsMounted() {
    const ref = useRef(true);

    useEffect(() => {
        ref.current = true;
        return () => {
            ref.current = false;
        };
    }, []);

    return ref;
}
