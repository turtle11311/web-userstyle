# web-userstyle

自己用的網頁樣式（Stylus UserCSS）與 userscript（Violentmonkey）。

| 網站 | 檔案 | 類型 | 安裝 |
|---|---|---|---|
| PTT | [`ptt/ptt-reader-theme.user.css`](ptt/ptt-reader-theme.user.css) | Stylus | [安裝](https://raw.githubusercontent.com/turtle11311/web-userstyle/main/ptt/ptt-reader-theme.user.css) |
| PTT | [`ptt/ptt-enhance.user.js`](ptt/ptt-enhance.user.js) | Violentmonkey | [安裝](https://raw.githubusercontent.com/turtle11311/web-userstyle/main/ptt/ptt-enhance.user.js) |
| Claude | [`claude/claude-custom-font.user.css`](claude/claude-custom-font.user.css) | Stylus | [安裝](https://raw.githubusercontent.com/turtle11311/web-userstyle/main/claude/claude-custom-font.user.css) |
| Readmoo | [`readmoo/readmoo-custom-font.user.css`](readmoo/readmoo-custom-font.user.css) | Stylus | [安裝](https://raw.githubusercontent.com/turtle11311/web-userstyle/main/readmoo/readmoo-custom-font.user.css) |

點「安裝」會開啟 raw 檔案，Stylus / Violentmonkey 會自動跳出安裝頁。
每個檔案都有 `@updateURL`，之後改版只要調高 `@version` 再 push，擴充功能會自動檢查更新。

## PTT

### PTT 閱讀改版（Stylus）

- 自訂等寬字體，並用 `unicode-range` 補位，讓框線、方塊、希臘字母等「寬度不明」的符號維持全形，ANSI 排版不會歪
- 卡片式文章清單、置中 80 欄閱讀欄、對齊的推文表格
- 看板清單（熱門看板、分類看板）改成卡片網格：人氣徽章沿用 PTT 熱度色，分類資料夾有獨立樣式
- 配色跟隨系統深淺色，ANSI 顏色也配合重新調整
- 齒輪設定：主要字體、全形符號補位字體、內文字級、行距、清單字級、清單頁寬度

### PTT 閱讀增強（Violentmonkey）

只做 CSS 做不到的事——讀文字、加 class、重組 DOM；外觀全部由上面的 Stylus 樣式負責。

- 推文依 ID 雜湊上色，同一人連續推文淡化重複 ID，滑過 ID 高亮同一人
- 推文標上樓層（1F、2F…），回文時不用自己數；原PO補充卡片與簽名檔裡的假推文不佔樓層
- 原PO：標頭作者、原PO 推文、原PO 補充卡片都用同一個顏色；推 / 噓 / → 分開上色
- 發信站、文章網址整理成資訊卡（附「複製」按鈕）
- 改文章插在推文中間的補充內容 → 時間軸上的「原PO補充」卡片
- 簽名檔包成獨立區塊，裡面被 PTT 誤判成推文的行還原成普通文字
- 清單頁：作者 ID 同色、`Re:` / `Fw:` 標籤、同一頁內標出原PO回覆
- 看板清單：拆出中文板名與說明、熱門看板加排名；即時篩選框（`/` 開始、`Enter` 進第一個結果、`Esc` 清空）

兩者分開安裝：只裝 Stylus 樣式就有完整外觀；再裝 userscript 才有上面這些增強。
兩邊用 `.ptt-*`、`[data-uid]`、`.is-op` 這些 class 溝通。

## Claude

### Claude 自訂字體（Stylus）

claude.ai 的字體變數只有最上層 3 個是真的字體（`--font-anthropic-sans` / `-serif` / `-mono`），
其他像 `--font-ui`、`--font-claude-response` 都是從它們衍生的，所以只覆寫這 3 個。

- 黑體：介面與你的訊息，預設源起黑體 `GenKiGothic2 TW`
- 明體：Claude 的回覆，預設 `Claude Serif`——源起明體依字重對應（一般 → Medium、500 → SemiBold、600 → Bold、700+ → Heavy）
- 等寬：程式碼，預設 Sarasa Mono TC

## Readmoo

### Readmoo 自訂閱讀字體（Stylus）

閱讀器的書本內文在 `https://next.readmoo.com/ebook/…` 的同源 iframe 裡，樣式對準這個網址注入。
齒輪設定：內文字體、標題字體、標題是否套用。

## 需要的字體

| 字體 | 用途 | macOS | Windows |
|---|---|---|---|
| [Sarasa Mono TC](https://github.com/be5invis/Sarasa-Gothic) | PTT 主要字體 | 需安裝 | 需安裝 |
| 儷黑 Pro / 儷宋 Pro / 冬青黑體 | PTT 全形符號補位 | 內建 | — |
| 細明體（MingLiU） | PTT 全形符號補位（Windows 自動改用） | — | 繁中版內建；其他語系到「設定 → 選用功能」加裝「中文（繁體）補充字型」 |
| jf-jinxuan-4.0 | Readmoo 預設內文字體 | 需安裝 | 需安裝 |
| 源起黑體 GenKiGothic2 TW | Claude 介面 | 需安裝 | 需安裝 |
| 源起明體 GenKiMin2 TW | Claude 回覆 | 需安裝 | 需安裝 |

## 安裝擴充功能時的注意事項

- **Violentmonkey（Chrome）**：到 `chrome://extensions` → Violentmonkey →「詳細資料」，開啟「允許使用者指令碼」，網站存取權設為「在所有網站上」。沒開的話腳本會顯示已安裝但不會執行。剛裝好或改完設定後，記得重新整理頁面。
- **字體名稱**：在 Stylus 齒輪裡填字體時，每個名稱都要加引號，例如 `'jf-jinxuan-4.0'`。名稱裡有數字或點時，不加引號會讓整條 CSS 失效。
- **用英文名稱**：一律填字體的英文家族名（`local()` 裡用 PostScript 名稱），不受系統語言影響；中文名稱（例如「蘋方-繁」）在不同語言的系統上不一定比對得到。
