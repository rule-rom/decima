# 局部许可图

DECIMA-8 拓扑传播的是计算许可，而不是数据。

## RoutingFlags16

| 位 | 含义 |
| --- | --- |
| `0..7` | N、E、S、W、NE、SE、SW、NW 边 |
| `8` | `BUS_R`：ACTIVE seed，名称来自历史 |
| `9` | `BUS_W`：readout 贡献许可 |
| `10..15` | Reserved |

若图块 A 设置了某方向标志，则存在到对应相邻图块 B 的许可边 `A -> B`。

## 激活条件

```text
ACTIVE[t] =
  BUS_R[t]
  OR exists parent p:
       ACTIVE[p] AND locked_before[p] AND edge(p, t)
```

这些边：

- 不携带 VSB；
- 不会把一个图块的输出加入另一个图块的输入；
- 可以有多个 parent；
- 可以形成环；
- 根据 `locked_before` 确定性计算。

## 时间序列

```text
Tick N:
  根图块听到公共 VSB 并进入 lock

Tick N+1:
  根图块成为 locked_before
  后代获得 ACTIVE
  后代用自己的权重听取新的公共 VSB
```

因此，分支识别的是公共环境状态序列，而不是在 fabric 中移动的数据包。

## 分支收缩

祖先 unlock 后，若没有另一条 locked 路径或自身 `BUS_R`，后代会失去许可。非 ACTIVE fabric 清除 runtime 状态。拓扑同时提供顺序记忆和遗忘。

## baker 为什么需要拓扑

baker 安排条件：根监听基本特征，后代检查事件发展，多条分支在 domain 中汇合，winner 输出 pattern id，并可清除已使用的记忆。

拓扑定义反应语法，但所有节点都读取同一条共享 VSB tape。
