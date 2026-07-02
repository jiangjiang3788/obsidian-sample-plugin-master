import type { ExportViewConfig } from './types';

export const BLOCK_EXPORT_DEFAULT_CONFIG: ExportViewConfig = {
  groupFields: ['filename', 'categoryKey'],
  groupTitlePrefix: '',
  useMarkdownHeadingForGroup: true,
  idTemplate: 'ID {{index}}/{{filename}}#{{id}}',
  detailFields: ['categoryKey', 'date', 'rating', 'pintu', 'content'],
  fieldLabels: {
    categoryKey: '分类',
    date: '日期',
    rating: '评分',
    pintu: '评图',
    content: '内容',
    fullData: '完整数据',
  },
  fieldRender: {
    pintu: { type: 'emojiOrLink' },
    content: { type: 'content' },
    fullData: { type: 'content' },
  },
};

export const EVENT_TIMELINE_EXPORT_CONFIG: ExportViewConfig = {
  groupFields: ['date', 'categoryKey'],
  groupTitlePrefix: '',
  useMarkdownHeadingForGroup: true,
  idTemplate: 'ID {{index}}/{{filename}}#{{id}}',
  detailFields: ['title', 'date', 'categoryKey', 'content'],
  fieldLabels: {
    title: '标题',
    date: '日期',
    categoryKey: '分类',
    content: '内容',
    fullData: '完整数据',
  },
  fieldRender: {
    content: { type: 'content' },
    fullData: { type: 'content' },
  },
};

export const EXCEL_EXPORT_CONFIG: ExportViewConfig = {
  groupFields: ['categoryKey', 'date'],
  groupTitlePrefix: '',
  useMarkdownHeadingForGroup: true,
  idTemplate: 'ID {{index}}/{{filename}}#{{id}}',
  detailFields: ['title', 'date', 'categoryKey', 'content'],
  fieldLabels: {
    title: '标题',
    date: '日期',
    categoryKey: '分类',
    content: '内容',
    fullData: '完整数据',
  },
  fieldRender: {
    content: { type: 'content' },
    fullData: { type: 'content' },
  },
};

export const STATISTICS_EXPORT_CONFIG: ExportViewConfig = {
  groupFields: ['period', 'categoryKey'],
  groupTitlePrefix: '',
  useMarkdownHeadingForGroup: true,
  idTemplate: 'ID {{index}}/{{filename}}#{{id}}',
  detailFields: ['title', 'date', 'categoryKey', 'period', 'content'],
  fieldLabels: {
    title: '标题',
    date: '日期',
    categoryKey: '分类',
    period: '周期',
    content: '内容',
    fullData: '完整数据',
  },
  fieldRender: {
    content: { type: 'content' },
    fullData: { type: 'content' },
  },
};

export const HEATMAP_EXPORT_CONFIG: ExportViewConfig = {
  groupFields: ['date', 'categoryKey'],
  groupTitlePrefix: '',
  useMarkdownHeadingForGroup: true,
  idTemplate: 'ID {{index}}/{{filename}}#{{id}}',
  detailFields: ['date', 'categoryKey', 'rating', 'content'],
  fieldLabels: {
    date: '日期',
    categoryKey: '分类',
    rating: '评分',
    content: '内容',
    fullData: '完整数据',
  },
  fieldRender: {
    content: { type: 'content' },
    fullData: { type: 'content' },
  },
};

export const TIMELINE_EXPORT_CONFIG: ExportViewConfig = {
  groupFields: ['filename', 'categoryKey'],
  groupTitlePrefix: '',
  useMarkdownHeadingForGroup: true,
  idTemplate: 'ID {{index}}/{{filename}}#{{id}}',
  detailFields: ['title', 'startTime', 'endTime', 'duration', 'categoryKey', 'content'],
  fieldLabels: {
    title: '标题',
    startTime: '开始时间',
    endTime: '结束时间',
    duration: '时长',
    categoryKey: '分类',
    content: '内容',
    fullData: '完整数据',
  },
  fieldRender: {
    content: { type: 'content' },
    fullData: { type: 'content' },
  },
};

export const TABLE_EXPORT_CONFIG: ExportViewConfig = {
  groupFields: ['categoryKey', 'date'],
  groupTitlePrefix: '',
  useMarkdownHeadingForGroup: true,
  idTemplate: 'ID {{index}}/{{filename}}#{{id}}',
  detailFields: ['title', 'date', 'categoryKey', 'content'],
  fieldLabels: {
    title: '标题',
    date: '日期',
    categoryKey: '分类',
    content: '内容',
    fullData: '完整数据',
  },
  fieldRender: {
    content: { type: 'content' },
    fullData: { type: 'content' },
  },
};
