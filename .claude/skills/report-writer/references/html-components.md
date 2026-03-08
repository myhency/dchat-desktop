# HTML Dynamic Components Reference

> Report Writer Skill - Phase 4 HTML 보고서 생성 시 참조용
> 모든 컴포넌트는 self-contained (인라인 스타일 포함), FHD 1920x1080 / 콘텐츠 영역 1200px 기준

---

## 1. 차트 (Chart.js)

**용도:** 정량적 데이터를 시각적으로 표현하여 트렌드, 비교, 비율을 한눈에 전달한다.

**사용 조건:** 수치 데이터가 3개 항목 이상일 때, 텍스트 표보다 시각적 비교가 효과적인 경우 삽입한다. 섹션 도입부 또는 핵심 분석 결과 직후에 배치한다.

> Chart.js CDN: `https://cdn.jsdelivr.net/npm/chart.js`

### 1-1. Bar Chart (막대 차트)

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<div style="max-width:1200px;margin:2rem auto;background:#fff;border-radius:12px;padding:2rem;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <h3 style="margin:0 0 1.5rem 0;font-family:'Pretendard',sans-serif;font-size:1.25rem;color:#1a1a2e;">항목별 비교</h3>
  <canvas id="barChart" style="width:100%;max-height:400px;"></canvas>
  <script>
    new Chart(document.getElementById('barChart'), {
      type: 'bar',
      data: {
        labels: ['항목 A', '항목 B', '항목 C', '항목 D', '항목 E'],
        datasets: [{
          label: '2025년 실적',
          data: [120, 190, 80, 150, 210],
          backgroundColor: [
            'rgba(67, 97, 238, 0.85)',
            'rgba(76, 201, 240, 0.85)',
            'rgba(247, 127, 0, 0.85)',
            'rgba(114, 9, 183, 0.85)',
            'rgba(0, 180, 130, 0.85)'
          ],
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: true, position: 'top', labels: { font: { size: 13 } } }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
          x: { grid: { display: false } }
        }
      }
    });
  </script>
</div>
```

### 1-2. Line Chart (선 차트)

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<div style="max-width:1200px;margin:2rem auto;background:#fff;border-radius:12px;padding:2rem;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <h3 style="margin:0 0 1.5rem 0;font-family:'Pretendard',sans-serif;font-size:1.25rem;color:#1a1a2e;">월별 추이</h3>
  <canvas id="lineChart" style="width:100%;max-height:400px;"></canvas>
  <script>
    new Chart(document.getElementById('lineChart'), {
      type: 'line',
      data: {
        labels: ['1월', '2월', '3월', '4월', '5월', '6월'],
        datasets: [
          {
            label: '매출',
            data: [300, 450, 420, 510, 580, 620],
            borderColor: 'rgba(67, 97, 238, 1)',
            backgroundColor: 'rgba(67, 97, 238, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 8,
            borderWidth: 2.5
          },
          {
            label: '비용',
            data: [200, 280, 310, 290, 350, 380],
            borderColor: 'rgba(247, 127, 0, 1)',
            backgroundColor: 'rgba(247, 127, 0, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 8,
            borderWidth: 2.5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: true, position: 'top', labels: { font: { size: 13 } } },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
          x: { grid: { display: false } }
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false }
      }
    });
  </script>
</div>
```

### 1-3. Pie Chart (원형 차트)

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<div style="max-width:600px;margin:2rem auto;background:#fff;border-radius:12px;padding:2rem;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <h3 style="margin:0 0 1.5rem 0;font-family:'Pretendard',sans-serif;font-size:1.25rem;color:#1a1a2e;text-align:center;">비율 분포</h3>
  <canvas id="pieChart" style="width:100%;max-height:400px;"></canvas>
  <script>
    new Chart(document.getElementById('pieChart'), {
      type: 'pie',
      data: {
        labels: ['제품 A', '제품 B', '제품 C', '제품 D'],
        datasets: [{
          data: [35, 28, 22, 15],
          backgroundColor: [
            'rgba(67, 97, 238, 0.85)',
            'rgba(76, 201, 240, 0.85)',
            'rgba(247, 127, 0, 0.85)',
            'rgba(114, 9, 183, 0.85)'
          ],
          borderColor: '#fff',
          borderWidth: 3,
          hoverOffset: 12
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { font: { size: 13 }, padding: 20, usePointStyle: true }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.label + ': ' + context.parsed + '%';
              }
            }
          }
        }
      }
    });
  </script>
