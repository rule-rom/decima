# Bake TLV Spec v0.2

> **Бинарный формат пропекания нейроморфных личностей**

---

## 📐 Общие Правила

| Правило | Описание |
|---------|----------|
| **Endianness** | Little-endian |
| **TLV Padding** | 0, выравнивание value до 4-byte boundary |
| **CRC32** | IEEE (zlib/crc32) по всем байтам от offset 0 до начала TLV_CRC32 |

---

## 📋 Header (28 bytes)

### BakeBlobHeader

| Offset | Поле | Тип | Значение |
|--------|------|-----|----------|
| **0** | magic | char[4] | "D8BK" |
| **4** | ver_major | u16 | 2 |
| **6** | ver_minor | u16 | 0 |
| **8** | flags | u32 | BAKE_FLAG_DOUBLE_STRAIT (bit0) |
| **12** | total_len | u32 | Полный размер blob |
| **16** | bake_id | u32 | ID пропечки |
| **20** | profile_id | u32 | ID профиля |
| **24** | reserved0 | u32 | 0 |

### Header Flags

| Бит | Флаг | Описание |
|-----|------|----------|
| **bit0** | BAKE_FLAG_DOUBLE_STRAIT | Дирижер делает двойной пролив на каждый входящий аккорд |

---

## 🧩 TLV Header (8 bytes)

| Offset | Поле | Тип |
|--------|------|-----|
| **0** | type | u16 |
| **2** | tflags | u16 |
| **4** | len | u32 |

---

## 📦 TLV Type Map v0.2

| TLV Type | ID | Обязательный | Описание |
|----------|-----|--------------|----------|
| **TLV_TOPOLOGY** | 0x0100 | ✅ | Топология массива |
| **TLV_TILE_PARAMS_V2** | 0x0121 | ✅ | Параметры тайлов (13 bytes/tile) |
| **TLV_TILE_ROUTING_FLAGS16** | 0x0131 | ✅ | Флаги маршрутизации |
| **TLV_READOUT_POLICY** | 0x0140 | ✅ | Политика readout |
| **TLV_RESET_ON_FIRE_MASK16** | 0x0150 | ✅ | Авто-сброс по fire |
| **TLV_TILE_WEIGHTS_PACKED** | 0x0160 | ✅ | Веса 8×8 |
| **TLV_TILE_FIELD_LIMIT** | 0x0170 | ❌ | Лимит тайлов |
| **TLV_CRC32** | 0xFFFE | ✅ | Контрольная сумма (последний) |

---

## 1️⃣ TLV_TOPOLOGY (0x0100)

**len = 16 bytes**

### TopologyV0

| Offset | Поле | Тип | Значение |
|--------|------|-----|----------|
| **0** | tile_count | u32 | Количество тайлов |
| **4** | tile_w | u16 | Ширина массива |
| **6** | tile_h | u16 | Высота массива |
| **8** | lanes | u8 | 8 |
| **9** | domains | u8 | 16 |
| **10** | reserved | u16 | 0 |
| **12** | reserved2 | u32 | 0 |

### Инвариант

```
tile_count == tile_w * tile_h
```

---

## 2️⃣ TLV_TILE_PARAMS_V2 (0x0121)

**len = tile_count × 13 bytes**

### TileParamsV2 (13 bytes per tile)

| Offset | Поле | Тип | Описание |
|--------|------|-----|----------|
| **0** | thr_lo16 | i16 | Нижний порог |
| **2** | thr_hi16 | i16 | Верхний порог |
| **4** | decay16 | u16 | Затухание |
| **6** | domain_id4 | u8 | Домен (low nibble) |
| **7** | priority8 | u8 | Приоритет |
| **8** | pattern_id16 | u16 | ID паттерна |
| **10** | flags8 | u8 | 0 (reserved) |
| **11** | reserved | u16 | 0 |

### Инвариант

```
thr_lo16 <= thr_hi16 для каждого тайла
```

---

## 3️⃣ TLV_TILE_ROUTING_FLAGS16 (0x0131)

**len = tile_count × 2 bytes**

### Per Tile

| Offset | Поле | Тип |
|--------|------|-----|
| **0** | routing_flags16 | u16 (LE) |

### Ограничения

