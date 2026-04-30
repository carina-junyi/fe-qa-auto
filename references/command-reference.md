# agent-browser Command Quick Reference

所有指令均使用完整路徑 `/opt/homebrew/bin/agent-browser`。

## 基本操作

| Action | Command |
|--------|---------|
| Open URL | `agent-browser open "<url>"` |
| Snapshot | `agent-browser snapshot` |
| Compact snapshot | `agent-browser snapshot -c` |
| Interactive-only | `agent-browser snapshot -i` |
| Screenshot | `agent-browser screenshot` |
| Full-page screenshot | `agent-browser screenshot --full` |

## 點擊與互動

| Action | Command |
|--------|---------|
| Click by ref | `agent-browser click @eN` |
| Click by CSS | `agent-browser click "#hint"` |
| Mouse click | `agent-browser mouse move x y && agent-browser mouse down && agent-browser mouse up` |
| Press key | `agent-browser press Enter` |
| Dismiss popup | `agent-browser press Escape` |
| Find & click text | `agent-browser find text "下一題" click` |
| Select dropdown | `agent-browser select @eN "value"` |
| Fill input | `agent-browser fill @eN "text"` |
| Keyboard type | `agent-browser keyboard type "text"` |

## 導航與等待

| Action | Command |
|--------|---------|
| Scroll down | `agent-browser scroll down 500` |
| Scroll into view | `agent-browser scrollintoview @eN` |
| Wait (ms) | `agent-browser wait 2000` |
| Wait for network | `agent-browser wait --load networkidle` |

## JavaScript 執行

| Action | Command |
|--------|---------|
| Inline eval | `agent-browser eval "(function(){ return 'ok'; })()"` |
| File-based eval | `agent-browser eval "$(cat scripts/script.js)"` |

**建議：** 長 JS 一律放在 `scripts/` 目錄下，用 file-based eval 引用，避免 shell quoting 問題。
