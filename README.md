# 锦鲤戏游 · Koi Pond Demo

> 水彩荷塘 · 锦鲤鱼群 · 真折射涟漪 · 鸭子光标

一个把「锦鲤鱼群 / 水面涟漪 / 小黄鸭光标」三种交互动效组合在一起的**独立前端 Demo**。
从个人简历站中独立出来，作为可复现、可二次开发的展示项目。

![Koi Pond](https://img.shields.io/badge/%E9%94%A6%E9%B2%A4%E6%88%8F%E6%B8%B8-web-%23cfe8dc)
![React](https://img.shields.io/badge/React-19-blue)
![Vite](https://img.shields.io/badge/Vite-8-purple)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ 效果

- **锦鲤鱼群**：基于 Boids 算法的锦鲤群游（分离 / 对齐 / 聚合 + 目标 + 游走扰动），脊椎骨架 + 柔性摆尾，程序化生成每尾鱼的「白底 + 红/黑斑」花色。
- **真折射涟漪**：用 WebGL（`ogl`）对鱼池画布做逐帧折射采样，移动 / 点击水面产生随波扭动、扩散、五彩光晕的涟漪。
- **小黄鸭光标**：系统光标替换为一只鸭子，头部始终朝向鼠标移动方向，且带与鱼影一致的固定方向投影。
- **参数控制台**：可实时调节鱼数量 / 鱼体大小 / 巡游速度 / 感知半径 / 权重等，并「复制配置 / 下载 JSON」固化参数。

## 🛠 技术栈

- [React 19](https://react.dev/)
- [Vite 8](https://vite.dev/)
- [ogl](https://github.com/oframe/ogl) — WebGL 折射渲染
- Canvas 2D — 鱼群骨架绘制
- Boids 算法 — 鱼群涌现行为

## 🚀 运行

```bash
npm install
npm run dev      # 开发预览 → http://localhost:5173
```

其他脚本：

```bash
npm run build    # 生产构建 → dist/
npm run preview  # 预览构建产物
npm run lint     # oxlint 检查
```

## 📸 使用说明

1. 在页面上**移动鼠标**：水面随鸭子产生折射涟漪，鱼群绕开鼠标与卡片障碍。
2. **点击水面**：生成一波更强的涟漪，鱼群向点击处聚拢。
3. 右上角**参数控制台**：拖拽滑杆实时调参，`复制配置` 可将当前参数导出为 JSON 固化。
4. 鸭子光标仅在「背景水面」上显示；鼠标移到可交互元素上时会切换回系统光标。

## 🧩 目录结构

```
koi-demo/
├─ index.html
├─ src/
│  ├─ App.jsx                       # 单页入口（无导航栏）
│  ├─ main.jsx
│  ├─ index.css                     # 全屏 / cursor:none 基础样式
│  └─ components/
│     ├─ KoiPond.jsx                # 锦鲤鱼群主组件（Canvas + Boids 接入）
│     ├─ index.js                   # 核心引擎（建世界 / 步进 / 快照）
│     ├─ boids.js                   # Boids 涌现算法
│     ├─ chain.js                   # 脊椎骨架 / 柔性摆尾
│     ├─ vec2.js                    # 二维向量工具
│     ├─ RippleDistortion.jsx/.css  # WebGL 真折射涟漪
│     ├─ DuckCursor.jsx             # 鸭子光标
│     └─ KoiControls.jsx            # 参数控制台
└─ public/                          # 水彩贴图 / 鸭子 / 荷塘背景
```

## 🎨 素材来源

本项目使用的 **鱼鳍贴图** 与 **荷塘水彩素材** 来自开源项目
[Koi-Fish-Pond](https://github.com/)（MIT 许可），可免费商用，风格契合国风水彩。

主要素材：

- 鱼鳍：`fin-left.png`、`fin-right.png`、`tail.png`
- 荷塘背景 / 荷叶 / 荷花：`bg-koi-pond.png`、`lotus-leaf-*.png`、`lotus-bloom-*.png`、`lotus-bud-*.png`
- 鸭子光标：`duck-cursor.png`

> 若素材版权所有方有额外要求，请遵守其原始 LICENSE。

## 📄 许可

本项目代码以 [MIT](LICENSE) 协议开源。

## 🙏 致谢

- 鱼群算法灵感源自 [Boids](https://en.wikipedia.org/wiki/Boids)（Craig Reynolds）
- 折射涟漪参考 `ogl` 官方示例
- 素材来自 Koi-Fish-Pond（MIT）
