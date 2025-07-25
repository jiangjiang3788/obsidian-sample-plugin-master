// ui/SettingsTab.ts - 设置面板，提供仪表盘配置的可视化编辑
import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import {
  DashboardConfig, ModuleConfig, FilterRule, SortRule,
  getAllFields
} from '../config/schema';
import ThinkPlugin from '../main';
import { VIEW_OPTIONS } from '../views';

export class SettingsTab extends PluginSettingTab {
  plugin: ThinkPlugin;
  private selectedDashName: string = '';

  constructor(app: App, plugin: ThinkPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    if (plugin.dashboards.length > 0) {
      this.selectedDashName = plugin.dashboards[0].name;
    }
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Think 仪表盘 配置编辑' });

    /* ---------- 字段/值建议 ---------- */
    const allItems = this.plugin.dataStore.queryItems();
    const fieldOptions = getAllFields(allItems); // 一处维护

    const tagSet = new Set<string>();
    const categorySet = new Set<string>();
    const statusSet = new Set<string>();
    const recurrenceSet = new Set<string>();
    const typeSet = new Set<string>();

    for (const item of allItems) {
      (item.tags || []).forEach(t => t && tagSet.add(t));
      if (item.category) categorySet.add(item.category);
      if (item.status) statusSet.add(item.status);
      if (item.recurrence) recurrenceSet.add(item.recurrence);
      if (item.type) typeSet.add(item.type);
    }

    const tagsList = containerEl.createEl('datalist');
    tagsList.id = 'think-tags-list';
    Array.from(tagSet).forEach(opt => tagsList.createEl('option', { value: opt }));

    const categoryList = containerEl.createEl('datalist');
    categoryList.id = 'think-category-list';
    Array.from(categorySet).forEach(opt => categoryList.createEl('option', { value: opt }));

    const statusList = containerEl.createEl('datalist');
    statusList.id = 'think-status-list';
    Array.from(statusSet).forEach(opt => statusList.createEl('option', { value: opt }));

    const recurrenceList = containerEl.createEl('datalist');
    recurrenceList.id = 'think-recurrence-list';
    Array.from(recurrenceSet).forEach(opt => recurrenceList.createEl('option', { value: opt }));

    const typeList = containerEl.createEl('datalist');
    typeList.id = 'think-type-list';
    Array.from(typeSet).forEach(opt => typeList.createEl('option', { value: opt }));

    const fieldsList = containerEl.createEl('datalist');
    fieldsList.id = 'think-fields-list';
    fieldOptions.forEach(opt => fieldsList.createEl('option', { value: opt }));

    /* ---------- 当前仪表盘选择 ---------- */
    const selectDash = containerEl.createEl('select');
    for (const dash of this.plugin.dashboards) {
      const opt = selectDash.createEl('option', { text: dash.name });
      opt.value = dash.name;
      if (dash.name === this.selectedDashName) opt.selected = true;
    }
    selectDash.onchange = () => {
      this.selectedDashName = selectDash.value;
      this.display();
    };

    const btnAdd = containerEl.createEl('button', { text: '新建仪表盘' });
    btnAdd.style.marginLeft = '8px';
    btnAdd.onclick = () => {
      let baseName = '新仪表盘';
      let newName = baseName;
      let count = 1;
      while (this.plugin.dashboards.find(d => d.name === newName)) {
        newName = baseName + count++;
      }
      const newDash: DashboardConfig = { name: newName, modules: [] };
      this.plugin.dashboards.push(newDash);
      this.selectedDashName = newName;
      this.plugin.saveData({ dashboards: this.plugin.dashboards });
      new Notice('已添加新仪表盘配置');
      this.display();
    };

    if (this.plugin.dashboards.length > 0) {
      const btnDel = containerEl.createEl('button', { text: '删除当前仪表盘' });
      btnDel.style.marginLeft = '8px';
      btnDel.onclick = () => {
        const idx = this.plugin.dashboards.findIndex(d => d.name === this.selectedDashName);
        if (idx >= 0) {
          this.plugin.dashboards.splice(idx, 1);
          new Notice(`已删除配置：${this.selectedDashName}`);
          this.selectedDashName = this.plugin.dashboards.length ? this.plugin.dashboards[0].name : '';
          this.plugin.saveData({ dashboards: this.plugin.dashboards });
          this.display();
        }
      };
    }
    containerEl.createEl('hr');

    const dash = this.plugin.dashboards.find(d => d.name === this.selectedDashName);
    if (!dash) return;

    /* ---------- 基础设置 ---------- */
    const baseFieldset = containerEl.createEl('fieldset');
    baseFieldset.createEl('legend', { text: '基础设置' });
    new Setting(baseFieldset).setName('仪表盘名称').addText(text => {
      text.setValue(dash.name).onChange(val => {
        dash.name = val.trim();
      });
    });
    new Setting(baseFieldset).setName('数据源路径').addText(text => {
      text.setValue(dash.path || '').onChange(val => {
        dash.path = val.trim();
      });
    });
    new Setting(baseFieldset).setName('标签 (用逗号分隔)').addText(text => {
      const tagStr = Array.isArray(dash.tags) ? dash.tags.join(',') : (dash.tags || '');
      text.setValue(tagStr).onChange(val => {
        dash.tags = val.split(/[,，]/).map(t => t.trim()).filter(t => t);
      });
    });
    new Setting(baseFieldset).setName('初始视图').addDropdown(drop => {
      const views = ['年', '季', '月', '周', '天'];
      views.forEach(v => drop.addOption(v, v));
      drop.setValue(dash.initialView || '月');
      drop.onChange(val => { dash.initialView = val; });
    });
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const initialDateStr = dash.initialDate || todayStr;
    if (!dash.initialDate) dash.initialDate = initialDateStr;
    new Setting(baseFieldset).setName('初始日期').addText(text => {
      text.inputEl.type = 'date';
      text.setValue(initialDateStr).onChange(val => {
        dash.initialDate = val;
      });
    });

    containerEl.createEl('h3', { text: '模块列表' });

    /* ---------- 模块编辑 ---------- */
    dash.modules.forEach((mod, idx) => {
      const modFieldset = containerEl.createEl('fieldset');
      modFieldset.style.border = '1px solid #ccc';
      modFieldset.style.padding = '8px';
      modFieldset.style.marginBottom = '8px';
      modFieldset.dataset.index = idx.toString();

      modFieldset.createEl('legend', { text: `${mod.title || '模块'} (${mod.view})` });

      new Setting(modFieldset).setName('模块标题').addText(t => {
        t.setValue(mod.title).onChange(val => mod.title = val);
      });

      new Setting(modFieldset).setName('视图类型').addDropdown(dd => {
        VIEW_OPTIONS.forEach(v => dd.addOption(v, v));
        dd.setValue(mod.view);
        dd.onChange(val => {
          mod.view = val as ModuleConfig['view'];
          this.display();
        });
      });

      new Setting(modFieldset).addToggle(cb => {
        cb.setValue(!!mod.collapsed).onChange(val => { mod.collapsed = val; });
      }).setName('默认折叠');

      if (mod.view === 'TableView') {
        new Setting(modFieldset).setName('行字段 (rowField)').addText(t => {
          t.setValue(mod.props?.rowField || '').onChange(val => {
            if (!mod.props) mod.props = {};
            mod.props.rowField = val.trim();
          });
          t.inputEl.setAttr('list','think-fields-list');
        });
        new Setting(modFieldset).setName('列字段 (colField)').addText(t => {
          t.setValue(mod.props?.colField || '').onChange(val => {
            if (!mod.props) mod.props = {};
            mod.props.colField = val.trim();
          });
          t.inputEl.setAttr('list','think-fields-list');
        });
      }
      if (mod.view === 'BlockView' || mod.view === 'TimelineView') {
        new Setting(modFieldset).setName('分组字段').addText(t => {
          t.setValue(mod.group || '').onChange(val => {
            mod.group = val.trim() || undefined;
          });
          t.inputEl.setAttr('list','think-fields-list');
        });
      }
      if (mod.view !== 'TableView' && mod.view !== 'ChartView' && mod.view !== 'CalendarView') {
        new Setting(modFieldset).setName('显示字段 (用逗号分隔)').addText(t => {
          const fieldStr = mod.fields ? mod.fields.join(',') : '';
          t.setPlaceholder('如 title,tags,date').setValue(fieldStr).onChange(val => {
            const fieldsArr = val.split(/[,，]/).map(f => f.trim()).filter(f => f);
            mod.fields = fieldsArr.length > 0 ? fieldsArr : undefined;
          });
          t.inputEl.setAttr('list','think-fields-list');
        });
      }

      // 过滤
      const filterDiv = modFieldset.createDiv();
      filterDiv.style.borderTop = '1px dashed #ccc';
      filterDiv.style.marginTop = '6px';
      filterDiv.style.paddingTop = '6px';
      filterDiv.createEl('strong', { text: '过滤规则' });
      (mod.filters || []).forEach((rule, ridx) => {
        const rowDiv = filterDiv.createDiv({ cls: 'filter-row' });
        rowDiv.style.display = 'flex';
        rowDiv.style.marginBottom = '4px';

        const fieldInput = rowDiv.createEl('input');
        fieldInput.type = 'text';
        fieldInput.style.flex = '0 0 30%';
        fieldInput.value = rule.field;
        fieldInput.setAttr('list', 'think-fields-list');

        const opSelect = rowDiv.createEl('select');
        ['=', '!=', 'includes', 'regex', '>', '<'].forEach(op => {
          opSelect.add(new Option(op, op, false, op === rule.op));
        });
        opSelect.onchange = () => { rule.op = opSelect.value as FilterRule['op']; };

        const valueInput = rowDiv.createEl('input');
        valueInput.type = 'text';
        valueInput.style.flex = '0 0 30%';
        valueInput.value = String(rule.value);

        const updateValueDatalist = () => {
          valueInput.removeAttribute('list');
          const f = fieldInput.value.trim();
          if (f === 'tags') valueInput.setAttr('list','think-tags-list');
          else if (f === 'category') valueInput.setAttr('list','think-category-list');
          else if (f === 'status') valueInput.setAttr('list','think-status-list');
          else if (f === 'recurrence') valueInput.setAttr('list','think-recurrence-list');
          else if (f === 'type') valueInput.setAttr('list','think-type-list');
        };
        updateValueDatalist();

        fieldInput.onchange = () => {
          rule.field = fieldInput.value.trim();
          updateValueDatalist();
        };
        valueInput.onchange = () => { rule.value = valueInput.value; };

        const delBtn = rowDiv.createEl('button', { text: '删除' });
        delBtn.onclick = () => {
          mod.filters!.splice(ridx, 1);
          this.display();
        };
      });
      const addFilterBtn = filterDiv.createEl('button', { text: '+ 添加过滤条件' });
      addFilterBtn.onclick = () => {
        if (!mod.filters) mod.filters = [];
        mod.filters.push({ field: '', op: '=', value: '' });
        this.display();
      };

      // 排序
      const sortDiv = modFieldset.createDiv();
      sortDiv.style.borderTop = '1px dashed #ccc';
      sortDiv.style.marginTop = '6px';
      sortDiv.style.paddingTop = '6px';
      sortDiv.createEl('strong', { text: '排序规则' });
      (mod.sort || []).forEach((rule, ridx) => {
        const rowDiv = sortDiv.createDiv({ cls: 'sort-row' });
        rowDiv.style.display = 'flex';
        rowDiv.style.marginBottom = '4px';

        const fieldInput = rowDiv.createEl('input');
        fieldInput.type = 'text';
        fieldInput.style.flex = '0 0 40%';
        fieldInput.value = rule.field;
        fieldInput.setAttr('list', 'think-fields-list');
        fieldInput.onchange = () => rule.field = fieldInput.value.trim();

        const dirSelect = rowDiv.createEl('select');
        [['asc','升序'], ['desc','降序']].forEach(([val,label]) => {
          dirSelect.add(new Option(label, val, false, val === rule.dir));
        });
        dirSelect.onchange = () => { rule.dir = dirSelect.value as SortRule['dir']; };

        const delBtn = rowDiv.createEl('button', { text: '删除' });
        delBtn.style.marginLeft = '4px';
        delBtn.onclick = () => {
          mod.sort!.splice(ridx, 1);
          this.display();
        };
      });
      const addSortBtn = sortDiv.createEl('button', { text: '+ 添加排序条件' });
      addSortBtn.onclick = () => {
        if (!mod.sort) mod.sort = [];
        mod.sort.push({ field: '', dir: 'asc' });
        this.display();
      };

      // 上移/下移/删除模块
      const actionsDiv = modFieldset.createDiv({ cls: 'module-actions' });
      actionsDiv.style.textAlign = 'right';
      if (idx > 0) {
        const upBtn = actionsDiv.createEl('button', { text: '↑ 上移' });
        upBtn.onclick = () => {
          const mods = dash.modules;
          [mods[idx-1], mods[idx]] = [mods[idx], mods[idx-1]];
          this.display();
        };
      }
      if (idx < dash.modules.length - 1) {
        const downBtn = actionsDiv.createEl('button', { text: '↓ 下移' });
        downBtn.onclick = () => {
          const mods = dash.modules;
          [mods[idx+1], mods[idx]] = [mods[idx], mods[idx+1]];
          this.display();
        };
      }
      const delBtn = actionsDiv.createEl('button', { text: '删除模块' });
      delBtn.onclick = () => {
        dash.modules.splice(idx, 1);
        this.display();
      };
    });

    // 添加新模块
    const newModDiv = containerEl.createDiv();
    const newSelect = newModDiv.createEl('select');
    VIEW_OPTIONS.forEach(v => {
      newSelect.add(new Option(v, v));
    });
    const addModBtn = newModDiv.createEl('button', { text: '添加模块' });
    addModBtn.style.marginLeft = '6px';
    addModBtn.onclick = () => {
      const viewType = newSelect.value as ModuleConfig['view'];
      const newModule: ModuleConfig = {
        view: viewType,
        title: '新模块',
        collapsed: false,
        filters: [],
        sort: [],
        props: {}
      };
      dash.modules.push(newModule);
      this.display();
    };

    // 保存
    containerEl.createEl('hr');
    const saveBtn = containerEl.createEl('button', { text: '保存配置' });
    saveBtn.onclick = () => {
      if (dash.name !== this.selectedDashName) {
        if (this.plugin.dashboards.some(d => d !== dash && d.name === dash.name)) {
          new Notice('配置名称已存在，请更换名称');
          return;
        }
      }
      this.plugin.saveData({ dashboards: this.plugin.dashboards }).then(() => {
        new Notice('仪表盘配置已保存');
        this.plugin.refreshAllDashboards();
        this.selectedDashName = dash.name;
        this.display();
      });
    };
  }
}