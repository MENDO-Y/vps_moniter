# vps_moniter

D1 绑定名称：前往 Worker 设置 -> 变量 -> D1 数据库绑定。变量名称必须填 DB。

兼容性标志：确保 Worker 的兼容性日期是最近的（建议 2024 年以后）。

运行脚本：在 VPS 上给脚本权限并后台运行：

Bash
chmod +x monitor.sh
nohup ./monitor.sh > monitor.log 2>&1 &
国旗库：我在代码中引入了 flag-icon-css，它是基于 Cloudflare 识别的国家代码自动显示的。如果有的 VPS 没识别出来，会默认显示一个灰色旗帜。



# 1. 下载文件
curl -L -o monitor.sh https://raw.githubusercontent.com/MENDO-Y/vps_moniter/main/monitor.sh

# 2. 赋予执行权限
chmod +x monitor.sh

# 3. 后台运行//先不要用 nohup，直接在控制台运行 bash monitor.sh
nohup ./monitor.sh > monitor.log 2>&1 &

