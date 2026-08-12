/** Store contract consumed by application use cases without importing the usecase barrel. */
export type AppStoreApi = ReturnType<typeof import('@/app/store/useAppStore').createAppStore>;
