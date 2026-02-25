# UDP Protocol

> **Cascading Decima-8 machines**

---

## 📦 Packet Format

**packet_v1** — fixed binary format

| Characteristic | Value |
|----------------|-------|
| **Size** | 37 bytes |
| **Endianness** | Little-endian |
| **Purpose** | Machine cascading (IN/OUT) |

---

## 🗂️ Packet Structure

| Offset | Field | Type | Description |
|--------|-------|------|-------------|
| **0** | magic | u32 | 'D8UP' (0x50553844) |
| **4** | version | u16 | 1 |
| **6** | flags | u16 | has_winner, has_bus, has_cycle, has_flags |
| **8** | frame_tag | u32 | Frame tag |
| **12** | domain_id | u8 | Domain ID |
| **13** | pattern_id | u16 | Pattern ID |
| **15** | reset_mask16 | u16 | Reset mask |
| **17** | collision_mask16 | u16 | Collision mask |
| **19** | winner_tile_id | u16 | Winner ID |
| **21** | cycle_time_us | u32 | Cycle time |
| **25** | flags32_last | u32 | Last cycle FLAGS |
| **29** | bus16[8] | u8×8 | Bus values |

---

## 🚩 Flags (u16)

| Bit | Flag | Description |
|-----|------|-------------|
| **bit0** | has_winner | winner_tile_id/pattern_id valid |
| **bit1** | has_bus | bus16[8] valid |
| **bit2** | has_cycle | cycle_time_us valid |
| **bit3** | has_flags | flags32_last valid |

---

## 📋 Packet Fields

### magic (u32)

```
'D8UP' (0x50553844)
```

### version (u16)

```
1
```

### flags (u16)

```
bit0: has_winner
bit1: has_bus
bit2: has_cycle
bit3: has_flags
```

### frame_tag (u32)

```
Unique frame tag for synchronization
```

### domain_id (u8)

```
Domain ID (0..15)
```

### pattern_id (u16)

```
Pattern ID (0..32767)
Valid if flags.has_winner
```

### reset_mask16 (u16)

```
Domain mask for RESET_DOMAIN
Each bit corresponds to a domain
```

### collision_mask16 (u16)

```
Mask of domains with collision (cnt≥2)
Valid if flags.has_winner
```

### winner_tile_id (u16)

```
Winner tile ID
Valid if flags.has_winner
```

### cycle_time_us (u32)

```
Cycle time in microseconds
Valid if flags.has_cycle
```

### flags32_last (u32)

```
Last cycle FLAGS32:
bit0: READY_LAST
bit1: OVF_ANY_LAST
bit2: COLLIDE_ANY_LAST
Valid if flags.has_flags
```

### bus16[8] (u8×8)

```
BUS16[0..7] values
Valid if flags.has_bus
```

---

## 🔄 Packet Example

### Hex Dump

```
0000: 44 38 55 50 01 00 0F 00  00 00 00 01 00 00 00 00   D8UP............
0010: 00 01 00 00 00 00 00 00  00 00 00 00 00 00 00 00   ................
0020: 00 00 00 00 00 00 00 00  00 00 00 00               ............
```

### Decode

```
magic: 'D8UP'
version: 1
flags: 0x000F (has_winner|has_bus|has_cycle|has_flags)
frame_tag: 1
domain_id: 0
pattern_id: 0
reset_mask16: 0
collision_mask16: 0
winner_tile_id: 0
cycle_time_us: 0
flags32_last: 0
bus16: [0, 0, 0, 0, 0, 0, 0, 0]
```

---

## 💻 Usage

### Send Packet

```python
import socket

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

packet = struct.pack('<4sHHIIBHHHHIIBBBBBBBB',
    b'D8UP',           # magic
    1,                 # version
    0x000F,            # flags (all fields valid)
    frame_tag,
    domain_id,
    pattern_id,
    reset_mask16,
    collision_mask16,
    winner_tile_id,
    cycle_time_us,
    flags32_last,
    *bus16             # 8 bytes
)

sock.sendto(packet, ('127.0.0.1', 9999))
```

### Receive Packet

```python
data, addr = sock.recvfrom(37)

magic, version, flags, frame_tag, domain_id, pattern_id, \
reset_mask16, collision_mask16, winner_tile_id, cycle_time_us, \
flags32_last, *bus16_bytes = struct.unpack('<4sHHIIBHHHHIIBBBBBBBB', data)

bus16 = list(bus16_bytes)

has_winner = bool(flags & 0x0001)
has_bus = bool(flags & 0x0002)
has_cycle = bool(flags & 0x0004)
has_flags = bool(flags & 0x0008)
```

---

## 🔗 Integration

### Input Stream (IN)

```
Decima-8 receives packets:
- reset_mask16 → EV_RESET_DOMAIN
- pattern_id → target pattern
- bus16 → input data (if has_bus)
```

### Output Stream (OUT)

```
Decima-8 sends packets:
- frame_tag → synchronization
- winner_tile_id → recognized pattern
- bus16 → bus state
- flags32_last → cycle flags
```

---

**Bake the Future. Build the Substrate.** 🛠️⚡️
