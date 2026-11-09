# smartcards.pro/0AElyg 网页逆向报告 + GitHub Pages 同款可行性

> 分析日期：2026-11-09
> 对象：`https://smartcards.pro/0AElyg`（Uniqode 电子名片，卡片 Mark Roach）
> 方式：纯静态，仅 GET。未提交表单、未触发 vCard 下载、未对任何接口发起写操作
> 证据等级：**seen** = 文件/响应里直接读到；**inferred** = 由结构推断；**unknown** = 未验证

---

## 0. 结论

1. **不是独立网站**。`smartcards.pro` 是 Uniqode（原 Beaconstac）DBC（Digital Business Card）产品的白标域名，`/0AElyg` 只是卡片 slug。
2. **没有前端加密、没有签名、没有混淆**。卡片全部数据（72 个字段、5,982 字节）以 `JSON.parse('…')` 明文写在 HTML 第 363 行，任何人查看源码即可拿到。
3. 渲染由公开 npm 包 `uniqode-card-templates@1.1.4` 的 Web Component `<uniqode-layout-3>` 完成，组件本身不联网；所有取数由页面内联 JS 发起。
4. 服务端是 nginx + Django（`csrfmiddlewaretoken` 隐藏域、`eddy.pro/` 应用命名）。
5. 因此**用 GitHub Pages 复刻是可行的**，能达到约 85% 的功能；缺口集中在"需要服务端的三件事"：真实留资存储、地理分析、防刷风控。

---

## 1. 技术栈指纹

| 项 | 值 | 来源 |
|---|---|---|
| HTTP 状态 | 200，无跳转 | 响应头 |
| Server | `nginx` | 响应头 |
| 后端框架 | Django（**inferred**） | `csrfmiddlewaretoken` 隐藏域、`eddy.pro/`、`/dbc/` 路径风格 |
| Cookie | `visitor-id`（1 年）、`csrftoken`（HttpOnly, SameSite=None, Secure） | `Set-Cookie` |
| HSTS | `max-age=300`（5 分钟，偏短） | 响应头 |
| CSP | 只有 `frame-ancestors`，无 `script-src` | 响应头 |
| CORS | `ACAO: https://smartcards.pro` + `Allow-Credentials: true` | 响应头 |
| 页面体积 | 39,422 B | `Content-Length` |
| 静态资源 | `cdn.uniqode.com`（图片）、`d3nvy39jvu7woe.cloudfront.net`（static_assets_url）、S3 `beaconstac-content`（二维码） | HTML |

CSP 原文（**内部域名泄露点**）：

```
frame-ancestors 'self' http://localhost:4201
  https://*.d327lod86irefd.amplifyapp.com
  https://staging.mycards.uniqode.com
  https://*.staging.mycards.uniqode.com
  https://mycards.uniqode.com
```

`Access-Control-Allow-Headers` 里还出现了内部服务名 `X-Insights-Redirect`。

---

## 2. 渲染链

```
GET /0AElyg
  └─ nginx → Django：按 slug 查卡（org 189912 / card 193633）
       └─ 模板注入：JSON.parse('...') 直接塞进 card_data（无加密、无签名）
            └─ 浏览器：customElements.whenDefined('uniqode-layout-3')
                 └─ cardElement.cardData = card_data; cardElement.config = {...}
                      └─ Web Component 在 open shadowRoot 内渲染整张卡
```

关键代码（HTML 第 363、788–800 行）：

```js
// 数据注入
let card_data = JSON.parse('{\u0022id\u0022: 193633, ...}');
card_data.api_base_url = "https://api.uniqode.com";
card_data.leads_security_token = "6dc008c753c2624aa56894e345866c4feda9db39";
card_data.product_id = 193633;
card_data.slug = "0AElyg";

// 组件 hydrate
const LAYOUT_TAG = 'uniqode-layout-3';
cardElement.cardData = card_data;
cardElement.config = {
  platform: 'server',
  clicksDisabled: false,
  showConnectButtons: false,
  hideFooter: false
};
```

组件标签：`<uniqode-layout-3 id="uniqode-card">`，外层 `.layout-wrapper`（max-width 500px）；shadow root 模式由 `window.UniqodeCardConfig = { shadowMode: 'open' }` 指定。

