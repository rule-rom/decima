# Bake TLV Spec v0.2

> **Binary format for baking neuromorphic personalities**

---

## 📐 General Rules

| Rule | Description |
|------|-------------|
| **Endianness** | Little-endian |
| **TLV Padding** | 0, value alignment to 4-byte boundary |
| **CRC32** | IEEE (zlib/crc32) over all bytes from offset 0 to start of TLV_CRC32 |

---

## 📋 Header (28 bytes)

### BakeBlobHeader

| Offset | Field | Type | Value |
|--------|-------|------|-------|
| **0** | magic | char[4] | "D8BK" |
| **4** | ver_major | u16 | 2 |
| **6** | ver_minor | u16 | 0 |
| **8** | flags | u32 | BAKE_FLAG_DOUBLE_STRAIT (bit0) |
| **12** | total_len | u32 | Full blob size |
| **16** | bake_id | u32 | Bake ID |
| **20** | profile_id | u32 | Profile ID |
| **24** | reserved0 | u32 | 0 |

### Header Flags

| Bit | Flag | Description |
|-----|------|-------------|
| **bit0** | BAKE_FLAG_DOUBLE_STRAIT | Conductor does double pour on each incoming chord |

---

## 🧩 TLV Header (8 bytes)

| Offset | Field | Type |
|--------|-------|------|
| **0** | type | u16 |
| **2** | tflags | u16 |
| **4** | len | u32 |

---

## 📦 TLV Type Map v0.2

| TLV Type | ID | Required | Description |
|----------|-----|----------|-------------|
| **TLV_TOPOLOGY** | 0x0100 | ✅ | Array topology |
| **TLV_TILE_PARAMS_V2** | 0x0121 | ✅ | Tile params (13 bytes/tile) |
| **TLV_TILE_ROUTING_FLAGS16** | 0x0131 | ✅ | Routing flags |
| **TLV_READOUT_POLICY** | 0x0140 | ✅ | Readout policy |
| **TLV_RESET_ON_FIRE_MASK16** | 0x0150 | ✅ | Auto-reset on fire |
| **TLV_TILE_WEIGHTS_PACKED** | 0x0160 | ✅ | Weights 8×8 |
| **TLV_TILE_FIELD_LIMIT** | 0x0170 | ❌ | Tile limit |
| **TLV_CRC32** | 0xFFFE | ✅ | Checksum (last) |

---

## 1️⃣ TLV_TOPOLOGY (0x0100)

**len = 16 bytes**

### TopologyV0

| Offset | Field | Type | Value |
|--------|-------|------|-------|
| **0** | tile_count | u32 | Number of tiles |
| **4** | tile_w | u16 | Array width |
| **6** | tile_h | u16 | Array height |
| **8** | lanes | u8 | 8 |
| **9** | domains | u8 | 16 |
| **10** | reserved | u16 | 0 |
| **12** | reserved2 | u32 | 0 |

### Invariant

```
tile_count == tile_w * tile_h
```

---

## 2️⃣ TLV_TILE_PARAMS_V2 (0x0121)

**len = tile_count × 13 bytes**

### TileParamsV2 (13 bytes per tile)

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| **0** | thr_lo16 | i16 | Lower threshold |
| **2** | thr_hi16 | i16 | Upper threshold |
| **4** | decay16 | u16 | Decay |
| **6** | domain_id4 | u8 | Domain (low nibble) |
| **7** | priority8 | u8 | Priority |
| **8** | pattern_id16 | u16 | Pattern ID |
| **10** | flags8 | u8 | 0 (reserved) |
| **11** | reserved | u16 | 0 |

### Invariant

```
thr_lo16 <= thr_hi16 for each tile
```

---

## 3️⃣ TLV_TILE_ROUTING_FLAGS16 (0x0131)

**len = tile_count × 2 bytes**

### Per Tile

| Offset | Field | Type |
|--------|-------|------|
| **0** | routing_flags16 | u16 (LE) |

### Constraints

```
reserved bits 10..15 must be 0
```

---

## 4️⃣ TLV_TILE_WEIGHTS_PACKED (0x0160)

**len = tile_count × 40 bytes**

### Structure (40 bytes per tile)

| Bytes | Field | Description |
|-------|-------|-------------|
| **0..31** | Wmag[8][8] | Magnitudes (64 nibble, 4 bits each) |
| **32..39** | Wsign[8][8] | Sign bits (64 bits), LSB-first |

### SignedWeight5

| Bits | Field | Description |
|------|-------|-------------|
| **0..3** | mag4 | Magnitude (0..15) |
| **4** | sign1 | Sign (1="+", 0="−") |

---

## 5️⃣ TLV_RESET_ON_FIRE_MASK16 (0x0150)

**len = tile_count × 2 bytes**

### Per Tile

| Offset | Field | Type |
|--------|-------|------|
| **0** | reset_mask16 | u16 |

---

## 6️⃣ TLV_READOUT_POLICY (0x0140)

**len = 12 bytes**

### ReadoutPolicyV0

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| **0** | mode | u8 | 0=R0_RAW_BUS, 1=R1_DOMAIN_WINNER_ID32 |
| **1** | reserved0 | u8 | 0 |
| **2** | winner_domain_mask | u16 | If mode=1 |
| **4** | settle_ns | u16 | Recommendation for hardware |
| **6** | reserved1 | u16 | 0 |
| **8** | reserved2 | u32 | 0 |

---

## 7️⃣ TLV_CRC32 (0xFFFE)

**len = 4 bytes**

| Offset | Field | Type |
|--------|-------|------|
| **0** | crc32 | u32 |

### CRC Calculation

```
CRC32 IEEE (zlib/crc32)
Over all bytes from offset 0 to start of TLV_CRC32
```

---

## 8️⃣ TLV_TILE_FIELD_LIMIT (0x0170)

**len = 4 bytes**

| Offset | Field | Type |
|--------|-------|------|
| **0** | tile_field_limit | u32 |

### Value

```
0 = full kTileCount
```

---

## ✅ Load-time Validation

Bake loader must verify:

### 1. Header

```
magic == "D8BK"
ver_major == 2
ver_minor == 0
total_len is correct
```

### 2. TLV Presence

```
All required TLVs are present
```

### 3. Strict len

```
TILE_PARAMS_V2: tile_count * 13
TILE_ROUTING_FLAGS16: tile_count * 2
TILE_WEIGHTS_PACKED: tile_count * 40
RESET_ON_FIRE_MASK16: tile_count * 2
```

### 4. CRC32

```
CRC32 by rule "before TLV_CRC32"
```

### 5. Reserved Fields

```
reserved fields = 0
flags8 == 0
routing reserved bits 10..15 == 0
header.flags may contain only BAKE_FLAG_DOUBLE_STRAIT
```

### 6. Invariants

```
thr_lo16 <= thr_hi16 for each tile
tile_count == tile_w * tile_h
```

---

## 📐 Structure Example

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
