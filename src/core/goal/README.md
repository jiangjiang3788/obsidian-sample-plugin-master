# Goal / Period / Record 最小领域契约

当前单人数据模型只保留一份 Goal 路径。Goal path 同时是人类可读文本和运行时分类身份，不维护第二份独立身份，也不使用第二套归属层级。

核心约束：

1. Goal 使用 `/` 表达层级，例如 `照顾好自己/健康/睡眠`。
2. Record 只持久化 `目标:: <完整 Goal path>`。
3. Goal path 不允许 `#` / `＃`；Tag 与 Goal 始终是两个概念。
4. 父级、根级、叶级都由完整路径运行时推导，不持久化第二份身份。
5. GoalTemplate 以 `Goal path × CoreBlock` 唯一定位；没有模板变体或第二分类上下文。
6. QuickInput、Timeline、Statistics、Energy、Retrieval 等消费者读取同一个 Goal path，不允许从文件名或标题猜归属。
7. Period 仍由模板 periodPolicy 与记录日期推导，与 Goal 身份无关。