---

## 3. 数据模型：`card_data`（72 个字段）

完整解码结果见 `card_data.json`。按用途分组：

### 3.1 身份与组织

| 字段 | 值 |
|---|---|
| `id` | 193633 |
| `organization` | 189912 |
| `card_owner` | `{id:190500, email:"m***@trakmotive.com", earned:null}` |
| `maintainer` | 190500 |
| `meta` | `dbc_count:37`、creator/updater id 与**邮箱**、`organization_template_id:35315` |
| `slug` | `0AElyg`（即 URL 末段） |
| `created` / `updated` | 2025-03-04 / 2026-09-16（+05:30 时区） |

### 3.2 展示内容

| 字段 | 值 |
|---|---|
| `first_name` / `last_name` | Mark / Roach |
| `designation` | Marketing Director |
| `company` | Advanced Innovative Technology Corp. |
| `address_v2` | 1675 W Park Ave, Redlands, CA 92373, USA |
| `phone_v2` | `[{label:"Mobile", value:"(440) 552-7***"}]` |
| `email_v2` | `[{label:"", value:"m***@trakmotive.com"}]` |
| `website_v2` | `[{label:"", value:"https://www.trakm***.com"}]` |
| `social_links` | facebook / linkedin / youtube / instagram / twitter（其余 15 个为 null） |
| `logo_url` / `card_preview_url` / `preview_qr_code` | cdn.uniqode.com 与 S3 地址 |

> 说明：以上邮箱/电话在报告里做了掩码，原文完整值在 `card_data.json`（本来就是公开 HTML 内容）。

### 3.3 外观与配置

| 字段 | 值 |
|---|---|
| `layout` | `"3"`（对应 `card-layout-3.js`） |
| `card_template` / `template.id` | 204 / 9326275 |
| `customizations` | 背景 `#ffffff`、字体 `Karla`、图标色 `#c8102e`、按钮色、字号/字重全套 |
| `logo_size` | 50 |
| `branding_footer` | true（带 Uniqode 品牌页脚） |
| `contact_info_ordering` | phone_v2 → email_v2 → website_v2 → address_v2 |
| `social_links_ordering` | facebook → instagram → twitter → linkedin … |
| `default_language` / `language_data` | null / `{}`（未启用多语言） |

### 3.4 表单与留资

| 字段 | 值 |
|---|---|
| `lead_collection` | true |
| `lead_attribute` | `{phone:true, designation:true, company:true, notes:false, connection:2}` |
| `lead_user_agreement` | true，`user_agreement_urls: []` |
| `name_in_lead_consent` | `card_owner_name` |
| `follow_up_email` | false（但 body/subject 模板已存在） |
| `autodownload_v2` | false |

### 3.5 统计与状态

| 字段 | 值 |
|---|---|
| `views` / `saves` | 44 / 1（**对外可见**） |
| `threat_active` | false（说明存在威胁扫描开关） |
| `deleted` | null |
| `spice_migration_completed` | true（历史迁移标记） |
| `tags` / `tags_data` / `custom_fields` | 空 |

---

## 4. Web Component 剖析

| 项 | 值 |
|---|---|
| 包名 | `uniqode-card-templates` |
| 版本 | `1.1.4`（`latest`，2026-09-17 发布；`beta` 为 1.1.5-beta.1） |
| 来源 | `cdn.jsdelivr.net/npm/uniqode-card-templates@1.1.4/dist/card-layout-3.js` |
| 体积 | 159,366 B，webpack 压缩成单行 |
| 仓库 | `github.com/uniqode/card-templates` |
| 包内文件 | 18 个；`dist/card-layout-{1..9,11,12,13}.js` 共 **12 套布局** + `index.js`（532 KB 全量） |
| 自定义元素 | `<uniqode-layout-3>`，`shadowMode: open` |

**属性**：`card-data`、`config`、`data-source`、`config-source`
（`observedAttributes` 实测返回值）

**方法**（部分）：`showLeadFormSuccess()`、`showLeadFormError()`、`showCardExchangeAnimation()`、
`showSuccessDrawer()`、`showDecoupledAppRedirectDrawer()`、`setLanguage()`、`getCurrentLanguage()`