</div>
```

### 1-4. Donut Chart (도넛 차트)

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<div style="max-width:600px;margin:2rem auto;background:#fff;border-radius:12px;padding:2rem;box-shadow:0 2px 12px rgba(0,0,0,0.08);position:relative;">
  <h3 style="margin:0 0 1.5rem 0;font-family:'Pretendard',sans-serif;font-size:1.25rem;color:#1a1a2e;text-align:center;">달성률</h3>
  <canvas id="donutChart" style="width:100%;max-height:400px;"></canvas>
  <script>
    const donutCtx = document.getElementById('donutChart');
    new Chart(donutCtx, {
      type: 'doughnut',
      data: {
        labels: ['완료', '진행중', '미착수', '지연'],
        datasets: [{
          data: [45, 25, 18, 12],
          backgroundColor: [
            'rgba(0, 180, 130, 0.85)',
            'rgba(67, 97, 238, 0.85)',
            'rgba(200, 200, 210, 0.85)',
            'rgba(239, 71, 111, 0.85)'
          ],
          borderColor: '#fff',
          borderWidth: 3,
          hoverOffset: 12
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '60%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { font: { size: 13 }, padding: 20, usePointStyle: true }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.label + ': ' + context.parsed + '%';
              }
            }
          }
        }
      }
    });
  </script>
</div>
```

---

## 2. 토글/아코디언

**용도:** 긴 콘텐츠를 접고 펼칠 수 있게 하여 보고서의 가독성을 높이고 상세 정보를 선택적으로 노출한다.

**사용 조건:** 부연 설명, 방법론 상세, FAQ, 부록 등 보조 정보를 메인 흐름과 분리할 때 삽입한다. 3개 이상의 접이식 항목이 있을 때 효과적이다.

```html
<div style="max-width:1200px;margin:2rem auto;font-family:'Pretendard',sans-serif;">

  <!-- 아코디언 아이템 1 -->
  <div style="margin-bottom:0.5rem;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
    <button onclick="toggleAccordion(this)" style="width:100%;padding:1.1rem 1.5rem;background:#fff;border:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-size:1rem;font-weight:600;color:#1a1a2e;text-align:left;transition:background 0.2s;">
      <span>분석 방법론</span>
      <span style="font-size:1.3rem;transition:transform 0.3s;display:inline-block;">&#9662;</span>
    </button>
    <div style="max-height:0;overflow:hidden;transition:max-height 0.35s ease, padding 0.35s ease;padding:0 1.5rem;background:#fafbfc;">
      <div style="padding:1rem 0;color:#4a5568;line-height:1.7;font-size:0.95rem;">
        <p>본 분석은 2025년 1월~12월 데이터를 기반으로 하였으며, 3단계 검증 프로세스를 거쳤습니다.</p>
        <ul style="margin:0.5rem 0;padding-left:1.5rem;">
          <li>1단계: 원시 데이터 수집 및 클렌징</li>
          <li>2단계: 통계적 유의성 검정 (p &lt; 0.05)</li>
          <li>3단계: 전문가 리뷰 및 교차 검증</li>
        </ul>
      </div>
    </div>
  </div>

  <!-- 아코디언 아이템 2 -->
  <div style="margin-bottom:0.5rem;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
    <button onclick="toggleAccordion(this)" style="width:100%;padding:1.1rem 1.5rem;background:#fff;border:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-size:1rem;font-weight:600;color:#1a1a2e;text-align:left;transition:background 0.2s;">
      <span>데이터 출처</span>
      <span style="font-size:1.3rem;transition:transform 0.3s;display:inline-block;">&#9662;</span>
    </button>
    <div style="max-height:0;overflow:hidden;transition:max-height 0.35s ease, padding 0.35s ease;padding:0 1.5rem;background:#fafbfc;">
      <div style="padding:1rem 0;color:#4a5568;line-height:1.7;font-size:0.95rem;">
        <p>공공데이터 포털, 내부 ERP 시스템, 외부 시장조사 보고서에서 수집한 데이터를 활용하였습니다.</p>
      </div>
    </div>
  </div>

  <!-- 아코디언 아이템 3 -->
  <div style="margin-bottom:0.5rem;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
    <button onclick="toggleAccordion(this)" style="width:100%;padding:1.1rem 1.5rem;background:#fff;border:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-size:1rem;font-weight:600;color:#1a1a2e;text-align:left;transition:background 0.2s;">
      <span>용어 정의</span>
      <span style="font-size:1.3rem;transition:transform 0.3s;display:inline-block;">&#9662;</span>
    </button>
    <div style="max-height:0;overflow:hidden;transition:max-height 0.35s ease, padding 0.35s ease;padding:0 1.5rem;background:#fafbfc;">
      <div style="padding:1rem 0;color:#4a5568;line-height:1.7;font-size:0.95rem;">
        <p><strong>KPI:</strong> 핵심 성과 지표 (Key Performance Indicator)</p>
        <p><strong>YoY:</strong> 전년 대비 증감률 (Year over Year)</p>
        <p><strong>CAGR:</strong> 연평균 성장률 (Compound Annual Growth Rate)</p>
      </div>
    </div>
  </div>

  <script>
    function toggleAccordion(button) {
      const content = button.nextElementSibling;
      const arrow = button.querySelector('span:last-child');
      const isOpen = content.style.maxHeight && content.style.maxHeight !== '0px';

      // 모든 아코디언 닫기 (단일 열기 모드)
      document.querySelectorAll('[onclick="toggleAccordion(this)"]').forEach(function(btn) {
        const c = btn.nextElementSibling;
        const a = btn.querySelector('span:last-child');
        c.style.maxHeight = '0px';
        c.style.padding = '0 1.5rem';
        a.style.transform = 'rotate(0deg)';
      });

      if (!isOpen) {
        content.style.maxHeight = content.scrollHeight + 32 + 'px';
        content.style.padding = '0 1.5rem';
        arrow.style.transform = 'rotate(180deg)';
      }
    }
  </script>
</div>
```

