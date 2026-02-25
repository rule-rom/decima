# BUS16

> **Honest summing of all tile contributions**

---

## 📊 Bus Physics

### Configuration

| Parameter | Value |
|-----------|-------|
| **Lanes** | 8 lane (BUS16[0..7]) |
| **Level** | Level16 (0..15) |
| **Mode** | Summing in PHASE_WRITE |
| **Policy** | Saturate (clamp15), no wrap |

---

## 🧮 Contribution Summing

In PHASE_WRITE for each lane i=0..7:

```python
contrib_from_all_tiles[i] = Σ drive_vec[t][i]
  for all t where:
    - (routing_flags16[t] & BUS_W) != 0
    - locked self OR locked_ancestor

bus_raw[i] = contrib_from_all_tiles[i]
BUS16[i] = clamp15(bus_raw[i])
BUS_CLIP[i] = (bus_raw[i] > 15)
```

### Ranges

| Value | Range |
|-------|-------|
| **bus_raw** | [0..3840] (256 tiles × 15) |
| **BUS16** | [0..15] (clamped) |

---

## 🚨 CLIP / OVF Flags

### BUS_CLIP

```
BUS_CLIP[i] = (bus_raw[i] > 15)
BUS_CLIP_ANY = OR_i BUS_CLIP[i]
```

### BUS_OVF

```
BUS_OVF_ANY = BUS_CLIP_ANY
OVF_ANY = BUS_OVF_ANY
```

> **Policy v0.2:** only saturate (clamp15), no wrap/divide.

---

## 🔄 Phase Discipline

### READ Phase

- Conductor drives VSB[0..7]
- Island does **NOT** drive BUS
- Tiles read VSB_INGRESS

### TURNAROUND

```
Conductor: Hi-Z / no-drive VSB
Island: prepare drive BUS
```

### WRITE Phase

- Conductor: Hi-Z VSB
- Island drives BUS16
- Tiles with BUS_W=1 and locked write drive_vec

### READOUT_SAMPLE

```
R0_RAW_BUS: readout = BUS16[0..7] as 8×Level16
```

---

## 🎯 BUS Write Conditions

A tile writes to BUS16 only if:

1. **BUS_W == 1** (routing_flags16 & 0x0200)
2. **locked self** OR **locked_ancestor** (has locked ancestor in activation graph)

### Drive Vector

```
if locked_after == 1:
  drive_vec[i] = in16[i]  # passthrough
else:
  drive_vec[i] = row16_out[i]  # computed from weights
```

---

## 📐 Calculation Example

### Given

- 3 tiles write to lane 0
- drive_vec[0] = [10, 5, 8]

### Calculation

```
bus_raw[0] = 10 + 5 + 8 = 23
BUS16[0] = clamp15(23) = 15
BUS_CLIP[0] = true (23 > 15)
```

---

## 🔗 Relation to VSB

| Plane | Direction | Phase |
|-------|-----------|-------|
| **VSB[0..7]** | Conductor → Island | READ |
| **BUS16[0..7]** | Island → Conductor | WRITE |

> **Important:** Data is not sent to neighbors. Neighbors only form activation graph for BUS read permission.

---

**Bake the Future. Build the Substrate.** 🛠️⚡️
