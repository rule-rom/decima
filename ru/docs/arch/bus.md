# Шина BUS16

> **Честное суммирование вкладов всех тайлов**

---

## 📊 Физика Шины

### Конфигурация

| Параметр | Значение |
|----------|----------|
| **Линий** | 8 lane (BUS16[0..7]) |
| **Уровень** | Level16 (0..15) |
| **Режим** | Суммирование в PHASE_WRITE |
| **Политика** | Saturate (clamp15), без wrap |

---

## 🧮 Суммирование Вкладов

В PHASE_WRITE для каждой линии i=0..7:

```python
contrib_from_all_tiles[i] = Σ drive_vec[t][i]
  для всех t где:
    - (routing_flags16[t] & BUS_W) != 0
    - locked self ИЛИ locked_ancestor

bus_raw[i] = contrib_from_all_tiles[i]
BUS16[i] = clamp15(bus_raw[i])
BUS_CLIP[i] = (bus_raw[i] > 15)
```

### Диапазоны

| Величина | Диапазон |
|----------|----------|
| **bus_raw** | [0..3840] (256 тайлов × 15) |
| **BUS16** | [0..15] (clamped) |

---

## 🚨 CLIP / OVF Флаги

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

> **Политика v0.2:** только saturate (clamp15), без wrap/divide.

---

## 🔄 Дисциплина Фаз

### READ Phase

- Conductor драйвит VSB[0..7]
- Island **НЕ** драйвит BUS
- Тайлы читают VSB_INGRESS

### TURNAROUND

```
Conductor: Hi-Z / no-drive VSB
Island: prepare drive BUS
```

### WRITE Phase

- Conductor: Hi-Z VSB
- Island драйвит BUS16
- Тайлы с BUS_W=1 и locked пишут drive_vec

### READOUT_SAMPLE

```
R0_RAW_BUS: readout = BUS16[0..7] как 8×Level16
```

---

## 🎯 Условия Записи в Шину

Тайл пишет в BUS16 только если:

1. **BUS_W == 1** (routing_flags16 & 0x0200)
2. **locked self** ИЛИ **locked_ancestor** (есть locked-предок в графе активации)

### Drive Vector

```
if locked_after == 1:
  drive_vec[i] = in16[i]  # passthrough
else:
  drive_vec[i] = row16_out[i]  # вычисленное из весов
```

---

## 📐 Пример Расчёта

### Дано

- 3 тайла пишут в линию 0
- drive_vec[0] = [10, 5, 8]

### Расчёт

```
bus_raw[0] = 10 + 5 + 8 = 23
BUS16[0] = clamp15(23) = 15
BUS_CLIP[0] = true (23 > 15)
```

---

## 🔗 Связь с VSB

| Плоскость | Направление | Фаза |
|-----------|-------------|------|
| **VSB[0..7]** | Conductor → Island | READ |
| **BUS16[0..7]** | Island → Conductor | WRITE |

> **Важно:** Данные соседям не отправляются. Соседи только формируют граф активации для разрешения чтения BUS.

---

**Bake the Future. Build the Substrate.** 🛠️⚡️