---

## 3. 탭 인터페이스

**용도:** 동일 공간에서 여러 카테고리의 콘텐츠를 전환하며 볼 수 있게 하여 비교 분석 및 시나리오별 보기를 제공한다.

**사용 조건:** 2~5개의 병렬적 데이터셋 비교, 시나리오별 결과 보기, 기간별 데이터 전환이 필요할 때 삽입한다. 콘텐츠 간 구조가 유사할 때 가장 효과적이다.

```html
<div style="max-width:1200px;margin:2rem auto;font-family:'Pretendard',sans-serif;">
  <!-- 탭 버튼 영역 -->
  <div style="display:flex;gap:0;border-bottom:2px solid #e2e8f0;">
    <button onclick="switchTab(event, 'tab1')" class="tab-btn active-tab" style="padding:0.85rem 1.8rem;border:none;background:transparent;cursor:pointer;font-size:0.95rem;font-weight:600;color:#4361ee;border-bottom:3px solid #4361ee;margin-bottom:-2px;transition:all 0.2s;">시나리오 A</button>
    <button onclick="switchTab(event, 'tab2')" class="tab-btn" style="padding:0.85rem 1.8rem;border:none;background:transparent;cursor:pointer;font-size:0.95rem;font-weight:600;color:#94a3b8;border-bottom:3px solid transparent;margin-bottom:-2px;transition:all 0.2s;">시나리오 B</button>
    <button onclick="switchTab(event, 'tab3')" class="tab-btn" style="padding:0.85rem 1.8rem;border:none;background:transparent;cursor:pointer;font-size:0.95rem;font-weight:600;color:#94a3b8;border-bottom:3px solid transparent;margin-bottom:-2px;transition:all 0.2s;">시나리오 C</button>
  </div>

  <!-- 탭 콘텐츠 영역 -->
  <div id="tab1" class="tab-content" style="display:block;padding:2rem;background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
    <h4 style="margin:0 0 1rem 0;color:#1a1a2e;font-size:1.1rem;">시나리오 A: 보수적 전망</h4>
    <p style="color:#4a5568;line-height:1.7;margin:0;">연간 성장률 3~5%를 가정한 보수적 시나리오입니다. 시장 불확실성이 높은 상황에서의 예측치를 반영합니다.</p>
    <div style="margin-top:1.2rem;display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">
      <div style="background:#f0f4ff;padding:1.2rem;border-radius:8px;text-align:center;">
        <div style="font-size:1.6rem;font-weight:700;color:#4361ee;">+3.2%</div>
        <div style="font-size:0.85rem;color:#64748b;margin-top:0.3rem;">예상 성장률</div>
      </div>
      <div style="background:#f0fdf4;padding:1.2rem;border-radius:8px;text-align:center;">
        <div style="font-size:1.6rem;font-weight:700;color:#00b482;">85억</div>
        <div style="font-size:0.85rem;color:#64748b;margin-top:0.3rem;">예상 매출</div>
      </div>
      <div style="background:#fef3c7;padding:1.2rem;border-radius:8px;text-align:center;">
        <div style="font-size:1.6rem;font-weight:700;color:#d97706;">12.5%</div>
        <div style="font-size:0.85rem;color:#64748b;margin-top:0.3rem;">영업이익률</div>
      </div>
    </div>
  </div>

  <div id="tab2" class="tab-content" style="display:none;padding:2rem;background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
    <h4 style="margin:0 0 1rem 0;color:#1a1a2e;font-size:1.1rem;">시나리오 B: 기본 전망</h4>
    <p style="color:#4a5568;line-height:1.7;margin:0;">연간 성장률 7~10%를 가정한 기본 시나리오입니다. 현재 추세가 유지되는 상황을 반영합니다.</p>
    <div style="margin-top:1.2rem;display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">
      <div style="background:#f0f4ff;padding:1.2rem;border-radius:8px;text-align:center;">
        <div style="font-size:1.6rem;font-weight:700;color:#4361ee;">+8.1%</div>
        <div style="font-size:0.85rem;color:#64748b;margin-top:0.3rem;">예상 성장률</div>
      </div>
      <div style="background:#f0fdf4;padding:1.2rem;border-radius:8px;text-align:center;">
        <div style="font-size:1.6rem;font-weight:700;color:#00b482;">112억</div>
        <div style="font-size:0.85rem;color:#64748b;margin-top:0.3rem;">예상 매출</div>
      </div>
      <div style="background:#fef3c7;padding:1.2rem;border-radius:8px;text-align:center;">
        <div style="font-size:1.6rem;font-weight:700;color:#d97706;">15.8%</div>
        <div style="font-size:0.85rem;color:#64748b;margin-top:0.3rem;">영업이익률</div>
      </div>
    </div>
  </div>

  <div id="tab3" class="tab-content" style="display:none;padding:2rem;background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
    <h4 style="margin:0 0 1rem 0;color:#1a1a2e;font-size:1.1rem;">시나리오 C: 낙관적 전망</h4>
    <p style="color:#4a5568;line-height:1.7;margin:0;">연간 성장률 15% 이상을 가정한 낙관적 시나리오입니다. 시장 확대 및 신규 사업 진출 효과를 반영합니다.</p>
    <div style="margin-top:1.2rem;display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">
      <div style="background:#f0f4ff;padding:1.2rem;border-radius:8px;text-align:center;">
        <div style="font-size:1.6rem;font-weight:700;color:#4361ee;">+16.4%</div>
        <div style="font-size:0.85rem;color:#64748b;margin-top:0.3rem;">예상 성장률</div>
      </div>
      <div style="background:#f0fdf4;padding:1.2rem;border-radius:8px;text-align:center;">
        <div style="font-size:1.6rem;font-weight:700;color:#00b482;">148억</div>
        <div style="font-size:0.85rem;color:#64748b;margin-top:0.3rem;">예상 매출</div>
      </div>
      <div style="background:#fef3c7;padding:1.2rem;border-radius:8px;text-align:center;">
        <div style="font-size:1.6rem;font-weight:700;color:#d97706;">19.2%</div>
        <div style="font-size:0.85rem;color:#64748b;margin-top:0.3rem;">영업이익률</div>
      </div>
    </div>
  </div>

  <script>
    function switchTab(event, tabId) {
      // 모든 탭 콘텐츠 숨기기
      document.querySelectorAll('.tab-content').forEach(function(el) {
        el.style.display = 'none';
      });
      // 모든 탭 버튼 비활성화
      document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.style.color = '#94a3b8';
        btn.style.borderBottom = '3px solid transparent';
      });
      // 선택된 탭 활성화
      document.getElementById(tabId).style.display = 'block';
      event.currentTarget.style.color = '#4361ee';
      event.currentTarget.style.borderBottom = '3px solid #4361ee';
    }
  </script>
</div>
```

