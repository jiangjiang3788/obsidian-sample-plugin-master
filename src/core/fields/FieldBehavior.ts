import type { TemplateField } from '@/core/recordInput/CaptureTemplate';
import type { FieldInputType } from './FieldTypes';
import { normalizeImageValue } from './imageSemantics';
import { normalizeHierarchyPath } from './pathSemantics';
import { findMatchingOption, readOptionText } from '@/core/semantics/option';
import { parseTagList } from './tagSemantics';
import {
  getTemplateFieldInputType,
  isOptionObject,
  isTemplateImageField,
  isTemplateMultiValueField,
  isTemplatePathField,
  isTemplateRatingPairField,
  isTemplateTagField,
  normalizeTemplateFieldValue,
  type OptionLikeValue,
} from './TemplateFieldAdapter';

export type FieldBehaviorKind =
  | 'scalar'
  | 'option'
  | 'multiOption'
  | 'path'
  | 'multiPath'
  | 'tag'
  | 'multiTag'
  | 'image'
  | 'multiImage'
  | 'rating';

export interface FieldBehavior {
  kind: FieldBehaviorKind;
  inputTypes: FieldInputType[];
  normalize(field: Partial<TemplateField>, rawValue: unknown): unknown;
  matchOption(field: Partial<TemplateField>, rawValue: unknown): unknown;
  toArray(value: unknown): string[];
  toString(value: unknown): string;
}

const EMPTY_INPUT_TYPES: FieldInputType[] = [];
const OPTION_INPUT_TYPES: FieldInputType[] = ['select', 'radio', 'singleSelect'];
const MULTI_OPTION_INPUT_TYPES: FieldInputType[] = ['multiSelect'];
const PATH_INPUT_TYPES: FieldInputType[] = ['path', 'hierarchicalSingleSelect'];
const MULTI_PATH_INPUT_TYPES: FieldInputType[] = ['multiPath'];
const TAG_INPUT_TYPES: FieldInputType[] = ['tag'];
const MULTI_TAG_INPUT_TYPES: FieldInputType[] = ['multiTag'];
const IMAGE_INPUT_TYPES: FieldInputType[] = ['image'];
const MULTI_IMAGE_INPUT_TYPES: FieldInputType[] = ['multiImage'];
const RATING_INPUT_TYPES: FieldInputType[] = ['rating'];