**事件**（页面侧监听的 15 个）：

```
LEAD_FORM_SUBMIT      LEAD_FORM_OPEN        LEAD_FORM_CLOSE
ADD_TO_CONTACT_CLICK  EXCHANGE_CONTACTS_CLICK
CONNECT_CLICK         CREATE_NOW_CLICK      FOOTER_CTA_CLICK     FOOTER_LOGO_CLICK
ANIMATION_STARTED     ANIMATION_ENDED
APP_REDIRECT_CTA_CLICK  APP_REDIRECT_DRAWER_OPEN  APP_REDIRECT_DRAWER_CLOSE
LANGUAGE_CHANGE
```

**职责边界**（**seen**）：组件内只有一处 `fetch`——下载 vCard 的 `autodownload_url`。其余所有网络请求都在页面内联脚本里。也就是说组件是纯渲染器，接入逻辑由宿主页面注入。

---

## 5. 网络接口

| # | 端点 | 方法 | 作用 | 鉴权 / 参数 |
|---|---|---|---|---|
| 1 | `https://api.uniqode.com/eddy.pro/lead/` | POST | 保存留资 | `leads_security_token`（40 位 hex，公开写在 HTML）+ `X-CSRFToken`；body：`first_name/last_name/email/phone/company/designation/notes/marketing_consent/creation_source:1/token/dbc` |
| 2 | `{origin}/eddy.pro/dbc/et/` | POST | 埋点 | `X-CSRFToken`；body：`event`、`card_owner:190500`、`card_id:193633`、`org_id:189912`、`fingerprint`、`mappable_id` |
| 3 | `{origin}/dbc/analytics/location/` | POST | 经纬度上报 | `X-CSRFToken`；body 含 `latitude/longitude/location_enabled/ip_address/maintainer/cardOwner/dbc/mappableId` |
| 4 | `{origin}/add-to-contacts/193633?mappable_id=…` | GET | 下载 vCard | 无 |

埋点事件举例（页面内调用）：`lead_collected`、`add_to_contact_main_drawer_open`、`exchange_contact_drawer_open`、`success_drawer_open`、`create_your_free_card_clicked`、`download_app_cta_clicked`、`post_scan_save_contact_cta_clicked`。

---

## 6. 隐私与安全观察

| 观察 | 级别 | 说明 |
|---|---|---|
| 内部/预发域名泄露 | **seen** | CSP `frame-ancestors` 列了 `staging.mycards.uniqode.com`、`*.d327lod86irefd.amplifyapp.com`、`localhost:4201` |
| 内部服务名泄露 | **seen** | `Access-Control-Allow-Headers: X-Insights-Redirect` |
| 联系邮箱明文 | **seen** | `card_owner.email`、`meta.creator_email`、`meta.updater_email` |
| 访客 IP 回填 | **seen** | `card_data.ip_address = "59.51.107.178"`（本次为代理出口），随位置数据上报 |
| 曝光/保存计数公开 | **seen** | `views:44`、`saves:1` |
| CDN 脚本无 SRI | **seen** | `<script type="module" src=".../@1.1.4/...">` 无 `integrity`、无 `crossorigin` |
| CSP 未限制 `script-src` | **seen** | 只有 `frame-ancestors`，对 XSS 无纵深防御 |
| HSTS 仅 300 秒 | **seen** | 低于常见 6–12 个月 |
| 广告转化统计失效 | **seen** | `gtag('config','AW-None')`，`googleId="None"`，`startsWith('AW-')` 分支永不命中 |
| 留资接口可被滥用 | **inferred / unknown** | token 对同一卡固定且公开，提交仅靠同源 CSRF 校验；是否有频率限制、验证码、UA 校验**未验证**（未发起任何 POST） |
| CORS 是否反射 Origin | **unknown** | 响应头只声明了 `smartcards.pro`，未实测 `api.uniqode.com` 对任意 Origin 的行为 |

**未做的事**：没有提交表单、没有下载 vCard（会 +1 `saves`）、没有请求 `api.uniqode.com` 的写接口、没有对第三方做任何主动测试。

