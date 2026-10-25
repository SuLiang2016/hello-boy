# 成语学习乐园

给 7-10 岁孩子的家用学习平台（平板浏览器访问）。现有「成语」「古诗」两个板块：读故事/读诗、看讲解、看插图、答三道题，攒星星、收徽章、连续打卡。

完整设计见 [../docs/DESIGN.md](../docs/DESIGN.md)，术语表见 [../CONTEXT.md](../CONTEXT.md)。

## 怎么用

### 家里日常使用（家长做一次）

1. 电脑上双击 `启动.bat`（第一次会自动安装依赖并构建，需要几分钟）。
2. 窗口里会打印 `平板访问: http://192.168.x.x:4173` 这样的地址。
3. 平板连同一个 WiFi，浏览器打开该地址，可「添加到主屏幕」当 App 用。
4. **电脑关机平板就打不开**——这是家用本机服务，正常现象。

### 首次打开

- 出现「家长设置」向导：设家长口令 → 建孩子档案（名字、头像、4 位口令）。
- 孩子以后点自己头像、输 4 位口令进入；登录状态长期有效。
- 家长入口在登录页底部：看每个孩子的进度、加孩子、改口令、备份恢复。

### 学习规则

- 成语：6 个篇章 × 10 个，一篇学会 8 个解锁下一篇。
- 古诗：5 个篇章 × 15 首，一篇学会 12 首解锁下一篇。
- 学 = 读完内容，3 题测验对 2 题；全对得 2 星，通过得 1 星，可无限重试。
- 学会后第 1/3/7/14/30 天复习，到期内容在首页混排提醒；五轮全过「牢记」。
- 当天学会 1 个新内容即打卡；连续 3/7/14/30 天、学会成语 10/30/60 个、古诗 10/30/75 首、学完篇章都有徽章。
- 星星进钱包，可在装扮间买帽子、眼镜、围巾、头饰和首页场景。

## 开发

```bash
npm install
npm run validate:content   # 校验 ../content 下的内容质量
npm run build:content      # 合并内容 -> src/assets/content.json
npm run build              # 构建前端 -> dist
npm start                  # 启动服务（默认 4173，改端口：server/config.json {"port": 5000}）
npm run dev                # 前端开发模式（5173，代理 API 到 4173）
npm run smoke              # API 冒烟测试（需要一个运行中的服务）
```

## 目录

```
成语学习/
├── server/        Express + node:sqlite（账号、进度、徽章、复习、家长 API）
├── src/           Vue 3 前端
├── content/       ↑在上级目录 ../content：成语/古诗内容源文件 + 风格指南
├── scripts/       内容构建、校验与冒烟测试脚本
├── data/app.db    所有账号与进度数据（备份这个文件就行）
└── 启动.bat       家长日常双击用
```

内容源文件：`content/groups.json` + `content/idioms/<篇章>.json`；`content/poem-groups.json` + `content/poems/<篇章>.json`。

## 内容与版权

- 成语故事/总结/测验/插图与古诗的讲解/诗人小故事/测验/插图全部自写；古诗原文与典故属公有领域。
- 成语拼音与出处参考 [chinese-xinhua](https://github.com/pwxcoo/chinese-xinhua)（MIT）；古诗原文参考 [chinese-poetry](https://github.com/chinese-poetry/chinese-poetry)（MIT），篇目以部编教材通行版为准。
- 界面图标、头像、插图均为本项目自绘 SVG，调色板统一，不依赖外部资源、不联网。
