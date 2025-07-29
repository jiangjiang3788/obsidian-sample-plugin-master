// src/ui/DashboardConfigForm.tsx
//-----------------------------------------------------------
// 增加 filters / sort / fields / props 四项可编辑
//-----------------------------------------------------------

/** @jsxImportSource preact */
import { Formik, Form, Field, FieldArray } from 'formik';
import { DashboardConfig, ModuleConfig, FilterRule, SortRule } from '../config/schema';
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

  /** 将字符串 → JSON，异常返回原值 */
  const toJSON = <T,>(s: string, fallback: T): T => {
    try { return JSON.parse(s); } catch { return fallback; }
  };

  return (
    <Formik
      initialValues={{
        ...dashboard,
        tags: dashboard.tags?.join(',') || '',
        modules: dashboard.modules.map(m => ({
          ...m,
          filtersStr: JSON.stringify(m.filters ?? [], null, 0),
          sortStr:    JSON.stringify(m.sort    ?? [], null, 0),
          fieldsStr:  (m.fields ?? []).join(','),
          propsStr:   JSON.stringify(m.props   ?? {}, null, 0),
        })),
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
          modules: vals.modules.map(v => ({
            view:      v.view,
            title:     v.title,
            collapsed: v.collapsed,
            filters:   toJSON<FilterRule[]>(v.filtersStr, []),
            sort:      toJSON<SortRule[]>(v.sortStr, []),
            fields:    v.fieldsStr.split(/[,，]/).map(s => s.trim()).filter(Boolean),
            props:     toJSON<Record<string, any>>(v.propsStr, {}),
            group:     (v as any).group,          // 若后续扩展
          })),
        };
        onSave(cleaned);
      }}
    >
      {({ values, errors, touched }) => (
        <Form style="display:flex;flex-direction:column;gap:8px;">
          {/* 基本信息 -------------------------------------------------- */}
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

          {/* 模块列表 -------------------------------------------------- */}
          <FieldArray name="modules">
            {({ remove, push }) => (
              <div style="border-top:1px solid #ddd;padding-top:8px;">
                <strong>模块列表</strong>
                {values.modules.map((mod: any, idx: number) => (
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

                      {/* ▲ 新增可编辑字段 -------------------------------- */}
                      <label>
                        filters (JSON)：
                        <Field as="textarea"
                               name={`modules.${idx}.filtersStr`}
                               rows={2}/>
                      </label>
                      <label>
                        sort (JSON)：
                        <Field as="textarea"
                               name={`modules.${idx}.sortStr`}
                               rows={2}/>
                      </label>
                      <label>
                        fields (逗号分隔)：
                        <Field name={`modules.${idx}.fieldsStr`} />
                      </label>
                      <label>
                        props (JSON)：
                        <Field as="textarea"
                               name={`modules.${idx}.propsStr`}
                               rows={2}/>
                      </label>

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
                      filtersStr: '[]',
                      sortStr: '[]',
                      fieldsStr: '',
                      propsStr: '{}',
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