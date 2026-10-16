# PTT 閱讀改版：瀏覽器擴充功能

把 [`ptt/ptt-reader-theme.user.css`](../ptt/ptt-reader-theme.user.css) 和 [`ptt/ptt-enhance.user.js`](../ptt/ptt-enhance.user.js)
包成一個 Manifest V3 擴充功能，Chrome 和 Safari 共用同一份輸出。不用另外裝 Stylus / Violentmonkey。

樣式和腳本**仍然只改 `ptt/` 底下的原始檔**；這裡只放轉換腳本和擴充功能自己的外殼（manifest、設定頁）。

```
extension/
├── build.mjs          原始檔 → dist/
├── icon.svg           圖示原稿（src/icons/*.png 由它輸出）
└── src/
    ├── manifest.json  version 由 build 從 userstyle 的 @version 帶入
    ├── settings.js    把設定寫成 <html> 上的 CSS 變數，設定頁改了即時生效
    ├── options.html   設定頁（同時是工具列按鈕的彈出視窗）
    ├── options.js     依 @var 自動長出表單
    └── options.css
```

## 建置

```bash
node extension/build.mjs
```

會產生 `extension/dist/`：

- `ptt-theme.css`：拿掉 `==UserStyle==` 標頭與 `@-moz-document` 外殼，最前面補上 `@var` 的預設值（`:root { --mainFont: …; }`）
- `ptt-enhance.js`：userscript 原封不動（`@grant none`，本來就不依賴 GM API）
- `settings-schema.js`：從 `@var` 解析出來的設定表，設定頁和 `settings.js` 共用

在 userstyle 加新的 `@var`，設定頁就會自動多一個欄位。目前支援 `text`、`select`、`range`、`number`、`checkbox`、`color`。

## Chrome

1. `chrome://extensions` → 右上角開「開發人員模式」
2. 「載入未封裝項目」→ 選 `extension/dist`
3. 改完原始檔重跑 build，再按擴充功能卡片上的重新載入

## Safari

需要完整的 Xcode（不是只有 Command Line Tools）。

Xcode 專案已經轉好放在 `extension/safari/`，用相對路徑**參照** `dist/` 裡的檔案（不是複製），所以平常只要：

```bash
node extension/build.mjs
```

```bash
xcodebuild -project "extension/safari/PTT 閱讀改版/PTT 閱讀改版.xcodeproj" -scheme "PTT 閱讀改版" -derivedDataPath "extension/safari/PTT 閱讀改版/build" CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM= build
```

或直接在 Xcode 按 Run。`CODE_SIGN_IDENTITY=-` 是 ad-hoc 簽章，自己這台用就夠。

- 啟用：打開一次 build 出來的 `PTT 閱讀改版.app` 讓 Safari 註冊 → Safari「設定 › 進階」勾「顯示網頁開發者功能」→「開發」選單勾「允許未簽署的延伸功能」→「設定 › 延伸功能」勾選並允許 www.ptt.cc
- 「允許未簽署的延伸功能」每次重開 Safari 都會被取消，要重勾；不想每次勾就得用 Apple Developer 帳號簽章
- `dist/` **多了新檔案**時要在 Xcode 把它加進 Extension target 的 Resources（只改內容不用）
- 重新轉換專案（例如改了 manifest 結構）：

  ```bash
  xcrun safari-web-extension-converter extension/dist --project-location extension/safari --app-name "PTT 閱讀改版" --bundle-identifier io.github.turtle11311.ptt-reader --macos-only --no-open --force
  ```

  轉換器會把中文 App 名稱轉成 `io.github.turtle11311.PTT-----` 當 App 的 bundle ID，跟 Extension 的 `io.github.turtle11311.ptt-reader.Extension` 對不上會 build 失敗；轉完要把 `project.pbxproj` 裡的 `PTT-----` 改回 `ptt-reader`。
- 要上架或給別人裝才需要 Apple Developer 帳號（年費）；自己用不必

### Safari 要注意

- **字體**：Safari 為了防指紋，網頁只能用系統內建字體，自己裝的字體（例如 Sarasa Mono TC）很可能不會生效，會退回 `sans-serif`。補位字體用的儷黑 / 儷宋 / 冬青黑體是 macOS 內建，不受影響。如果主要字體在 Safari 用不了，可能要把字體檔打包進擴充功能，用 `@font-face` 的 `url()` 載入。
- `storage.sync` 在 Safari 可以用，但不會跨裝置同步。
