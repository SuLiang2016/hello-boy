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
- 成语接龙：学会第一个成语后解锁，每天一条每日链 + 随机自由练习；不计星星、打卡和学习进度，完成 10 局得「接龙高手」徽章。
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

## 云端部署（腾讯云轻量应用服务器）

线上地址：<http://139.199.231.204/hello-boy/>（根路径 `/` 会 302 跳到该地址）

| 项 | 位置 |
|----|------|
| 服务器 | 广州地域 `lhins-rz6zpyi7`，Ubuntu 24.04，2C2G，公网 IP 139.199.231.204 |
| 代码 | `/opt/hello-boy`（dist + server + src/assets/content.json + node_modules，运行用户 ubuntu） |
| 数据 | `/opt/hello-boy/data/app.db`（SQLite，WAL；改数据只动这个目录） |
| 进程 | systemd `hello-boy.service`，监听 `127.0.0.1:4173`，开机自启 |
| 入口 | nginx `sites-available/hello-boy`，`/hello-boy/` 剥前缀转发到 4173 |
| 运行环境 | Node 22.22.2，装在 `/opt/node22`（`/usr/local/bin/node` 软链） |
| 日志 | `journalctl -u hello-boy -f`；`/var/log/nginx/access.log` |

部署在子路径，构建时必须带前缀（`vite.config.js` 读 `APP_BASE`，路由与 API 走 `import.meta.env.BASE_URL`）：

```bash
APP_BASE=/hello-boy/ npm run build      # Git Bash 里需加 MSYS_NO_PATHCONV=1，否则路径被转换
```

日常更新流程（**`src/assets/content.json` 必须一起传**，服务端运行时读它，漏了所有读内容的接口都会 500）：

```bash
# 本机构建后打包上传
tar czf /tmp/hello-boy-app.tar.gz -C 成语学习 dist server src/assets/content.json scripts/backup-db.js package.json package-lock.json
scp /tmp/hello-boy-app.tar.gz ubuntu@139.199.231.204:/tmp/
# 服务器上替换并重启（data/ 不受影响）
ssh ubuntu@139.199.231.204 'sudo tar xzf /tmp/hello-boy-app.tar.gz -C /opt/hello-boy && sudo systemctl restart hello-boy'
```

### 部署前先备份数据、部署后对一把

`data/app.db` 是孩子全部进度（账号、星星、复习排期、接龙局数），丢了不可重建。部署包**不含 `data/`**，解压本身不会覆盖它；但改表结构或改写入逻辑的版本，仍要留快照再上线：

```bash
# 在服务器上跑（服务运行中也安全：VACUUM INTO 读的是逻辑内容，WAL 里已提交的也一起落盘）
scp 成语学习/scripts/backup-db.js ubuntu@139.199.231.204:/tmp/
ssh ubuntu@139.199.231.204 'node --experimental-sqlite /tmp/backup-db.js 20261026-2030'
```

快照写到 `data/backup/pre-deploy-<tag>.db`，同时打印十张表的行数。**部署完再用 `--check` 打一次当前库的行数，和快照那组数字一致才算过**——基准是本次快照打出来的数字，不是写死的常量：

```bash
ssh ubuntu@139.199.231.204 'node --experimental-sqlite /tmp/backup-db.js --check'
```

别直接 `cp app.db`——WAL 常态几百 KB，拷出来会少数据。回滚：`sudo systemctl stop hello-boy`，把快照拷回 `data/app.db` 并删掉同目录的 `-wal`/`-shm`，再启动。

服务器原有 `delivery-assistant`（Java，8321，nginx `/govern-copilot/`）已按要求停用并取消开机自启，文件仍在 `/opt/delivery-assistant` 与 `/etc/systemd/system/delivery-assistant.service`；如需恢复：`sudo systemctl enable --now delivery-assistant` 并把 `sites-enabled` 里的旧站恢复（两者都用 `listen 80 default_server`，不能同时启用）。

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

内容源文件：`content/groups.json` + `content/idioms/<篇章>.json`；`content/poem-groups.json` + `content/poems/<篇章>.json`；`content/chain/words.json` + `content/chain/chains.json`（首尾多音字审核记录在同目录 `stable-edges.json`）。

## 内容与版权

- 成语故事/总结/测验/插图与古诗的讲解/诗人小故事/测验/插图全部自写；古诗原文与典故属公有领域。
- 成语拼音与出处参考 [chinese-xinhua](https://github.com/pwxcoo/chinese-xinhua)（MIT）；古诗原文参考 [chinese-poetry](https://github.com/chinese-poetry/chinese-poetry)（MIT），篇目以部编教材通行版为准。
- 界面图标、头像、插图均为本项目自绘 SVG，调色板统一，不依赖外部资源、不联网。
