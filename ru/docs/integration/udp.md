# UDP Protocol

> **Каскадирование машин Decima-8**

---

## 📦 Формат Пакета

**packet_v1** — fixed binary формат

| Характеристика | Значение |
|----------------|----------|
| **Размер** | 37 bytes |
| **Endianness** | Little-endian |
| **Назначение** | Каскадирование машин (IN/OUT) |

---

## 🗂️ Структура Пакета

| Offset | Поле | Тип | Описание |
|--------|------|-----|----------|
| **0** | magic | u32 | 'D8UP' (0x50553844) |
| **4** | version | u16 | 1 |
| **6** | flags | u16 | has_winner, has_bus, has_cycle, has_flags |
| **8** | frame_tag | u32 | Тег кадра |
| **12** | domain_id | u8 | ID домена |
| **13** | pattern_id | u16 | ID паттерна |
| **15** | reset_mask16 | u16 | Маска сброса |
| **17** | collision_mask16 | u16 | Маска коллизий |
| **19** | winner_tile_id | u16 | ID победителя |
| **21** | cycle_time_us | u32 | Время цикла |
| **25** | flags32_last | u32 | FLAGS последнего цикла |
| **29** | bus16[8] | u8×8 | Значения шины |

---

## 🚩 Flags (u16)

| Бит | Флаг | Описание |
|-----|------|----------|
| **bit0** | has_winner | winner_tile_id/pattern_id валидны |
| **bit1** | has_bus | bus16[8] валидны |
| **bit2** | has_cycle | cycle_time_us валиден |
| **bit3** | has_flags | flags32_last валиден |

---

## 📋 Поля Пакета

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
Уникальный тег кадра для синхронизации
```

### domain_id (u8)

```
ID домена (0..15)
```

### pattern_id (u16)

```
ID паттерна (0..32767)
Валиден если flags.has_winner
```

### reset_mask16 (u16)

```
Маска доменов для RESET_DOMAIN
Каждый бит соответствует домену
```

### collision_mask16 (u16)

```
Маска доменов с коллизией (cnt≥2)
Валидно если flags.has_winner
```

### winner_tile_id (u16)

```
ID тайла-победителя
Валидно если flags.has_winner
```

### cycle_time_us (u32)

```
Время цикла в микросекундах
Валидно если flags.has_cycle
```

### flags32_last (u32)

```
FLAGS32 последнего цикла:
bit0: READY_LAST
bit1: OVF_ANY_LAST
bit2: COLLIDE_ANY_LAST
Валидно если flags.has_flags
```

### bus16[8] (u8×8)

```
Значения шины BUS16[0..7]
Валидно если flags.has_bus
```

---

## 🔄 Пример Пакета

### Hex Dump

```
0000: 44 38 55 50 01 00 0F 00  00 00 00 01 00 00 00 00   D8UP............
0010: 00 01 00 00 00 00 00 00  00 00 00 00 00 00 00 00   ................
0020: 00 00 00 00 00 00 00 00  00 00 00 00               ............
```

### Разбор

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

## 💻 Использование

### Отправка Пакета

```python
import socket

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

packet = struct.pack('<4sHHIIBHHHHIIBBBBBBBB',
    b'D8UP',           # magic
    1,                 # version
    0x000F,            # flags (все поля валидны)
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

### Приём Пакета

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

## 🔗 Интеграция

### Входной Поток (IN)

```
Decima-8 получает пакеты:
- reset_mask16 → EV_RESET_DOMAIN
- pattern_id → целевой паттерн
- bus16 → входные данные (если has_bus)
```

### Выходной Поток (OUT)

```
Decima-8 отправляет пакеты:
- frame_tag → синхронизация
- winner_tile_id → распознанный паттерн
- bus16 → состояние шины
- flags32_last → флаги цикла
```

---

**Bake the Future. Build the Substrate.** 🛠️⚡️
