#!/bin/bash

# ================= 配置区 =================
API_URL="https://misty-limit-dae8.vtern.workers.dev/report"
SERVER_ID="vps-05"   # 唯一标识符
TRAFFIC_LIMIT=200   # 流量上限(GB)
# ==========================================

while true; do
    HOSTNAME=$(hostname)
    OS=$(grep '^PRETTY_NAME=' /etc/os-release | cut -d'"' -f2 | tr -d ' ')
    [ -z "$OS" ] && OS="Linux"

    # --- 1. 兼容性 CPU 计算 ---
    # 抓取空闲百分比，如果抓不到则默认为 100(即 CPU 0%)
    IDLE=$(top -bn1 | grep -i "cpu" | head -n1 | awk '{for(i=1;i<=NF;i++) if($i~/[0-9.]+/ && $(i+1)~/(id|空闲)/) print $i}')
    CPU=$(awk "BEGIN {print 100 - (${IDLE:-100})}")

    # --- 2. 兼容性内存计算 ---
    MEM_TOTAL_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    MEM_AVAIL_KB=$(grep -E 'MemAvailable|MemFree' /proc/meminfo | head -n1 | awk '{print $2}')
    MEM_TOTAL=$(awk "BEGIN {printf \"%.1f\", $MEM_TOTAL_KB / 1024 / 1024}")
    MEM_USED_PERC=$(awk "BEGIN {printf \"%.1f\", ($MEM_TOTAL_KB - ${MEM_AVAIL_KB:-0}) / $MEM_TOTAL_KB * 100}")

    # --- 3. 磁盘占用 ---
    DISK_PERC=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')

    # --- 4. 强力识别网卡 ---
    # 依次尝试：默认路由网卡 -> 状态为 UP 的第一个网卡 -> 暴力指定 eth0
    IFACE=$(ip route get 8.8.8.8 2>/dev/null | grep -oP '(?<=dev )[^ ]+' || ip link | grep 'state UP' | awk -F': ' '{print $2}' | head -n1)
    IFACE=${IFACE:-eth0}

    RX=$(cat /sys/class/net/$IFACE/statistics/rx_bytes 2>/dev/null || echo 0)
    TX=$(cat /sys/class/net/$IFACE/statistics/tx_bytes 2>/dev/null || echo 0)
    USED_GB=$(awk "BEGIN {printf \"%.2f\", ($RX + $TX) / 1024 / 1024 / 1024}")

    # --- 5. 安全发送 JSON (关键：数值位加上 :0 保证不为空) ---
    curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{
        \"id\": \"$SERVER_ID\",
        \"hostname\": \"$HOSTNAME\",
        \"os\": \"$OS\",
        \"cpu\": ${CPU:-0},
        \"mem\": ${MEM_USED_PERC:-0},
        \"mem_total\": ${MEM_TOTAL:-0},
        \"disk\": ${DISK_PERC:-0},
        \"t_used\": ${USED_GB:-0},
        \"t_limit\": ${TRAFFIC_LIMIT:-200}
      }"

    echo "Report Sent: $(date '+%H:%M:%S') | CPU: ${CPU:-0}% | IFACE: $IFACE"
    sleep 30
done
