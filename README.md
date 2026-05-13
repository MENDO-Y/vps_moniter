# vps_moniter 支持IPV4/IPV6

单向通信： 你的脚本使用的是 curl -X POST。这意味着 VPS 主动把数据“推”给 Cloudflare。Cloudflare 并没有办法穿透防火墙主动连接你的 VPS。

权限限制： 脚本中没有任何代码去读取 Cloudflare 的返回结果并将其作为命令执行（即没有“后门”逻辑）。

架构设计： 这种方案的初衷是极简和安全。因为它不具备控制功能，所以即使你的 Cloudflare 账号不小心泄露了，攻击者也无法通过监控面板直接入侵你的服务器。

# CLOUDFLARE设置

D1 绑定名称：前往 Worker 设置 -> 变量 -> D1 数据库绑定。变量名称必须填 DB。

兼容性标志：确保 Worker 的兼容性日期是最近的（建议 2024 年以后）。


运行脚本：在 VPS 上给脚本权限并后台运行：


# 1. 下载文件
```Bash
curl -L -o monitor.sh https://raw.githubusercontent.com/MENDO-Y/vps_moniter/main/monitor.sh
```

# 2. 赋予执行权限
```Bash
chmod +x monitor.sh
```

# 3. 后台运行//可以先不要用 nohup，直接在控制台运行 bash monitor.sh
```Bash
bash monitor.sh
```
调试正常后，用nohup一直挂着
```Bash
nohup ./monitor.sh > monitor.log 2>&1 &
```