---

## 4. 프로그레스 바

**용도:** 목표 대비 달성률, 프로젝트 진행 상황, 지표 도달 비율을 직관적인 막대 형태로 표시한다.

**사용 조건:** KPI 달성률, 프로젝트 마일스톤 진행률, 예산 소진율 등 백분율 데이터가 있을 때 삽입한다. 여러 항목의 진행률을 한 번에 비교할 때 효과적이다.

```html
<div style="max-width:1200px;margin:2rem auto;font-family:'Pretendard',sans-serif;background:#fff;border-radius:12px;padding:2rem;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <h3 style="margin:0 0 1.8rem 0;font-size:1.25rem;color:#1a1a2e;">프로젝트 진행 현황</h3>

  <!-- 프로그레스 아이템 1 -->
  <div style="margin-bottom:1.5rem;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
      <span style="font-size:0.95rem;font-weight:600;color:#1a1a2e;">매출 목표 달성률</span>
      <span style="font-size:0.95rem;font-weight:700;color:#4361ee;">78%</span>
    </div>
    <div style="width:100%;height:12px;background:#e8ecf4;border-radius:6px;overflow:hidden;">
      <div class="progress-fill" data-width="78" style="width:0%;height:100%;background:linear-gradient(90deg,#4361ee,#4cc9f0);border-radius:6px;transition:width 1.5s ease-out;"></div>
    </div>
  </div>

  <!-- 프로그레스 아이템 2 -->
  <div style="margin-bottom:1.5rem;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
      <span style="font-size:0.95rem;font-weight:600;color:#1a1a2e;">고객 만족도</span>
      <span style="font-size:0.95rem;font-weight:700;color:#00b482;">92%</span>
    </div>
    <div style="width:100%;height:12px;background:#e8ecf4;border-radius:6px;overflow:hidden;">
      <div class="progress-fill" data-width="92" style="width:0%;height:100%;background:linear-gradient(90deg,#00b482,#38d9a9);border-radius:6px;transition:width 1.5s ease-out;"></div>
    </div>
  </div>

  <!-- 프로그레스 아이템 3 -->
  <div style="margin-bottom:1.5rem;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
      <span style="font-size:0.95rem;font-weight:600;color:#1a1a2e;">예산 소진율</span>
      <span style="font-size:0.95rem;font-weight:700;color:#f77f00;">65%</span>
    </div>
    <div style="width:100%;height:12px;background:#e8ecf4;border-radius:6px;overflow:hidden;">
      <div class="progress-fill" data-width="65" style="width:0%;height:100%;background:linear-gradient(90deg,#f77f00,#fbbf24);border-radius:6px;transition:width 1.5s ease-out;"></div>
    </div>
  </div>

  <!-- 프로그레스 아이템 4 (위험 구간) -->
  <div style="margin-bottom:0.5rem;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
      <span style="font-size:0.95rem;font-weight:600;color:#1a1a2e;">이슈 해결율</span>
      <span style="font-size:0.95rem;font-weight:700;color:#ef476f;">35%</span>
    </div>
    <div style="width:100%;height:12px;background:#e8ecf4;border-radius:6px;overflow:hidden;">
      <div class="progress-fill" data-width="35" style="width:0%;height:100%;background:linear-gradient(90deg,#ef476f,#ff6b9d);border-radius:6px;transition:width 1.5s ease-out;"></div>
    </div>
  </div>

  <script>
    // 페이지 로드 시 애니메이션 실행
    (function() {
      function animateProgressBars() {
        document.querySelectorAll('.progress-fill').forEach(function(bar) {
          var target = bar.getAttribute('data-width');
          setTimeout(function() {
            bar.style.width = target + '%';
          }, 200);
        });
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', animateProgressBars);
      } else {
        animateProgressBars();
      }
    })();
  </script>
</div>
```

