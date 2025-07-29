// src/views/SettingsFormView.tsx
//-----------------------------------------------------------
// （保持原样，仅补充路径注释——本文件未改动）
//-----------------------------------------------------------

/** @jsxImportSource preact */
import { Formik, Form, Field } from 'formik';
import ThinkPlugin from '../main';

interface Props {
  /** 设置存储键；默认 'inputSettings' */
  storageKey?: string;
  plugin: ThinkPlugin;
}

/** 纯输入型模块：不含筛选/排序 */
export function SettingsFormView({ storageKey = 'inputSettings', plugin }: Props) {
  const init = (plugin as any)[storageKey] ?? {};

  return (
    <Formik
      initialValues={init}
      onSubmit={vals => {
        (plugin as any)[storageKey] = vals;
        plugin.persistAll().then(() => alert('已保存配置'));
      }}
    >
      {() => (
        <Form style="display:flex;flex-direction:column;gap:6px;max-width:420px;">
          <label>主题：<Field name="topic" placeholder="生活/健康" /></label>
          <label>图标 (emoji)：<Field name="icon" placeholder="✨" /></label>
          <label>任务字段清单：<Field name="taskFields" placeholder="status,icon,repeat" /></label>
          <label>Block 字段清单：<Field name="blockFields" placeholder="分类,周期,日期,主题…" /></label>
          <button type="submit" style="margin-top:8px;">💾 保存</button>
        </Form>
      )}
    </Formik>
  );
}