---

## 7. GitHub Pages 复刻：功能矩阵

| 原站功能 | Pages | 说明 |
|---|---|---|
| 卡片渲染（头像/姓名/职位/公司/配色/字体） | 原生 | JSON 驱动 + 自写 Web Component |
| 布局模板切换 | 原生 | 多套 CSS 变量，`?theme=` 或构建期选择 |
| 多语言 | 原生 | 同构 `language_data`，纯前端 |
| vCard 下载 | 原生 | 前端拼 vCard 3.0 → Blob → `a[download]` |
| 二维码 | 原生 | 构建期生成 PNG，或内联 qrcode 库 |
| 分享（系统分享/复制链接） | 原生 | `navigator.share` + 降级二维码 |
| PWA / 离线 / 加到桌面 | 原生 | manifest + service worker |
| 微信等 IM 内预览 | 需技巧 | 爬虫不执行 JS → OG meta 必须构建期写死 |
| 短链 | 近似 | `you.github.io/<repo>/` 或自定义域名 + 路径 |
| 访问统计 | 第三方 | Cloudflare Web Analytics / Umami / GoatCounter |
| 留资表单 | 第三方 | Formspree / Tally / Cloudflare Worker |
| 地理位置分析 | 做不到 | 无接收端点 |
| 防刷 / 验证码 / 风控 | 做不到 | 无服务端 |
| 私有卡片（密码可见） | 做不到 | 数据全在源码 |
| 自定义响应头（CSP/HSTS） | 做不到 | 只能 `<meta>` 或前置 Cloudflare |

---

## 8. 静态化架构

```
cards/*.json  ──┐
templates/    ──┼─→ GitHub Actions 构建 ─→ dist/
scripts/build ──┘        │                  ├─ index.html         （单卡）
                         │                  └─ c/<slug>/index.html（多卡，含 OG）
                         └→ upload-pages-artifact → deploy-pages → Pages CDN + HTTPS
```

原来服务端干的活，落到三处：

| 原站服务端职责 | 静态替代 |
|---|---|
| 按 slug 查卡 | 构建时枚举 `cards/*.json`，一卡一页 |
| 动态 OG / 分享预览 | 构建时把 title/description/og:image 写进每个 HTML |
| 留资与埋点 | 第三方（或放弃） |

---

## 9. 实施要点

### 9.1 vCard（前端生成，别调接口）

```js
const vcf = [
  'BEGIN:VCARD', 'VERSION:3.0',
  'N:Roach;Mark;;;', 'FN:Mark Roach',
  'ORG:Advanced Innovative Technology Corp.',
  'TITLE:Marketing Director',
  'TEL;TYPE=CELL:+1-440-552-7xxx',
  'EMAIL;TYPE=WORK:m***@example.com',
  'URL:https://example.com',
  'END:VCARD'
].join('\r\n');
const url = URL.createObjectURL(new Blob([vcf], {type:'text/vcard'}));
```

头像内联 base64 会让文件从 ~300 B 涨到 ~200 KB，iOS 解析明显变慢，建议不放或压到 64×64。

### 9.2 OG 预览

爬虫不跑 JS。每张卡在构建时输出完整 `<head>`；要图片就用 satori + resvg 在 Actions 里渲染 PNG。同一份数据同时喂页面和 OG，避免文案不一致。

### 9.3 多卡

`cards/<slug>.json` 为唯一数据源；构建脚本产出 `dist/c/<slug>/index.html`。改卡 = 一次 commit，历史即版本，回滚 = revert。

### 9.4 PWA

`manifest.webmanifest` + 一个只缓存静态壳的 service worker（不要缓存 HTML，避免名片更新后不生效）。

---

## 10. GitHub Pages 限制（官方文档）

| 项 | 限制 |
|---|---|
| 计划 | 公开仓库免费；私有仓库发布 Pages 需 GitHub Pro / Team / Enterprise |
| 仓库体积 | 推荐 ≤ 1 GB |
| 发布站点 | ≤ 1 GB |
| 带宽 | 100 GB/月（软限制） |
| 构建 | 10 次/小时（软限制；**自定义 Actions workflow 不受此限**） |
| 部署超时 | 10 分钟 |
| 站点数量 | 每账号 1 个 user/org 站点，每仓库 1 个 |
| 服务端能力 | 无后端、无自定义响应头 |

