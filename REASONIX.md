# Reasonix project memory

Notes the user pinned via the `#` prompt prefix. The whole file is
loaded into the immutable system prefix every session — keep it terse.

- litestream.yml
# 放在 novel-workbench 仓库根目录下(和根目录的 package.json 同级)
#
# 已经按 karen9078/novel-workbench 这个项目的实际结构填好:
#   server/db.js 里 DB_PATH = path.join(__dirname, 'data', 'app.db')
#   __dirname 是 server/,所以从仓库根目录看,完整路径是 ./server/data/app.db
#
# 你仍然需要修改的只有两处:
#   1. bucket       —— 改成你自己创建的 bucket 名称
#   2. endpoint     —— 如果用 Cloudflare R2,把 <ACCOUNT_ID> 换成你的账号 ID
#                       如果用 Backblaze B2,改成 B2 提供的 endpoint(见部署指南)
#
# 下面两个环境变量需要在 Render 的 Environment 页面里配置(不要写死在文件里):
#   R2_ACCESS_KEY_ID
#   R2_SECRET_ACCESS_KEY

dbs:
  - path: ./server/data/app.db   # 已对应 novel-workbench 项目的真实路径,不用改
    replicas:
      - type: s3
        bucket: your-bucket-name # <-- 改成你的 bucket 名
        path: db                 # 远端存储里的子目录,不需要改
        region: auto             # R2 固定写 auto;B2 用 us-west-002 之类的实际 region
        endpoint: https://<ACCOUNT_ID>.r2.cloudflarestorage.com  # <-- 改成你的 endpoint
        access-key-id: ${R2_ACCESS_KEY_ID}
        secret-access-key: ${R2_SECRET_ACCESS_KEY}

        # 下面是可选的同步频率调优,默认值通常够用,先不用改:
        # sync-interval: 1s
- litestream.yml
# 放在 novel-workbench 仓库根目录下(和根目录的 package.json 同级)
#
# 已经按 karen9078/novel-workbench 这个项目的实际结构填好:
#   server/db.js 里 DB_PATH = path.join(__dirname, 'data', 'app.db')
#   __dirname 是 server/,所以从仓库根目录看,完整路径是 ./server/data/app.db
#
# 你仍然需要修改的只有两处:
#   1. bucket       —— 改成你自己创建的 bucket 名称
#   2. endpoint     —— 如果用 Cloudflare R2,把 <ACCOUNT_ID> 换成你的账号 ID
#                       如果用 Backblaze B2,改成 B2 提供的 endpoint(见部署指南)
#
# 下面两个环境变量需要在 Render 的 Environment 页面里配置(不要写死在文件里):
#   R2_ACCESS_KEY_ID
#   R2_SECRET_ACCESS_KEY

dbs:
  - path: ./server/data/app.db   # 已对应 novel-workbench 项目的真实路径,不用改
    replicas:
      - type: s3
        bucket: your-bucket-name # <-- 改成你的 bucket 名
        path: db                 # 远端存储里的子目录,不需要改
        region: auto             # R2 固定写 auto;B2 用 us-west-002 之类的实际 region
        endpoint: https://<ACCOUNT_ID>.r2.cloudflarestorage.com  # <-- 改成你的 endpoint
        access-key-id: ${R2_ACCESS_KEY_ID}
        secret-access-key: ${R2_SECRET_ACCESS_KEY}

        # 下面是可选的同步频率调优,默认值通常够用,先不用改:
        # sync-interval: 1s
