# Ubuntu 服务器部署

这份项目已经包含当前修好的前后端代码，服务对外端口保持为 `3000`。

## 方式 1：直接运行 Linux 二进制

适合 Ubuntu `amd64` 服务器，不需要在服务器上重新编译前端。

```bash
chmod +x ./new-api-linux
PORT=3000 ./new-api-linux --log-dir ./logs
```

访问地址：

```bash
http://服务器IP:3000
```

## 方式 2：systemd 常驻运行

1. 把程序目录放到例如 `/opt/new-api`
2. 按实际用户名和目录修改 `new-api.service`
3. 安装并启动服务：

```bash
sudo cp new-api.service /etc/systemd/system/new-api.service
sudo systemctl daemon-reload
sudo systemctl enable --now new-api
sudo systemctl status new-api
```

## 方式 3：Docker Compose

把整个项目目录上传到服务器后，在项目根目录执行：

```bash
docker compose -f docker-compose.server.yml up -d --build
```

首次启动后访问：

```bash
http://服务器IP:3000
```

## 常用命令

查看状态：

```bash
docker compose -f docker-compose.server.yml ps
```

查看日志：

```bash
docker compose -f docker-compose.server.yml logs -f new-api
```

更新后重建：

```bash
docker compose -f docker-compose.server.yml up -d --build
```

停止：

```bash
docker compose -f docker-compose.server.yml down
```

## 数据位置

- `./data`：数据库和运行数据
- `./logs`：日志目录

## 说明

- `docker-compose.server.yml` 对外固定映射 `3000:3000`。
- 默认使用 SQLite。
- 已附带 Redis，用于限速和缓存场景。
- 如果使用精简运行包，只要替换里面的 `new-api-linux` 即可带上最新页面和后端逻辑。
