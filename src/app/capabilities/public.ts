/** Public composition boundary for app capabilities and feature boot contracts. */
export { CapabilityRegistry } from './CapabilityRegistry';
export type { CapabilityFactory, CapabilityRegistryOptions } from './CapabilityRegistry';
export { createCapabilities, createDefaultCapabilityRegistry } from './createCapabilities';
export type { Capabilities, CapabilityMap, CapabilityDeps } from './types';
export { FeatureRegistry } from '../FeatureRegistry';
export type { Feature, FeatureBootMode, FeatureBootResult, FeatureDisposer, FeatureRegistryOptions } from '../FeatureRegistry';
export type { UIFeatureBootContext } from '../features/featureContext';
