// 渲染图表组件的辅助函数
function renderChartUI(sid, cid, label, val, color, subtext) {
  return `
    <div class="text-center">
      <div class="relative w-24 h-24 mx-auto">
        <canvas id="c-${sid}-${cid}"></canvas>
        <div class="absolute inset-0 flex items-center justify-center font-bold text-sm" style="color:${color}">${Number(val).toFixed(1)}%</div>
      </div>
      <div class="mt-2 text-xs text-white/80 font-medium">${label}</div>
      <div class="text-[10px] font-mono text-slate-500 mt-1">${subtext}</div>
    </div>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- 路由 1: 接收 VPS 数据上报 ---
    if (request.method === "POST" && url.pathname === "/report") {
      try {
        const data = await request.json();
        const now = Math.floor(Date.now() / 1000);
        
        // 获取 Cloudflare 提供的访客信息
        const vpsIP = request.headers.get("cf-connecting-ip") || "0.0.0.0";
        const country = request.cf ? request.cf.country : "UN";

        // 将元数据(IP, 国家, 内存总量) 存入 os 字段以规避修改数据库结构
        const metaOS = `[${country}|${vpsIP}|${data.mem_total || 0}] ${data.os || 'Unknown OS'}`;

        await env.DB.prepare(`
          INSERT INTO vps_stats (id, hostname, os, cpu_usage, mem_usage, disk_usage, traffic_used, traffic_limit, last_updated)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            hostname=excluded.hostname,
            os=excluded.os,
            cpu_usage=excluded.cpu_usage,
            mem_usage=excluded.mem_usage,
            disk_usage=excluded.disk_usage,
            traffic_used=excluded.traffic_used,
            traffic_limit=excluded.traffic_limit,
            last_updated=excluded.last_updated
        `).bind(
          data.id, data.hostname, metaOS, data.cpu, data.mem, data.disk, data.t_used, data.t_limit, now
        ).run();

        return new Response("Success", { status: 200 });
      } catch (err) {
        return new Response(err.message, { status: 500 });
      }
    }

    // --- 路由 2: 监控面板展示 ---
    if (url.pathname === "/") {
      try {
        const { results } = await env.DB.prepare("SELECT * FROM vps_stats").all();
        
        const html = `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>VPS 实时监控面板</title>
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/6.6.6/css/flag-icons.min.css">
          <style>
            body { background: #0b0f1a; color: #cbd5e1; }
            .glass { background: rgba(23, 32, 53, 0.8); border: 1px solid rgba(255,255,255,0.05); backdrop-filter: blur(8px); }
          </style>
        </head>
        <body class="p-4 md:p-8">
          <div class="max-w-7xl mx-auto">
            <header class="flex justify-between items-center mb-10">
              <h1 class="text-2xl font-bold text-white tracking-tight">Edge Sentinel <span class="text-blue-500">Nodes</span></h1>
              <div class="text-xs text-slate-500">数据每 30 秒自动刷新</div>
            </header>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              ${results.map(s => {
                const isOffline = (Math.floor(Date.now()/1000) - s.last_updated) > 60;
                
                // 解析存储在 OS 字段中的元数据
                let country = "un", ip = "0.0.0.0", memTotal = "0", osName = s.os;
                const match = s.os.match(/^\\[(.*?)\\|(.*?)\\|(.*?)\\]\\s(.*)/);
                if (match) {
                  country = match[1].toLowerCase();
                  ip = match[2];
                  memTotal = match[3];
                  osName = match[4];
                }

                const memUsed = (parseFloat(memTotal) * s.mem_usage / 100).toFixed(1);
                const trafficLimit = s.traffic_limit || 1000;
                const trafficPercent = (s.traffic_used / trafficLimit * 100);

                return `
                <div class="glass rounded-3xl p-6 shadow-2xl transition-all hover:border-blue-500/30">
                  <div class="flex justify-between items-start mb-8">
                    <div>
                      <div class="flex items-center gap-2 mb-1">
                        <span class="fi fi-${country} shadow-sm rounded-sm"></span>
                        <h2 class="text-xl font-bold text-white">${s.hostname}</h2>
                      </div>
                      <div class="flex flex-wrap gap-2 text-[10px]">
                        <span class="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-mono">${ip}</span>
                        <span class="bg-slate-700 text-slate-300 px-2 py-0.5 rounded">${osName}</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 ${isOffline ? 'text-red-500' : 'text-emerald-500'}">
                      <span class="w-2 h-2 rounded-full bg-current shadow-[0_0_8px_current]"></span>
                      <span class="text-[10px] font-black uppercase">${isOffline ? 'Offline' : 'Online'}</span>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    ${renderChartUI(s.id, 'cpu', 'CPU', s.cpu_usage, '#f87171', '实时占用')}
                    ${renderChartUI(s.id, 'mem', '内存', s.mem_usage, '#60a5fa', memUsed + ' / ' + memTotal + 'GB')}
                    ${renderChartUI(s.id, 'disk', '磁盘', s.disk_usage, '#fbbf24', '磁盘已用')}
                    ${renderChartUI(s.id, 'traffic', '流量', trafficPercent, '#34d399', s.traffic_used.toFixed(1) + ' / ' + trafficLimit + 'GB')}
                  </div>
                </div>`;
              }).join('')}
            </div>
          </div>

          <script>
            const serverData = ${JSON.stringify(results)};
            window.onload = () => {
              serverData.forEach(s => {
                const charts = [
                  { id: 'cpu', val: s.cpu_usage, col: '#f87171' },
                  { id: 'mem', val: s.mem_usage, col: '#60a5fa' },
                  { id: 'disk', val: s.disk_usage, col: '#fbbf24' },
                  { id: 'traffic', val: (s.traffic_used / (s.traffic_limit || 1000) * 100), col: '#34d399' }
                ];
                charts.forEach(c => {
                  const ctx = document.getElementById('c-' + s.id + '-' + c.id);
                  if(!ctx) return;
                  new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                      datasets: [{
                        data: [c.val, Math.max(0, 100 - c.val)],
                        backgroundColor: [c.col, '#1e293b'],
                        borderWidth: 0,
                        borderRadius: 10
                      }]
                    },
                    options: { 
                      cutout: '80%', 
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: { tooltip: { enabled: false } },
                      animation: { duration: 1000 }
                    }
                  });
                });
              });
              setTimeout(() => location.reload(), 30000);
            };
          </script>
        </body>
        </html>`;
        return new Response(html, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
      } catch (e) {
        return new Response("Data Error: " + e.message, { status: 500 });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};