### 合规红线（重要）

GitHub 文档明确：**把现有网站复制一份作为学习用途不禁止**，但必须同时满足：

1. 代码自己写（不能把 `uniqode-card-templates` 的 dist 直接搬过去）；
2. 站点不收集任何用户数据（→ 留资表单在学习复刻场景下不该有）；
3. 页面显著位置声明与本项目无关、仅用于学习。

另外 Pages 不允许用作商业/SaaS 托管。真要带留资、给别人开卡，换 Cloudflare Pages/Workers 或 Vercel。

---

## 11. 三档落地方案

| 档 | 内容 | 复杂度 |
|---|---|---|
| A 单卡个人版 | 一个 `index.html` + JSON，含主题、vCard、二维码、分享、PWA | 一次会话 |
| B 多卡 + 构建 | `cards/*.json` → Actions 生成多页 + OG + 预览图 + 自定义域名 | 需 Node 构建脚本 |
| C 带数据 | B + 统计 + 第三方表单（且只在自己的商业域名下开留资） | 需接第三方 |

推荐目录：

```
repo/
├─ cards/
│  └─ mark-roach.json
├─ src/
│  ├─ card-element.js      # 自写 Web Component
│  ├─ theme.css
│  └─ vcard.js
├─ scripts/build.mjs
├─ .github/workflows/pages.yml
└─ dist/                   # 构建产物，Pages 发布源
```

---

## 附录 A：本次使用的作业规范（REA）

来自本机 codex 技能：`~/.codex/skills/leanrea/SKILL.md`、`~/.codex/skills/reverse-skill/`。

1. 先按魔数/类型路由，再跑最便宜的清单，最后才反编译读码。
2. 独立探测合并成一次调用，`;` 串联，`echo '--- name'` 分隔，每条 `head` 截断。
3. 不 `cat` 大文件：`rg -o '.{0,200}NEEDLE.{0,200}'` 切片；反汇编先落盘再 grep。
4. 提取树用 `rg -uu`（默认会漏隐藏与被 ignore 的文件）。
5. 结论标 **seen / inferred / unknown**；静态读到 ≠ 实际执行过。
6. 2–4 次工具调用收敛，够了就停。
7. 授权门禁：未获授权不对目标做写操作（本次因此跳过了 lead 接口与 vCard 下载）。

本机工具实况：可用 `jadx/adb/frida-ps/rabin2/radare2/python/unzip/rg/java`；
缺 `apktool/ghidra/objdump/readelf/strings/jq/7z`（用 `rabin2 -z`、`python -c` 顶替）。

---

## 附录 B：证据文件与复现

目录：`work/smartcards/`

| 文件 | 说明 |
|---|---|
| `index.html` | 原始页面 39,422 B |
| `card_data.json` | 解码后的 72 字段（含未掩码原值） |
| `card-layout-3.js` | 组件 159,366 B |
| `npm.json` | npm registry 元信息 |
| `jd.json` | jsDelivr 文件清单（18 个） |

复现命令：

```bash
curl -sSL -A "Mozilla/5.0" -D headers.txt -o index.html https://smartcards.pro/0AElyg
curl -sSL -o card-layout-3.js https://cdn.jsdelivr.net/npm/uniqode-card-templates@1.1.4/dist/card-layout-3.js
python -c "import json,re;h=open('index.html',encoding='utf-8').read();m=re.search(r\"JSON\.parse\('(.*?)'\);\",h,re.S);d=json.loads(json.loads('\"'+m.group(1)+'\"'));print(len(d))"
```

---

## 附录 C：未验证事项

- `api.uniqode.com/eddy.pro/lead/` 是否接受伪造 token、是否有速率限制；
- 该 API 对任意 Origin 的 CORS 行为；
- `smartcards.pro` 是否对 slug 做枚举防护（如遍历 6 位短码）；
- 其余 11 套 layout 的行为差异；
- 移动端 UA 下是否走不同模板分支。
