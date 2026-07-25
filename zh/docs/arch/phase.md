# Decima v3 tick

两阶段定义逻辑计算与 readout 顺序。未来硬件 substrate 可以用电路实现载体；软件 runtime 不要求一根真实导线切换到 Hi-Z。

## EV_FLASH 顺序

```text
1. 快照 locked_before
2. 构建 ACTIVE closure
3. 向 ACTIVE 图块呈现公共 VSB
4. 更新 accumulator、decay 与 lock
5. 记录 FIRE 和 domain winner
6. 从 BUS_W 贡献组装 BUS16
7. 采样 readout 和 flags
8. 对选定 domain 应用 auto-reset
```

## ACTIVE closure

带 `BUS_R` 的图块是根。`locked_before` 快照中的 locked 祖先允许局部后代计算。closure 计算到 fixed point，因此一条已锁存分支的多个层级可以在同一 tick 内 ACTIVE。

非 ACTIVE 图块清除 `thr_cur` 与 `locked`。

## 图块处理

Unlocked ACTIVE 图块把权重应用到公共 VSB，加入有符号 `delta`，执行 decay，再检查区间。

Locked ACTIVE 图块不加入新 `delta`，但 decay 仍然生效。只有位于区间内并保持许可时才继续 locked。这修正了旧 v0.2 文档中 locked 状态看似不可变化的问题。

## 事件与 domain

`FIRE` 仅在 `unlocked -> locked` 时记录。同一 domain 中多个 FIRE 会设置 collision；runtime 按 priority、再按较小 tile id 确定性选择 winner。

winner 可以请求 domain reset。当前 tick 的 readout 已经形成；reset 为下一段历史准备记忆。

## 时间

合约固定顺序，而不是通用的 `20 us`。Wall-clock 取决于 ACTIVE 图块数、runtime 实现、CPU 与未来硬件。发布的 benchmark 只适用于注明的 build 与机器。
