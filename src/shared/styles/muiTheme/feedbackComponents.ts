import type { ThinkMuiComponents } from './types';

export const thinkMuiFeedbackComponents: ThinkMuiComponents = {
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: 'var(--think-radius-md, 8px)',
        color: 'var(--think-text-primary)',
      },
    },
  },
};
