# TrakMotive 电子名片印刷与活码管理框架 (方案 B)

基于 **单 GitHub 仓库 + Cloudflare Pages / Vercel** 的企业电子名片全套交付系统。
针对国内纸质名片印刷场景设计，具备**永久活码（离职换人不换码）**、**轻量极速秒开（<20KB）**、**自适应头像/首字母圆圈**、**纯前端 vCard 一键存通讯录**与**留资表单交互**。

---

## 📁 目录结构

```text
├── cards/                  # 🌟 名片数据源（每次新增或修改名片只动这里）
│   ├── 01.json             # 1号名片：Nora Zeng (带照片实拍头像)
│   ├── 02.json             # 2号名片：Keith Gordon (无照片，姓名首字母KG圆圈)
│   └── 03.json             # 3号名片：Mark Roach (原站数据迁移)
├── assets/                 # 静态资产
│   └── logo.svg            # TrakMotive 官方矢量 Logo
├── src/                    # 核心模板源码
│   ├── template.html       # 1:1 还原名片骨架与移动端标签
│   ├── style.css           # 纯自研轻量 CSS（无任何第三方 CDN 依赖，国内秒开）
│   ├── card.js             # 纯前端生成 vCard 3.0 通讯录与表单弹窗
│   └── portal-template.html# 交付总览中心（含所有名片及印刷二维码下载）
├── functions/api/          # Cloudflare Pages Functions
│   └── exchange.js         # 名片互换（Exchange Contacts）留资接收端点
├── scripts/
│   ├── build.js            # 自动化编译脚本：读取 cards/ 生成 HTML 与高清二维码
│   └── serve.js            # 本地调试与预览服务器
├── dist/                   # 编译产物目录（自动生成）
│   ├── c/                  # 各员工名片路径 (/c/01/, /c/02/ ...)
│   ├── qrcodes/            # 1024px 高清印刷级黑白二维码（SVG + PNG）
│   └── index.html          # 名片导航与二维码下载中心
└── .github/workflows/
    └── deploy.yml          # GitHub Actions 自动化部署流
```

---

## ⚡ 核心功能与特性

1. **离职换人，不换二维码（永久活码机制）**：
   - 每位员工拥有固定编号 URL，如 `https://card.trakmotive.com/c/01/`。
   - 离职或岗位变动时，纸质印刷名片无需废弃，仅需修改 `cards/01.json` 内的姓名职位，重新构建即可无缝变更。
2. **头像自适应（满足客户 4 变量要求）**：
   - 有照片时：展示圆形裁切照片头像；
   - 无照片时：自动提取姓名缩写（如 Keith Gordon -> `KG`）并渲染品牌深蓝圆圈底色。
3. **超轻量国内秒开（<20KB）**：
   - 剥离原版 Uniqode 繁重 Web Component，纯自研现代 CSS + 原生 JS，单页加载仅 20KB 左右，微信扫码不卡顿。
4. **Exchange Contacts 交互功能**：
   - 点击底部按钮弹出交互浮层；
   - 支持**「一键存入手机通讯录」**（前端直接生成 RFC 2426 vCard 3.0，调起 iOS/Android 通讯录保存）；
   - 支持**「留下联系方式」**（访客输入姓名、手机、公司），通过 API 自动回传。
5. **印刷级无 Logo 二维码输出**：
   - 遵照客户要求不带中间 Logo，生成 1024px 高清 PNG 及矢量 SVG，印刷厂直接上版。

---

## 🚀 快速上手与本地预览

### 1. 安装依赖
```bash
npm install
```

### 2. 编译名片与生成二维码
```bash
npm run build
```
编译完成后，会在 `dist/` 目录下生成各独立名片页面及 `dist/qrcodes/` 印刷二维码。

### 3. 启动本地预览中心
```bash
npm run serve
```
浏览器打开 `http://localhost:3000/` 即可看到所有名片总览与实时效果。

---

## 🛠️ 日常维护操作（客户 15 元/次 运维流程）

### 场景 A：离职换人 / 修改名片信息
1. 打开对应编号文件，如 `cards/02.json`；
2. 修改姓名、职位、电话或邮箱；
3. 执行 `git commit -m "更新 02 号名片信息"` 并 push；
4. **二维码无需重印**，客户扫原二维码即刻显示新同事信息。

### 场景 B：新增第 23 张名片
1. 在 `cards/` 目录下新建 `23.json`（复制 `01.json` 或 `02.json` 模板）；
2. 填入新同事信息与 `slug: "23"`；
3. 执行 `npm run build`，系统自动在 `dist/qrcodes/23.png` 生成专属于该员工的新印刷码；
4. 将该二维码发送给印刷厂即可。

---

## 🌐 部署上线指南（Cloudflare Pages）

1. 将当前项目上传至您的 GitHub 私有或公开仓库；
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) -> **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**；
3. 选择该仓库，配置构建设置：
   - **Framework preset**: `None`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Environment variables**: `BASE_URL = https://你的自定义域名`（可选）
4. 点击 **Save and Deploy**，即可获得免费、高速且支持绑自定义域名的 CDN 站点！
