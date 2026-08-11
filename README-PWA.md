# 专注小达人 · PWA 网页 App 版

把"注意力专注训练"做成了 **PWA（渐进式网页应用）**：在安卓 / iOS 上**添加到主屏幕**后，桌面会出现 App 图标，点开就是**全屏、可离线**的原生 App 体验，不需要去应用商店下载。

## 文件结构（`pwa/` 目录）
```
pwa/
├── index.html                # 应用本体（含全部游戏逻辑，已验证）
├── manifest.webmanifest      # PWA 清单：名称/图标/全屏/竖屏
├── sw.js                     # Service Worker：离线缓存，秒开
└── icons/
    ├── icon-192.png          # 标准图标 192
    ├── icon-512.png          # 标准图标 512
    ├── icon-maskable-512.png # 自适应图标（被系统裁切也完整）
    └── apple-touch-icon.png  # iOS 主屏图标 180
```
功能与微信小程序版完全一致：舒尔特方格、颜色挑战（Stroop）、找一找、护眼休息、我的成就，成绩本地保存。

---

## 一、手机「添加到主屏幕」（核心，点图标访问）

必须先有一个 **https** 链接（见第二节部署），手机浏览器打开它后：

### Android（Chrome / Edge）
1. 浏览器打开 https 链接
2. 点右上角 `⋮` 菜单 → **「安装应用」** 或 **「添加到主屏幕」**
3. 桌面出现「专注小达人」图标，**点开即全屏运行，可离线**

### iOS（Safari，系统自带浏览器）
1. 用 **Safari** 打开 https 链接（微信内置浏览器不行）
2. 点底部 **分享** 按钮 `⬆` → **「添加到主屏幕」**
3. 主屏出现图标，**点开全屏、无地址栏、可离线**

> iOS 硬性要求：图标 / 安装必须走 **https**（http 无效），所以部署一定要用 https 托管。

---

## 二、部署成可访问的 https 链接

把 `pwa/` 整个目录传到任意**静态托管**（必须 https），保证 `index.html` 在根目录即可：

- **GitHub Pages**：把 `pwa/` 内容推到仓库，`Settings → Pages` 开启
- **Vercel / Netlify**：拖入 `pwa/` 目录，自动给 https 域名
- **对象存储 / 自己的服务器**：上传目录，配好 https 与默认首页 `index.html`
- **腾讯云 COS / 阿里云 OSS**：开启静态网站托管 + https

部署后拿到 https 链接，按第一节在手机添加主屏即可。

---

## 三、本机预览（开发者电脑）

在自己的电脑（非受限沙箱环境）进入目录起个静态服务：
```bash
cd pwa
python -m http.server 8080
# 浏览器打开 http://localhost:8080
```
> 注意：直接双击用 `file://` 打开 `index.html` 能正常玩，但**不能"安装"成 App、也不离线**——因为 Service Worker 与 manifest 只在 http/https 下生效。想体验"添加到主屏幕"，请用上面的静态服务 + https 部署。

---

## 四、图标说明
图标用代码生成（橙黄渐变 + 白色五角星 + 中心橙点），含 192 / 512 / maskable / apple-touch 四档，已通过 PNG 结构校验。如需换成自己的 Logo，替换 `icons/` 下四个文件并保持文件名即可。
