// koi.config.js — 正式动效（可嵌入/KoiPondViewer）唯一配置来源。
// AI 拿到测试页「导出配置」复制的 JSON 后，把 decor / ripple / fish 三块按字段写进下方
// buildConfig 的实参即可，无需改动渲染代码。缺失字段会自动回落 koiConfig 默认值。
import { buildConfig } from './config/koiConfig.js';

// 初始 = 默认成品配置（含荷叶/荷花/花苞 + 默认涟漪 + 默认鱼群）。
// 自定义示例：
//   export default buildConfig({
//     decor: [ { id:'decor-01', src:'/decor/leaf-04.png', x:94.5, y:83.3, w:39.8, rotation:332.7, flipX:false, opacity:1, z:1 } ],
//     fish:  { count: 2, fishScale: 0.4 },
//     ripple:{ strength: 0.02 },
//   });
export default buildConfig();