---

## 5. 스크롤 애니메이션

**용도:** 스크롤 시 섹션별로 요소가 자연스럽게 등장하여 보고서의 읽는 경험을 향상시킨다.

**사용 조건:** 긴 보고서에서 섹션 구분을 시각적으로 강조하고 싶을 때 삽입한다. 주요 수치, 이미지, 핵심 결론 등 독자의 주목이 필요한 요소에 적용한다. 모든 요소에 남용하지 않고 핵심 요소에만 선별 적용한다.

```html
<style>
  .scroll-animate {
    opacity: 0;
    transform: translateY(40px);
    transition: opacity 0.8s ease-out, transform 0.8s ease-out;
  }
  .scroll-animate.fade-in-up {
    opacity: 0;
    transform: translateY(40px);
  }
  .scroll-animate.fade-in-left {
    opacity: 0;
    transform: translateX(-40px);
  }
  .scroll-animate.fade-in-right {
    opacity: 0;
    transform: translateX(40px);
  }
  .scroll-animate.scale-in {
    opacity: 0;
    transform: scale(0.9);
  }
  .scroll-animate.visible {
    opacity: 1 !important;
    transform: translateY(0) translateX(0) scale(1) !important;
  }
</style>

<div style="max-width:1200px;margin:2rem auto;font-family:'Pretendard',sans-serif;">

  <!-- Fade-in Up 예시 -->
  <div class="scroll-animate fade-in-up" style="background:#fff;border-radius:12px;padding:2.5rem;margin-bottom:2rem;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <h3 style="margin:0 0 1rem 0;color:#1a1a2e;font-size:1.25rem;">핵심 발견 사항</h3>
    <p style="color:#4a5568;line-height:1.7;margin:0;">이 섹션은 스크롤 시 아래에서 위로 페이드인됩니다. 주요 분석 결과나 핵심 인사이트를 강조할 때 사용합니다.</p>
  </div>

  <!-- Fade-in Left 예시 -->
  <div class="scroll-animate fade-in-left" style="background:#fff;border-radius:12px;padding:2.5rem;margin-bottom:2rem;box-shadow:0 2px 12px rgba(0,0,0,0.08);transition-delay:0.15s;">
    <h3 style="margin:0 0 1rem 0;color:#1a1a2e;font-size:1.25rem;">시장 동향</h3>
    <p style="color:#4a5568;line-height:1.7;margin:0;">이 섹션은 왼쪽에서 슬라이드인됩니다. 데이터 시각화나 통계 요약을 표시할 때 적합합니다.</p>
  </div>

  <!-- Fade-in Right 예시 -->
  <div class="scroll-animate fade-in-right" style="background:#fff;border-radius:12px;padding:2.5rem;margin-bottom:2rem;box-shadow:0 2px 12px rgba(0,0,0,0.08);transition-delay:0.3s;">
    <h3 style="margin:0 0 1rem 0;color:#1a1a2e;font-size:1.25rem;">경쟁 분석</h3>
    <p style="color:#4a5568;line-height:1.7;margin:0;">이 섹션은 오른쪽에서 슬라이드인됩니다. 비교 데이터나 벤치마크 결과 표시에 활용합니다.</p>
  </div>

  <!-- Scale-in 예시 -->
  <div class="scroll-animate scale-in" style="background:#fff;border-radius:12px;padding:2.5rem;margin-bottom:2rem;box-shadow:0 2px 12px rgba(0,0,0,0.08);transition-delay:0.15s;">
    <h3 style="margin:0 0 1rem 0;color:#1a1a2e;font-size:1.25rem;">결론 및 제언</h3>
    <p style="color:#4a5568;line-height:1.7;margin:0;">이 섹션은 스케일 애니메이션으로 등장합니다. 최종 결론이나 핵심 제안을 강조할 때 사용합니다.</p>
  </div>
</div>

<script>
  (function() {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.scroll-animate').forEach(function(el) {
      observer.observe(el);
    });
  })();
</script>
```

---

## 6. 하이라이트 카드

**용도:** 핵심 수치, KPI, 주요 인사이트를 시각적으로 돋보이게 강조하여 독자가 핵심 내용을 빠르게 파악하게 한다.

**사용 조건:** Executive Summary, 분석 결과 요약, 핵심 지표 대시보드 영역에 삽입한다. 3~6개의 핵심 수치를 한 줄에 나란히 배치할 때 가장 효과적이다.

