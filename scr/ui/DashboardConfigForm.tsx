// scr/ui/DashboardConfigForm.tsx
/** @jsxImportSource preact */

import { Formik, Form, Field, FieldArray } from 'formik';
import { DashboardConfig, ModuleConfig } from '../config/schema';
import { VIEW_OPTIONS } from '../views';

interface Props {
  dashboard:  DashboardConfig;          // 传克隆体
  dashboards: DashboardConfig[];        // 用于校验“名称唯一”
  onSave:    (d: DashboardConfig) => void;
  onCancel:  () => void;
}

export function DashboardConfigForm({ dashboard, dashboards, onSave, onCancel }: Props) {
  const isNameUnique = (name: string) =>
    dashboards.every(d => d === dashboard || d.name !== name);

  return (
    <Formik
      initialValues={{
        ...dashboard,
        tags: dashboard.tags?.join(',') || '',
      }}
      validate={vals => {
        const err: Record<string, string> = {};
        if (!vals.name.trim()) err.name = '名称不能为空';
        else if (!isNameUnique(vals.name.trim())) err.name = '名称已存在';
        return err;
      }}
      onSubmit={vals => {
        const cleaned: DashboardConfig = {
          ...dashboard,
          ...vals,
          tags: vals.tags
            .split(/[,，]/)
            .map(t => t.trim())
            .filter(Boolean),
        };
        onSave(cleaned);
      }}
    >
      {({ values, errors, touched }) => (
        <Form style="display:flex;flex-direction:column;gap:8px;">
          <label>
            仪表盘名称：
            <Field name="name" />
            {errors.name && touched.name && (
              <span style="color:red;margin-left:4px;">{errors.name}</span>
            )}
          </label>

          <label>数据源路径：<Field name="path" /></label>

          <label>标签 (逗号分隔)：<Field name="tags" /></label>

          <label>
            初始视图：
            <Field name="initialView" as="select">
              {['年','季','月','周','天'].map(v => (
                <option value={v}>{v}</option>
              ))}
            </Field>
          </label>

          <label>初始日期：<Field name="initialDate" type="date" /></label>

          {/* 模块列表 */}
          <FieldArray name="modules">
            {({ remove, push }) => (
              <div style="border-top:1px solid #ddd;padding-top:8px;">
                <strong>模块列表</strong>
                {values.modules.map((mod: ModuleConfig, idx: number) => (
                  <details key={idx} open style="margin-bottom:6px;">
                    <summary style="cursor:pointer;">
                      {mod.title || `模块 ${idx + 1}`} ({mod.view})
                    </summary>

                    <div style="display:flex;flex-direction:column;gap:4px;margin-left:12px;">
                      <label>标题：<Field name={`modules.${idx}.title`} /></label>

                      <label>
                        视图：
                        <Field name={`modules.${idx}.view`} as="select">
                          {VIEW_OPTIONS.map(v => (
                            <option value={v}>{v}</option>
                          ))}
                        </Field>
                      </label>

                      <label>
                        默认折叠：
                        <Field
                          name={`modules.${idx}.collapsed`}
                          type="checkbox"
                        />
                      </label>

                      {/* 如需扩展 props / fields / filters / sort，可继续在此添加 Field/FieldArray */}

                      <button
                        type="button"
                        style="margin-top:4px;"
                        onClick={() => remove(idx)}
                      >
                        删除模块
                      </button>
                    </div>
                  </details>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    push({
                      view: 'BlockView',
                      title: '新模块',
                      collapsed: false,
                      filters: [],
                      sort: [],
                      props: {},
                    })
                  }
                >
                  + 添加模块
                </button>
              </div>
            )}
          </FieldArray>

          <div style="margin-top:8px;">
            <button type="submit">💾 保存</button>
            <button type="button" style="margin-left:6px;" onClick={onCancel}>
              取消
            </button>
          </div>
        </Form>
      )}
    </Formik>
  );
}