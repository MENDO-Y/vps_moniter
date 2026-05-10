#!/bin/bash
# ================= 配置区 =================
API_URL="https://worker域名地址.workers.dev/report"
SERVER_ID=${1:-$(hostname)}       # 优先使用运行脚本时的第一个参数，没有则用主机名
TRAFFIC_LIMIT=${2:-1000}          # 优先使用第二个参数，没有则默认 1000
# ==========================================

while true; do
    HOSTNAME=$(hostname)
    OS=$(grep '^PRETTY_NAME=' /etc/os-release | cut -d'"' -f2)

    # CPU 占用计算
    CPU=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')

    # 内存信息 (输出 GB)
    MEM_TOTAL=$(free -g | awk '/Mem:/ {print $2}')
    MEM_USED_PERC=$(free | awk '/Mem:/ {print $3/$2 * 100.0}')

    # 磁盘占用
    DISK_PERC=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')

    # 流量统计 (自动识别网卡)
    IFACE=$(ip route get 8.8.8.8 | grep -Po '(?<=dev )(\S+)')
    RX=$(cat /sys/class/net/$IFACE/statistics/rx_bytes)
    TX=$(cat /sys/class/net/$IFACE/statistics/tx_bytes)
    USED_GB=$(awk "BEGIN {print ($RX + $TX) / 1024 / 1024 / 1024}")

    # 发送 JSON 数据包
    curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{
        \"id\": \"$SERVER_ID\",
        \"hostname\": \"$HOSTNAME\",
        \"os\": \"$OS\",
        \"cpu\": $CPU,
        \"mem\": $MEM_USED_PERC,
        \"mem_total\": $MEM_TOTAL,
        \"disk\": $DISK_PERC,
        \"t_used\": $USED_GB,
        \"t_limit\": $TRAFFIC_LIMIT
      }"

    echo "Report Sent: $(date '+%Y-%m-%d %H:%M:%S') | CPU: $CPU%"
    sleep 30
done
