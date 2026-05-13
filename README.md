# vps_moniter

D1 绑定名称：前往 Worker 设置 -> 变量 -> D1 数据库绑定。变量名称必须填 DB。

兼容性标志：确保 Worker 的兼容性日期是最近的（建议 2024 年以后）。

运行脚本：在 VPS 上给脚本权限并后台运行：


# 1. 下载文件
curl -L -o monitor.sh https://raw.githubusercontent.com/MENDO-Y/vps_moniter/main/monitor.sh

# 2. 赋予执行权限
chmod +x monitor.sh

# 3. 后台运行//先不要用 nohup，直接在控制台运行 bash monitor.sh
nohup ./monitor.sh > monitor.log 2>&1 &




### 快速开始

可以通过以下按钮快速获取安装脚本：

[![安装脚本](https://img.shields.io/badge/一键复制-安装命令-blue?style=for-the-badge&logo=target)](你的RAW脚本链接)
