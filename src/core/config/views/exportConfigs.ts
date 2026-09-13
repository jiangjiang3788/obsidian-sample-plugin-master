import type { ExportViewConfig } from './types';

export const BLOCK_EXPORT_DEFAULT_CONFIG: ExportViewConfig = {
  groupFields: ['filename', 'recordType'],
  groupTitlePrefix: '',
  useMarkdownHeadingForGroup: true,
  idTemplate: 'ID {{index}}/{{filename}}#{{id}}',
  detailFields: ['recordType', 'date', 'rating', 'image', 'content'],
  fieldLabels: {
    recordType: '记录类型',
    date: '日期',
    rating: '评分',
    image: '图片',
    content: '内容',
    fullData: '完整数据',
  },
  fieldRender: {
    image: { type: 'emojiOrLink' },
    content: { type: 'content' },
    fullData: { type: 'content' },
  },
};

export const EVENT_TIMELINE_EXPORT_CONFIG: ExportViewConfig = {
  groupFields: ['date', 'recordType'],
  groupTitlePrefix: '',
  useMarkdownHeadingForGroup: true,
  idTemplate: 'ID {{index}}/{{filename}}#{{id}}',
  detailFields: ['title', 'date', 'recordType', 'content'],
  fieldLabels: {
    title: '标题',
    date: '日期',
    recordType: '记录类型',
    content: '内容',
    fullData: '完整数据',
  },
  fieldRender: {
    content: { type: 'content' },
    fullData: { type: 'content' },
  },
};

export const EXCEL_EXPORT_CONFIG: ExportViewConfig = {
  groupFields: ['recordType', 'date'],
  groupTitlePrefix: '',
  useMarkdownHeadingForGroup: true,
  idTemplate: 'ID {{index}}/{{filename}}#{{id}}',
  detailFields: ['title', 'date', 'recordType', 'content'],
  fieldLabels: {
    title: '标题',
    date: '日期',
    recordType: '记录类型',
    content: '内容',
    fullData: '完整数据',
  },
  fieldRender: {
    content: { type: 'content' },
    fullData: { type: 'content' },
  },
};

export const STATISTICS_EXPORT_CONFIG: ExportViewConfig = {
  groupFields: ['period', 'recordType'],
  groupTitlePrefix: '',
  useMarkdownHeadingForGroup: true,
  idTemplate: 'ID {{index}}/{{filename}}#{{id}}',
  detailFields: ['title', 'date', 'recordType', 'period', 'content'],
  fieldLabels: {
    title: '标题',
    date: '日期',
    recordType: '记录类型',
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
  groupFields: ['date', 'recordType'],
  groupTitlePrefix: '',
  useMarkdownHeadingForGroup: true,
  idTemplate: 'ID {{index}}/{{filename}}#{{id}}',
  detailFields: ['date', 'recordType', 'rating', 'content'],
  fieldLabels: {
    date: '日期',
    recordType: '记录类型',
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
  groupFields: ['filename', 'recordType'],
  groupTitlePrefix: '',
  useMarkdownHeadingForGroup: true,
  idTemplate: 'ID {{index}}/{{filename}}#{{id}}',
  detailFields: ['title', 'startTime', 'endTime', 'duration', 'recordType', 'content'],
  fieldLabels: {
    title: '标题',
    startTime: '开始时间',
    endTime: '结束时间',
    duration: '时长',
    recordType: '记录类型',
    content: '内容',
    fullData: '完整数据',
  },
  fieldRender: {
    content: { type: 'content' },
    fullData: { type: 'content' },
  },
};

export const TABLE_EXPORT_CONFIG: ExportViewConfig = {
  groupFields: ['recordType', 'date'],
  groupTitlePrefix: '',
  useMarkdownHeadingForGroup: true,
  idTemplate: 'ID {{index}}/{{filename}}#{{id}}',
  detailFields: ['title', 'date', 'recordType', 'content'],
  fieldLabels: {
    title: '标题',
    date: '日期',
    recordType: '记录类型',
    content: '内容',
    fullData: '完整数据',
  },
  fieldRender: {
    content: { type: 'content' },
    fullData: { type: 'content' },
  },
};