```
reserved bits 10..15 должны быть 0
```

---

## 4️⃣ TLV_TILE_WEIGHTS_PACKED (0x0160)

**len = tile_count × 40 bytes**

### Структура (40 bytes per tile)

| Bytes | Поле | Описание |
|-------|------|----------|
| **0..31** | Wmag[8][8] | Magnitudes (64 nibble, 4 бита каждый) |
| **32..39** | Wsign[8][8] | Sign bits (64 бита), LSB-first |

### SignedWeight5

| Биты | Поле | Описание |
|------|------|----------|
| **0..3** | mag4 | Магнитуда (0..15) |
| **4** | sign1 | Знак (1="+", 0="−") |

---

## 5️⃣ TLV_RESET_ON_FIRE_MASK16 (0x0150)

**len = tile_count × 2 bytes**

### Per Tile

| Offset | Поле | Тип |
|--------|------|-----|
| **0** | reset_mask16 | u16 |

---

## 6️⃣ TLV_READOUT_POLICY (0x0140)

**len = 12 bytes**

### ReadoutPolicyV0

| Offset | Поле | Тип | Описание |
|--------|------|-----|----------|
| **0** | mode | u8 | 0=R0_RAW_BUS, 1=R1_DOMAIN_WINNER_ID32 |
| **1** | reserved0 | u8 | 0 |
| **2** | winner_domain_mask | u16 | Если mode=1 |
| **4** | settle_ns | u16 | Рекомендация для железа |
| **6** | reserved1 | u16 | 0 |
| **8** | reserved2 | u32 | 0 |

---

## 7️⃣ TLV_CRC32 (0xFFFE)

**len = 4 bytes**

| Offset | Поле | Тип |
|--------|------|-----|
| **0** | crc32 | u32 |

### Расчёт CRC

```
CRC32 IEEE (zlib/crc32)
По всем байтам от offset 0 до начала TLV_CRC32
```

---

## 8️⃣ TLV_TILE_FIELD_LIMIT (0x0170)

**len = 4 bytes**

| Offset | Поле | Тип |
|--------|------|-----|
| **0** | tile_field_limit | u32 |

### Значение

```
0 = full kTileCount
```

---

## ✅ Load-time Validation

Загрузчик bake обязан проверить:

### 1. Header

```
magic == "D8BK"
ver_major == 2
ver_minor == 0
total_len корректен
```

### 2. Наличие TLV

```
Все обязательные TLV присутствуют
```

### 3. Строгие len

```
TILE_PARAMS_V2: tile_count * 13
TILE_ROUTING_FLAGS16: tile_count * 2
TILE_WEIGHTS_PACKED: tile_count * 40
RESET_ON_FIRE_MASK16: tile_count * 2
```

### 4. CRC32

```
CRC32 по правилу "до TLV_CRC32"
```

### 5. Reserved Поля

```
reserved-поля = 0
flags8 == 0
routing reserved bits 10..15 == 0
header.flags может содержать только BAKE_FLAG_DOUBLE_STRAIT
```

### 6. Инварианты

```
thr_lo16 <= thr_hi16 для каждого тайла
tile_count == tile_w * tile_h
```

---

## 📐 Пример Структуры

```
┌─────────────────────────────────────┐
│  Header (28 bytes)                  │
│  magic: "D8BK"                      │
│  ver: 2.0                           │
│  total_len: 1234                    │
├─────────────────────────────────────┤
│  TLV_TOPOLOGY (16 bytes)            │
├─────────────────────────────────────┤
│  TLV_TILE_PARAMS_V2 (N×13 bytes)    │
├─────────────────────────────────────┤
│  TLV_TILE_ROUTING_FLAGS16 (N×2)     │
├─────────────────────────────────────┤
│  TLV_TILE_WEIGHTS_PACKED (N×40)     │
├─────────────────────────────────────┤
│  TLV_RESET_ON_FIRE_MASK16 (N×2)     │
├─────────────────────────────────────┤
│  TLV_READOUT_POLICY (12 bytes)      │
├─────────────────────────────────────┤
│  TLV_CRC32 (4 bytes)                │
└─────────────────────────────────────┘
```

---

**Bake the Future. Build the Substrate.** 🛠️⚡️
