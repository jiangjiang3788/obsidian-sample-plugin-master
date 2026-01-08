import { StateCreator } from 'zustand';

export interface UiSlice {
    ui: {
        isTimerWidgetVisible: boolean;
        setTimerWidgetVisible: (visible: boolean) => void;
        toggleTimerWidgetVisible: () => void;
    };
}

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (set) => ({
    ui: {
        isTimerWidgetVisible: false,
        setTimerWidgetVisible: (visible) => set((state) => ({
            ui: { ...state.ui, isTimerWidgetVisible: visible }
        })),
        toggleTimerWidgetVisible: () => set((state) => ({
            ui: { ...state.ui, isTimerWidgetVisible: !state.ui.isTimerWidgetVisible }
        })),
    },
});
