// ═══════════════════════════════════════════════════════════════════════════════
// SCALE.js - Historie váhy a BMI
// ═══════════════════════════════════════════════════════════════════════════════

import { contentDiv } from './core.js';
import { fetchWithAuth } from './auth.js';
import { formatDateStr } from './helpers.js';

export async function loadCustomTable() {
    const r = await fetchWithAuth("/api/scale/history");

    if (!r.ok) {
        contentDiv.innerHTML = `
            <h2 class="mb-4">Historie vážení</h2>
            <div class="alert alert-danger">
                Nepodařilo se načíst data z váhy.
            </div>`;
        return;
    }

    const data = await r.json();
    const currentHeight = localStorage.getItem("userHeight_cm") || 175;

    let html = `
    <div class="d-flex justify-content-between align-items-center mb-4">
        <h2><i class="bi bi-speedometer me-2 text-secondary"></i>Historie vážení</h2>
        <div class="d-flex align-items-center gap-2">
            <label class="text-muted text-nowrap">Vaše výška (cm):</label>
            <input type="number" id="heightInput" class="form-control form-control-sm" value="${currentHeight}" style="width: 80px;" onchange="updateHeight()">
        </div>
    </div>
    
    <div class="row mb-4">
        <div class="col-md-8">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-header bg-white">
                    <h5 class="mb-0 text-primary"><i class="bi bi-graph-up me-2"></i>Vývoj váhy</h5>
                </div>
                <div class="card-body">
                    <canvas id="weightChart" style="max-height: 300px; width: 100%;"></canvas>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card shadow-sm border-0 h-100">
                <div class="card-header bg-white text-center">
                    <h5 class="mb-0 text-info"><i class="bi bi-activity me-2"></i>Aktuální BMI</h5>
                </div>
                <div class="card-body d-flex flex-column align-items-center justify-content-center">
                    <div style="position: relative; width: 100%; max-width: 250px;">
                        <canvas id="bmiChart"></canvas>
                        <div id="bmiText" class="position-absolute w-100 text-center" style="top: 60%; left: 0; transform: translateY(-50%);">
                            <h3 class="mb-0 fw-bold" id="bmiValue">--</h3>
                            <small class="text-muted fw-bold" id="bmiLabel">Neznámé</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="card shadow-sm border-0">
        <div class="card-body p-0">
            <table class="table table-striped align-middle mb-0">
                <thead class="table-dark">
                    <tr>
                        <th class="ps-4">ID</th>
                        <th>Datum a čas</th>
                        <th>Trend (Změna)</th>
                        <th class="pe-4">Naměřená váha</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (!data || data.length === 0) {
        html += `<tr><td colspan="4" class="text-center py-4 text-muted">Zatím se nikdo nevážil.</td></tr>`;
    } else {
        data.forEach((item, index) => {
            let trendHtml = `<span class="text-muted">—</span>`;
            
            if (index < data.length - 1) {
                const prevItem = data[index + 1];
                const diff = parseFloat(item.weight) - parseFloat(prevItem.weight);
                
                if (diff > 0) {
                    trendHtml = `<span class="text-danger fw-bold"><i class="bi bi-arrow-up-right me-1"></i>+${diff.toFixed(1)} kg</span>`;
                } else if (diff < 0) {
                    trendHtml = `<span class="text-success fw-bold"><i class="bi bi-arrow-down-right me-1"></i>${diff.toFixed(1)} kg</span>`;
                } else {
                    trendHtml = `<span class="text-muted fw-bold"><i class="bi bi-dash me-1"></i>0.0 kg</span>`;
                }
            }

            html += `<tr>
                <td class="ps-4">${item.id || "-"}</td>
                <td>${formatDateStr(item.timestamp)}</td>
                <td>${trendHtml}</td>
                <td class="pe-4"><span class="badge bg-primary fs-6">${item.weight} kg</span></td>
            </tr>`;
        });
    }

    html += `
                </tbody>
            </table>
        </div>
    </div>`;

    contentDiv.innerHTML = html;

    // Vykreslení grafů
    if (data && data.length > 0) {
        const reversedData = [...data].reverse();
        const labels = reversedData.map(item => formatDateStr(item.timestamp));
        const weights = reversedData.map(item => parseFloat(item.weight));

        const ctx = document.getElementById('weightChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Naměřená váha (kg)',
                    data: weights,
                    borderColor: 'rgba(13, 110, 253, 1)',
                    backgroundColor: 'rgba(13, 110, 253, 0.2)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(13, 110, 253, 1)',
                    pointRadius: 4,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        title: { display: true, text: 'Váha (kg)' }
                    },
                    x: {
                        ticks: {
                            maxTicksLimit: 10
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y + ' kg';
                            }
                        }
                    }
                }
            }
        });

        // Výpočet BMI z nejnovější váhy
        const latestWeight = parseFloat(data[0].weight);
        const heightM = parseFloat(document.getElementById("heightInput").value) / 100;
        
        if (heightM > 0) {
            const bmi = latestWeight / (heightM * heightM);
            let bmiStatus = "";
            let pointerColor = "";
            
            if (bmi < 18.5) { bmiStatus = "Podváha"; pointerColor = "#0dcaf0"; }
            else if (bmi < 25) { bmiStatus = "Normální"; pointerColor = "#198754"; }
            else if (bmi < 30) { bmiStatus = "Nadváha"; pointerColor = "#ffc107"; }
            else { bmiStatus = "Obezita"; pointerColor = "#dc3545"; }

            document.getElementById("bmiValue").textContent = bmi.toFixed(1);
            document.getElementById("bmiLabel").textContent = bmiStatus;
            document.getElementById("bmiLabel").style.color = pointerColor;

            const minBmi = 15;
            const maxBmi = 40;
            let normalizedBmi = Math.max(minBmi, Math.min(bmi, maxBmi));
            let bmiValuePercent = (normalizedBmi - minBmi) / (maxBmi - minBmi);

            const ctxBmi = document.getElementById('bmiChart').getContext('2d');
            new Chart(ctxBmi, {
                type: 'doughnut',
                data: {
                    labels: ['Podváha', 'Normální', 'Nadváha', 'Obezita'],
                    datasets: [{
                        data: [18.5 - 15, 25 - 18.5, 30 - 25, 40 - 30],
                        backgroundColor: ['#0dcaf0', '#198754', '#ffc107', '#dc3545'],
                        borderWidth: 0,
                        cutout: '75%'
                    }]
                },
                options: {
                    rotation: -90,
                    circumference: 180,
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    },
                    animation: {
                        onComplete: function(animation) {
                            const chart = animation.chart;
                            const ctx = chart.ctx;
                            const chartArea = chart.chartArea;
                            
                            const centerX = (chartArea.left + chartArea.right) / 2;
                            const centerY = chartArea.bottom;
                            
                            const angle = Math.PI - (bmiValuePercent * Math.PI);

                            const innerRadius = chart.innerRadius;
                            const outerRadius = chart.outerRadius;
                            const pointerLength = outerRadius - 10;
                            
                            const tipX = centerX - pointerLength * Math.cos(angle);
                            const tipY = centerY - pointerLength * Math.sin(angle);
                            
                            ctx.save();
                            ctx.beginPath();
                            ctx.moveTo(centerX, centerY);
                            ctx.lineTo(tipX, tipY);
                            ctx.lineWidth = 4;
                            ctx.strokeStyle = '#333';
                            ctx.stroke();
                            
                            ctx.beginPath();
                            ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
                            ctx.fillStyle = '#333';
                            ctx.fill();
                            ctx.restore();
                        }
                    }
                }
            });
        }
    }
}

export function updateHeight() {
    const h = document.getElementById("heightInput").value;
    if (h) {
        localStorage.setItem("userHeight_cm", h);
        loadCustomTable();
    }
}

