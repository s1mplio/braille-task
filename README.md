# 🔡 BrailleBoard

BrailleBoard is a simple and intuitive Braille input app that lets you type Braille characters using your QWERTY keyboard. It supports live translation from keypress combinations to English characters, making it accessible for learning or testing Braille inputs.

---

## 🚀 Features

- 🔤 Type Braille using keys: **D, W, Q, K, O, P** (for dots 1–6)
- ✍️ Instant output of English characters
- 🧠 Auto-maps combinations like `D + W` → `b`
- 💡 Toggle between **Braille Mode** and **Text Mode**
- 🎯 Real-time key display and live character preview

---

## 🎮 Controls (Braille Mode)

| Key | Braille Dot |
|-----|-------------|
| D   | 1           |
| W   | 2           |
| Q   | 3           |
| K   | 4           |
| O   | 5           |
| P   | 6           |

Press multiple keys simultaneously to form a character. For example:
- `D + W` → **b** (`dots 1 & 2`)
- `K + P` → **unknown** (if not mapped)

---

## 🛠 How to Run Locally

```bash
git clone https://github.com/yourusername/brailleboard.git
cd brailleboard
npm install
npm start
