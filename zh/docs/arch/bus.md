# 共享 VSB 与输出 BUS16

DECIMA-8 有两个不可混淆的平面。

| 平面 | 方向 | 用途 |
| --- | --- | --- |
| `VSB_INGRESS16[8]` | Conductor → swarm | 所有 ACTIVE 图块共享的输入帧 |
| `BUS16[8]` | swarm → Conductor | 有资格的 `BUS_W` 图块贡献之饱和和 |

## VSB：公共物理上下文

VSB 不沿图块链传播。在一个 tick 内，同一个八线向量可被每个 ACTIVE 图块读取。图块因为权重和已积累历史不同而听到不同含义。

这就是液压模型：一个公共压力总管同时作用于多个局部腔室。

## BUS16：readout，而不是图块输入

WRITE 阶段中，有资格的图块贡献 `row_out`：

```text
bus_raw[lane] = sum(row_out[t][lane] for eligible BUS_W tiles)
BUS16[lane] = clamp15(bus_raw[lane])
BUS_CLIP[lane] = bus_raw[lane] > 15
```

`bus_raw` 的上限取决于实际写入者数量。旧的 `256 x 15` 不是 v3 不变量：runtime 支持最多 4096 个图块。

## BUS_R 与 BUS_W

- `BUS_R` 是历史名称。在当前 runtime 中，它让图块成为 ACTIVE 图的 seed；图块并不读取 BUS16 数据。
- `BUS_W` 在分支中存在 locked source 时允许图块向公共输出贡献。

相邻边也不携带 Level16 数据。它只允许后代在下一 tick 用自己的矩阵处理公共 VSB。

## 为什么必须分离

同一条数据流呈现给整个 fabric，而拓扑选择个性的哪些部分有权响应。因此，分支深度可以表达时间序列，而无需在图块之间复制市场、音频或传感器数据。
