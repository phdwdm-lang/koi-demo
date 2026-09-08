// lib.js — npm / 可嵌入 bundle 入口。
// 暴露 KoiPondViewer（读 config 的纯观赏组件）与 koiConfig（正式动效唯一配置来源）及配置协议工具。
//
// 使用者接入示例：
//   import { KoiPondViewer, koiConfig } from 'koi-demo';
//   <KoiPondViewer config={koiConfig} />   // 不带 config 时默认读 koi.config.js
export { default as KoiPondViewer } from './components/KoiPondViewer.jsx';
export { default as koiConfig } from './koi.config.js';
export * from './config/koiConfig.js';