function splitTextList(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(splitTextList);
  if (isOptionObject(value)) return splitTextList(value.value ?? value.label);
  if (value && typeof value === 'object' && 'src' in value) return splitTextList((value as { src?: unknown }).src);
  return String(value ?? '')
    .split(/[,，\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function templateFieldValueToString(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.map(templateFieldValueToString).filter(Boolean).join(', ');
  if (isOptionObject(value)) return String(value.value ?? value.label ?? '').trim();
  if (typeof value === 'object' && value && 'src' in value) return String((value as { src?: unknown }).src ?? '').trim();
  return String(value).trim();
}

export function templateFieldValueToArray(value: unknown): string[] {
  return Array.from(new Set(splitTextList(value)));
}

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function optionLabelFromPath(value: string): string {
  return value.split('/').filter(Boolean).pop() || value;
}

function normalizeOptionObjectForField(field: Partial<TemplateField>, rawValue: OptionLikeValue): OptionLikeValue {
  const text = readOptionText(rawValue);
  if (isTemplatePathField(field)) {
    const normalized = normalizeHierarchyPath(text.value || text.label);
    return normalized
      ? { value: normalized, label: String(text.label || optionLabelFromPath(normalized)) }
      : rawValue;
  }
  return { value: rawValue.value ?? text.value, label: rawValue.label ?? text.label ?? rawValue.value };
}

function findOption(field: Partial<TemplateField>, value: unknown): OptionLikeValue | undefined {
  const raw = templateFieldValueToString(value);
  if (!raw) return undefined;
  return findMatchingOption(field.options, value);
}

function normalizePathValue(value: unknown): string | undefined {
  return normalizeHierarchyPath(templateFieldValueToString(value));
}

function matchPathOption(field: Partial<TemplateField>, rawValue: unknown): unknown {
  const normalizedPath = normalizePathValue(rawValue);
  if (!normalizedPath) return rawValue;
  const matched = findMatchingOption(field.options, rawValue, { normalize: normalizeHierarchyPath, matchLeaf: true });
  return {
    value: normalizedPath,
    label: matched?.label || optionLabelFromPath(normalizedPath),
  };
}

function normalizeMultiPathValue(value: unknown): string[] {
  return templateFieldValueToArray(value)
    .map((part) => normalizeHierarchyPath(part))
    .filter((part): part is string => !!part);
}

function normalizeMultiImageValue(value: unknown): string[] {
  return templateFieldValueToArray(value)
    .map((part) => normalizeImageValue(part)?.src)
    .filter((src): src is string => !!src);
}

function matchSingleOption(field: Partial<TemplateField>, rawValue: unknown): unknown {
  if (isOptionObject(rawValue)) return normalizeOptionObjectForField(field, rawValue);
  const matched = findOption(field, rawValue);
  if (matched) return { value: matched.value, label: matched.label || matched.value };
  const inputType = getTemplateFieldInputType(field);
  if (inputType === 'rating' || isTemplateRatingPairField(field)) {
    const rawString = templateFieldValueToString(rawValue);
    return rawString ? { value: rawString, label: rawString } : rawValue;
  }
  return rawValue;
}

const scalarBehavior: FieldBehavior = {
  kind: 'scalar',
  inputTypes: EMPTY_INPUT_TYPES,
  normalize: (field, rawValue) => normalizeTemplateFieldValue(field, rawValue),
  matchOption: (_field, rawValue) => rawValue,
  toArray: templateFieldValueToArray,
  toString: templateFieldValueToString,
};

const pathBehavior: FieldBehavior = {
  kind: 'path',
  inputTypes: PATH_INPUT_TYPES,
  normalize: (field, rawValue) => normalizeTemplateFieldValue(field, rawValue),
  matchOption: matchPathOption,
  toArray: templateFieldValueToArray,
  toString: templateFieldValueToString,
};

const multiPathBehavior: FieldBehavior = {
  kind: 'multiPath',
  inputTypes: MULTI_PATH_INPUT_TYPES,
  normalize: (_field, rawValue) => normalizeMultiPathValue(rawValue),
  matchOption: (_field, rawValue) => normalizeMultiPathValue(rawValue),
  toArray: templateFieldValueToArray,
  toString: templateFieldValueToString,
};

const tagBehavior: FieldBehavior = {
  kind: 'tag',
  inputTypes: TAG_INPUT_TYPES,
  normalize: (_field, rawValue) => parseTagList(rawValue).join(', '),
  matchOption: (_field, rawValue) => rawValue,
  toArray: templateFieldValueToArray,
  toString: templateFieldValueToString,
};

const multiTagBehavior: FieldBehavior = {
  kind: 'multiTag',
  inputTypes: MULTI_TAG_INPUT_TYPES,
  normalize: (_field, rawValue) => parseTagList(rawValue),
  matchOption: (_field, rawValue) => parseTagList(rawValue),
  toArray: templateFieldValueToArray,
  toString: templateFieldValueToString,
};

const imageBehavior: FieldBehavior = {
  kind: 'image',
  inputTypes: IMAGE_INPUT_TYPES,
  normalize: (field, rawValue) => normalizeTemplateFieldValue(field, rawValue),
  matchOption: (_field, rawValue) => normalizeImageValue(rawValue)?.src ?? rawValue,
  toArray: templateFieldValueToArray,
  toString: templateFieldValueToString,
};

const multiImageBehavior: FieldBehavior = {
  kind: 'multiImage',
  inputTypes: MULTI_IMAGE_INPUT_TYPES,
  normalize: (_field, rawValue) => normalizeMultiImageValue(rawValue),
  matchOption: (_field, rawValue) => normalizeMultiImageValue(rawValue),
  toArray: templateFieldValueToArray,
  toString: templateFieldValueToString,
};

const optionBehavior: FieldBehavior = {
  kind: 'option',
  inputTypes: OPTION_INPUT_TYPES,
  normalize: (field, rawValue) => normalizeTemplateFieldValue(field, rawValue),
  matchOption: matchSingleOption,
  toArray: templateFieldValueToArray,
  toString: templateFieldValueToString,
};

const multiOptionBehavior: FieldBehavior = {
  kind: 'multiOption',
  inputTypes: MULTI_OPTION_INPUT_TYPES,
  normalize: (field, rawValue) => normalizeTemplateFieldValue(field, rawValue),
  matchOption: (_field, rawValue) => templateFieldValueToArray(rawValue),
  toArray: templateFieldValueToArray,
  toString: templateFieldValueToString,
};

const ratingBehavior: FieldBehavior = {
  kind: 'rating',
  inputTypes: RATING_INPUT_TYPES,
  normalize: (field, rawValue) => normalizeTemplateFieldValue(field, rawValue),
  matchOption: matchSingleOption,
  toArray: templateFieldValueToArray,
  toString: templateFieldValueToString,
};

export const FIELD_BEHAVIORS: Record<FieldBehaviorKind, FieldBehavior> = {
  scalar: scalarBehavior,
  option: optionBehavior,
  multiOption: multiOptionBehavior,
  path: pathBehavior,
  multiPath: multiPathBehavior,
  tag: tagBehavior,
  multiTag: multiTagBehavior,
  image: imageBehavior,
  multiImage: multiImageBehavior,
  rating: ratingBehavior,
};

export function getTemplateFieldBehaviorKind(field: Partial<TemplateField> | null | undefined): FieldBehaviorKind {
  if (!field) return 'scalar';
  const inputType = getTemplateFieldInputType(field);
  if (inputType === 'rating' || isTemplateRatingPairField(field)) return 'rating';
  if (isTemplatePathField(field)) return isTemplateMultiValueField(field) || inputType === 'multiPath' ? 'multiPath' : 'path';
  if (isTemplateTagField(field)) return isTemplateMultiValueField(field) || inputType === 'multiTag' ? 'multiTag' : 'tag';
  if (isTemplateImageField(field)) return isTemplateMultiValueField(field) || inputType === 'multiImage' ? 'multiImage' : 'image';
  if (inputType === 'multiSelect') return 'multiOption';
  if (OPTION_INPUT_TYPES.includes(inputType)) return 'option';
  return 'scalar';
}

export function getTemplateFieldBehavior(field: Partial<TemplateField> | null | undefined): FieldBehavior {
  return FIELD_BEHAVIORS[getTemplateFieldBehaviorKind(field)];
}

export function normalizeFieldValueByBehavior(field: Partial<TemplateField>, rawValue: unknown): unknown {
  if (isEmptyValue(rawValue)) return rawValue;
  return getTemplateFieldBehavior(field).normalize(field, rawValue);
}

export function matchTemplateFieldOptionValue(field: Partial<TemplateField>, rawValue: unknown): unknown {
  if (isEmptyValue(rawValue)) return rawValue;
  return getTemplateFieldBehavior(field).matchOption(field, rawValue);
}

export function normalizeBackfilledTemplateFieldValue(field: Partial<TemplateField>, rawValue: unknown): unknown {
  const normalized = normalizeFieldValueByBehavior(field, rawValue);
  return matchTemplateFieldOptionValue(field, normalized);
}