```html
<div style="max-width:1200px;margin:2rem auto;font-family:'Pretendard',sans-serif;">

  <!-- 4열 하이라이트 카드 그리드 -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem;margin-bottom:2rem;">

    <!-- 카드 1: 상승 -->
    <div style="background:linear-gradient(135deg,#4361ee 0%,#3a56d4 100%);border-radius:12px;padding:1.8rem;color:#fff;box-shadow:0 4px 16px rgba(67,97,238,0.3);transition:transform 0.2s;cursor:default;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
      <div style="font-size:1.8rem;margin-bottom:0.6rem;">&#x1F4C8;</div>
      <div style="font-size:2.2rem;font-weight:800;margin-bottom:0.3rem;">2,847억</div>
      <div style="font-size:0.9rem;opacity:0.85;margin-bottom:0.8rem;">총 매출액</div>
      <div style="display:inline-flex;align-items:center;background:rgba(255,255,255,0.2);padding:0.3rem 0.7rem;border-radius:20px;font-size:0.8rem;font-weight:600;">
        <span style="margin-right:0.3rem;">&#9650;</span> +12.5% YoY
      </div>
    </div>

    <!-- 카드 2: 안정 -->
    <div style="background:linear-gradient(135deg,#00b482 0%,#009e73 100%);border-radius:12px;padding:1.8rem;color:#fff;box-shadow:0 4px 16px rgba(0,180,130,0.3);transition:transform 0.2s;cursor:default;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
      <div style="font-size:1.8rem;margin-bottom:0.6rem;">&#x1F464;</div>
      <div style="font-size:2.2rem;font-weight:800;margin-bottom:0.3rem;">15.2만</div>
      <div style="font-size:0.9rem;opacity:0.85;margin-bottom:0.8rem;">활성 사용자</div>
      <div style="display:inline-flex;align-items:center;background:rgba(255,255,255,0.2);padding:0.3rem 0.7rem;border-radius:20px;font-size:0.8rem;font-weight:600;">
        <span style="margin-right:0.3rem;">&#9650;</span> +8.3% MoM
      </div>
    </div>

    <!-- 카드 3: 주의 -->
    <div style="background:linear-gradient(135deg,#f77f00 0%,#e07000 100%);border-radius:12px;padding:1.8rem;color:#fff;box-shadow:0 4px 16px rgba(247,127,0,0.3);transition:transform 0.2s;cursor:default;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
      <div style="font-size:1.8rem;margin-bottom:0.6rem;">&#x23F1;</div>
      <div style="font-size:2.2rem;font-weight:800;margin-bottom:0.3rem;">4.2초</div>
      <div style="font-size:0.9rem;opacity:0.85;margin-bottom:0.8rem;">평균 응답 시간</div>
      <div style="display:inline-flex;align-items:center;background:rgba(255,255,255,0.2);padding:0.3rem 0.7rem;border-radius:20px;font-size:0.8rem;font-weight:600;">
        <span style="margin-right:0.3rem;">&#9660;</span> -15% 개선
      </div>
    </div>

    <!-- 카드 4: 위험 -->
    <div style="background:linear-gradient(135deg,#ef476f 0%,#d63d5e 100%);border-radius:12px;padding:1.8rem;color:#fff;box-shadow:0 4px 16px rgba(239,71,111,0.3);transition:transform 0.2s;cursor:default;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
      <div style="font-size:1.8rem;margin-bottom:0.6rem;">&#x26A0;</div>
      <div style="font-size:2.2rem;font-weight:800;margin-bottom:0.3rem;">23건</div>
      <div style="font-size:0.9rem;opacity:0.85;margin-bottom:0.8rem;">미해결 이슈</div>
      <div style="display:inline-flex;align-items:center;background:rgba(255,255,255,0.2);padding:0.3rem 0.7rem;border-radius:20px;font-size:0.8rem;font-weight:600;">
        <span style="margin-right:0.3rem;">&#9650;</span> +5건 증가
      </div>
    </div>
  </div>

  <!-- 2열 와이드 하이라이트 카드 (인사이트 강조용) -->
  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem;">

    <div style="background:#fff;border-left:4px solid #4361ee;border-radius:8px;padding:1.8rem;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <div style="display:flex;align-items:center;gap:0.8rem;margin-bottom:1rem;">
        <div style="width:40px;height:40px;background:#f0f4ff;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;">&#x1F4A1;</div>
        <span style="font-size:1rem;font-weight:700;color:#1a1a2e;">핵심 인사이트</span>
      </div>
      <p style="margin:0;color:#4a5568;line-height:1.7;font-size:0.95rem;">모바일 채널의 전환율이 데스크톱 대비 2.3배 높아, 모바일 퍼스트 전략의 효과가 검증되었습니다.</p>
    </div>

    <div style="background:#fff;border-left:4px solid #00b482;border-radius:8px;padding:1.8rem;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <div style="display:flex;align-items:center;gap:0.8rem;margin-bottom:1rem;">
        <div style="width:40px;height:40px;background:#f0fdf4;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;">&#x1F3AF;</div>
        <span style="font-size:1rem;font-weight:700;color:#1a1a2e;">핵심 제안</span>
      </div>
      <p style="margin:0;color:#4a5568;line-height:1.7;font-size:0.95rem;">Q2까지 모바일 UX 개선에 집중 투자하면 연간 매출 18% 추가 상승이 예상됩니다.</p>
    </div>
  </div>
</div>
```

