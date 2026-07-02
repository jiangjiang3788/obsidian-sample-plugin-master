import type { ThinkMuiComponents } from './types';
import { thinkMuiControlComponents } from './controlComponents';
import { thinkMuiFeedbackComponents } from './feedbackComponents';
import { thinkMuiFormComponents } from './formComponents';
import { thinkMuiNavigationComponents } from './navigationComponents';
import { thinkMuiOverlayComponents } from './overlayComponents';
import { thinkMuiSurfaceComponents } from './surfaceComponents';

export const thinkMuiComponents: ThinkMuiComponents = {
  ...thinkMuiControlComponents,
  ...thinkMuiFormComponents,
  ...thinkMuiSurfaceComponents,
  ...thinkMuiNavigationComponents,
  ...thinkMuiOverlayComponents,
  ...thinkMuiFeedbackComponents,
};
