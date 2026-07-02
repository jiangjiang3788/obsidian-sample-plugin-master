export type FloatingDomHandler = (event: MouseEvent | TouchEvent) => void;

export const toDomListener = (handler: FloatingDomHandler): EventListener => handler as unknown as EventListener;
export const toMouseEvent = (event: unknown): MouseEvent => event as MouseEvent;
export const toTouchEvent = (event: unknown): TouchEvent => event as TouchEvent;