---

## 7. 타임라인

**용도:** 프로젝트 일정, 마일스톤, 연혁 등 시간 순서대로 진행되는 이벤트를 수직 축으로 시각화한다.

**사용 조건:** 프로젝트 로드맵, 진행 일정, 주요 이벤트 이력, 향후 계획 등 시간 기반 데이터가 3개 항목 이상일 때 삽입한다. 각 항목에 날짜/제목/설명이 모두 있을 때 효과적이다.

```html
<div style="max-width:1200px;margin:2rem auto;font-family:'Pretendard',sans-serif;">
  <h3 style="margin:0 0 2rem 0;font-size:1.25rem;color:#1a1a2e;text-align:center;">프로젝트 로드맵</h3>

  <div style="position:relative;padding:1rem 0;">
    <!-- 세로 중앙선 -->
    <div style="position:absolute;left:50%;top:0;bottom:0;width:3px;background:linear-gradient(to bottom,#4361ee,#4cc9f0,#00b482);transform:translateX(-50%);border-radius:2px;"></div>

    <!-- 타임라인 아이템 1 (왼쪽) - 완료 -->
    <div style="display:flex;justify-content:flex-end;padding-right:calc(50% + 2rem);position:relative;margin-bottom:3rem;">
      <div style="position:absolute;left:50%;top:1.2rem;width:20px;height:20px;background:#4361ee;border:4px solid #fff;border-radius:50%;transform:translateX(-50%);box-shadow:0 0 0 4px rgba(67,97,238,0.2);z-index:1;"></div>
      <div style="background:#fff;border-radius:12px;padding:1.5rem;box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:450px;width:100%;border-left:4px solid #4361ee;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem;">
          <span style="font-size:0.8rem;font-weight:600;color:#fff;background:#4361ee;padding:0.2rem 0.8rem;border-radius:12px;">완료</span>
          <span style="font-size:0.85rem;color:#94a3b8;font-weight:500;">2025.01 - 2025.03</span>
        </div>
        <h4 style="margin:0 0 0.5rem 0;color:#1a1a2e;font-size:1.05rem;">Phase 1: 기획 및 요구사항 분석</h4>
        <p style="margin:0;color:#4a5568;font-size:0.9rem;line-height:1.6;">시장 조사 완료, 요구사항 정의서 승인, 프로젝트 헌장 확정</p>
      </div>
    </div>

    <!-- 타임라인 아이템 2 (오른쪽) - 완료 -->
    <div style="display:flex;justify-content:flex-start;padding-left:calc(50% + 2rem);position:relative;margin-bottom:3rem;">
      <div style="position:absolute;left:50%;top:1.2rem;width:20px;height:20px;background:#4cc9f0;border:4px solid #fff;border-radius:50%;transform:translateX(-50%);box-shadow:0 0 0 4px rgba(76,201,240,0.2);z-index:1;"></div>
      <div style="background:#fff;border-radius:12px;padding:1.5rem;box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:450px;width:100%;border-left:4px solid #4cc9f0;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem;">
          <span style="font-size:0.8rem;font-weight:600;color:#fff;background:#4cc9f0;padding:0.2rem 0.8rem;border-radius:12px;">완료</span>
          <span style="font-size:0.85rem;color:#94a3b8;font-weight:500;">2025.04 - 2025.06</span>
        </div>
        <h4 style="margin:0 0 0.5rem 0;color:#1a1a2e;font-size:1.05rem;">Phase 2: 설계 및 프로토타이핑</h4>
        <p style="margin:0;color:#4a5568;font-size:0.9rem;line-height:1.6;">시스템 아키텍처 설계, UI/UX 프로토타입 제작, 기술 검증(PoC) 완료</p>
      </div>
    </div>

    <!-- 타임라인 아이템 3 (왼쪽) - 진행중 -->
    <div style="display:flex;justify-content:flex-end;padding-right:calc(50% + 2rem);position:relative;margin-bottom:3rem;">
      <div style="position:absolute;left:50%;top:1.2rem;width:20px;height:20px;background:#f77f00;border:4px solid #fff;border-radius:50%;transform:translateX(-50%);box-shadow:0 0 0 4px rgba(247,127,0,0.2);z-index:1;animation:pulse 2s infinite;"></div>
      <div style="background:#fff;border-radius:12px;padding:1.5rem;box-shadow:0 4px 16px rgba(247,127,0,0.15);max-width:450px;width:100%;border-left:4px solid #f77f00;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem;">
          <span style="font-size:0.8rem;font-weight:600;color:#fff;background:#f77f00;padding:0.2rem 0.8rem;border-radius:12px;">진행중</span>
          <span style="font-size:0.85rem;color:#94a3b8;font-weight:500;">2025.07 - 2025.10</span>
        </div>
        <h4 style="margin:0 0 0.5rem 0;color:#1a1a2e;font-size:1.05rem;">Phase 3: 개발 및 테스트</h4>
        <p style="margin:0;color:#4a5568;font-size:0.9rem;line-height:1.6;">핵심 기능 개발 70% 완료, 단위 테스트 진행 중, QA 환경 구축 완료</p>
      </div>
    </div>

    <!-- 타임라인 아이템 4 (오른쪽) - 예정 -->
    <div style="display:flex;justify-content:flex-start;padding-left:calc(50% + 2rem);position:relative;margin-bottom:3rem;">
      <div style="position:absolute;left:50%;top:1.2rem;width:20px;height:20px;background:#c8c8d6;border:4px solid #fff;border-radius:50%;transform:translateX(-50%);box-shadow:0 0 0 4px rgba(200,200,214,0.2);z-index:1;"></div>
      <div style="background:#fff;border-radius:12px;padding:1.5rem;box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:450px;width:100%;border-left:4px solid #c8c8d6;opacity:0.75;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem;">
          <span style="font-size:0.8rem;font-weight:600;color:#fff;background:#c8c8d6;padding:0.2rem 0.8rem;border-radius:12px;">예정</span>
          <span style="font-size:0.85rem;color:#94a3b8;font-weight:500;">2025.11 - 2025.12</span>
        </div>
        <h4 style="margin:0 0 0.5rem 0;color:#1a1a2e;font-size:1.05rem;">Phase 4: 배포 및 안정화</h4>
        <p style="margin:0;color:#4a5568;font-size:0.9rem;line-height:1.6;">스테이징 배포, 사용자 수용 테스트(UAT), 프로덕션 출시, 모니터링 체계 가동</p>
      </div>
    </div>

    <!-- 타임라인 아이템 5 (왼쪽) - 예정 -->
    <div style="display:flex;justify-content:flex-end;padding-right:calc(50% + 2rem);position:relative;margin-bottom:1rem;">
      <div style="position:absolute;left:50%;top:1.2rem;width:20px;height:20px;background:#c8c8d6;border:4px solid #fff;border-radius:50%;transform:translateX(-50%);box-shadow:0 0 0 4px rgba(200,200,214,0.2);z-index:1;"></div>
      <div style="background:#fff;border-radius:12px;padding:1.5rem;box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:450px;width:100%;border-left:4px solid #c8c8d6;opacity:0.75;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem;">
          <span style="font-size:0.8rem;font-weight:600;color:#fff;background:#c8c8d6;padding:0.2rem 0.8rem;border-radius:12px;">예정</span>
          <span style="font-size:0.85rem;color:#94a3b8;font-weight:500;">2026.01 - 2026.03</span>
        </div>
        <h4 style="margin:0 0 0.5rem 0;color:#1a1a2e;font-size:1.05rem;">Phase 5: 운영 및 확장</h4>
        <p style="margin:0;color:#4a5568;font-size:0.9rem;line-height:1.6;">운영 안정화, 성능 최적화, 2차 기능 확장, 사용자 피드백 반영</p>
      </div>
    </div>
  </div>

  <!-- 진행중 마커 펄스 애니메이션 -->
  <style>
    @keyframes pulse {
      0% { box-shadow: 0 0 0 4px rgba(247, 127, 0, 0.2); }
      50% { box-shadow: 0 0 0 8px rgba(247, 127, 0, 0.1); }
      100% { box-shadow: 0 0 0 4px rgba(247, 127, 0, 0.2); }
    }
  </style>
</div>
```

