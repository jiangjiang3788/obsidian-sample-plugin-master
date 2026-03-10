这次只收两类问题：

1. 代码：QuickInputModal 的编辑回填
- 分类字段不再只按字段名查值，而是优先把 `item.categoryKey` 映射回 `{ label, value }`
- 评分字段不再只看 `item.rating`，而是优先组合 `item.rating + item.pintu` 映射回评分选项对象
- 路径型字段支持按 `option.value === 完整路径` 回填

2. data.json：模板与配置统一
- 闪念模板统一使用 `分类:: {{思考分类.value}}`
- 打卡模板统一使用 `评分:: {{评分.label}}` 与 `pintu::{{评分.value}}`
- 修正旧 override 里 `{{评分..value}}` 这类错误写法
- 修正闪念 override 中把分类 option 写成 `事件/感受/思考` 叶子值的问题，统一改回完整路径值
- 视图分类与 selectedCategories 去掉叶子分类，统一保留基础分类
