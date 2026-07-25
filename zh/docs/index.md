# DECIMA-8 — 确定性神经形态机器

> 八条共享输入线路。数千个局部积分器。以事件代替连续预测。

**当前物理模型：** v3

**参考实现：** C 语言软件 runtime 与 `.d8p` 个性格式

DECIMA-8 接收八条 Level16 VSB 流，并把每个帧同时提供给所有 ACTIVE 图块。每个图块对公共输入加权，积累有符号状态，通过 decay 逐步泄漏，并在累加器进入设定区间时锁存事件。

相邻图块之间不传递数据。局部拓扑只传递**下一 tick 的计算许可**。因此，个性中的分支是对同一段公共历史的一系列条件，而不是数据通道。

## 一个 tick 的物理过程

```text
8-lane VSB frame
  -> 所有 ACTIVE 图块的公共输入
  -> W[8x8] + signed accumulator + decay
  -> 在 [thr_lo..thr_hi] 内 fuse
  -> unlocked -> locked 时产生 FIRE
  -> 向后代传递局部许可
  -> BUS_W readout 与 domain 事件
```

记忆从 `thr_cur`、`locked` 和被激活的拓扑前沿中涌现。系统不需要单独的历史数组：个性直接在自身状态中积分序列。

## 谁定义个性

架构师，也就是 baker，决定八条输入线路的语义、权重、阈值、decay、拓扑、domain、优先级与 reset 规则。烘焙结果是 `.d8p`：机器的可执行配置，而不是带分支的应用程序。

环境提供 tape。baker 规定可能反应的空间。Decima 在该空间内确定性地经历 tape。

## 实际应用

[Whaler](https://whaler.rulerom.com/) 是第一个 Decima-8 应用系列。市场微观结构被压缩为八线 VSB tape；稀有的 Decima 事件进入风险 director 与交易轮廓。它是失衡事件过滤器，而不是被迫交易每根 K 线的 HFT 分类器。

## 文档

- [v3 图块模型](arch/tiles.md)
- [VSB 与 BUS16](arch/bus.md)
- [Runtime tick](arch/phase.md)
- [激活图](arch/routing.md)
- [IDE 与个性观察](tools/ide.md)
- [参考 runtime benchmark](https://decima.rulerom.com/ru/bench/)
- [架构哲学](https://philo.rulerom.com/zh/)
- [源代码](https://github.com/rulerom/decima8)

v0.2 材料作为历史合约保留。它们记录早期架构阶段，不能替代当前 v3 物理模型。

📧 [vsb@decima8.org](mailto:vsb@decima8.org)