---

## 사용 가이드

### 컴포넌트 삽입 시 주의사항

1. **Chart.js CDN은 보고서당 한 번만 로드**: 여러 차트를 사용할 경우 `<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>`는 `<head>` 또는 첫 번째 차트 위에 한 번만 선언한다.

2. **Canvas ID 중복 방지**: 같은 보고서에 여러 차트를 넣을 경우, 각 canvas의 id를 고유하게 변경해야 한다. (예: `barChart1`, `barChart2`)

3. **색상 팔레트 일관성**: 보고서 전체에서 동일한 색상 체계를 유지한다.
   - Primary: `#4361ee` (파랑)
   - Success: `#00b482` (초록)
   - Warning: `#f77f00` (주황)
   - Danger: `#ef476f` (빨강)
   - Info: `#4cc9f0` (하늘)
   - Purple: `#7209b7` (보라)

4. **반응형 고려**: 모든 컴포넌트는 `max-width:1200px`을 기준으로 하되, grid 레이아웃은 인쇄나 좁은 뷰에서 single column으로 전환할 수 있도록 media query 추가를 고려한다.

5. **스크롤 애니메이션 절제**: 전체 요소의 30% 이하에만 적용하여 과도한 애니메이션을 방지한다.

6. **인라인 스타일 원칙**: 보고서 HTML은 단일 파일로 동작해야 하므로, 외부 CSS 파일 참조 없이 인라인 스타일을 사용한다. 다만 `@keyframes`나 pseudo-class가 필요한 경우에만 `<style>` 태그를 사용한다.
