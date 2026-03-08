/**
 * components.js
 *
 * 보고서 HTML에서 사용하는 동적 컴포넌트 JS 라이브러리
 * - Chart.js 래핑 헬퍼 (CDN으로 로드된 상태 전제)
 * - 아코디언/토글
 * - 탭 전환
 * - 스크롤 애니메이션
 * - 목차 자동 생성
 *
 * 외부 의존성: Chart.js CDN만 (차트 기능 사용 시)
 * 순수 바닐라 JS로 작성
 * 기준 해상도: FHD 1920x1080
 */

/* ==========================================================================
   1. 기본 색상 팔레트 (비즈니스 톤)
   ========================================================================== */

const CHART_COLORS = [
  '#2563eb', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
];

const CHART_COLORS_ALPHA = CHART_COLORS.map((c) => c + '33'); // 20% opacity

/* ==========================================================================
   2. 공통 Chart.js 기본 설정
   ========================================================================== */

/**
 * Chart.js 전역 기본값을 한글 폰트 및 비즈니스 스타일로 설정한다.
 * Chart.js가 로드된 후 호출해야 한다.
 */
function applyChartDefaults() {
  if (typeof Chart === 'undefined') return;

  Chart.defaults.font.family =
    "'Pretendard', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  Chart.defaults.font.size = 13;
  Chart.defaults.color = '#374151';
  Chart.defaults.plugins.legend.position = 'bottom';
  Chart.defaults.plugins.legend.labels.padding = 16;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.tooltip.cornerRadius = 6;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.responsive = true;
  Chart.defaults.maintainAspectRatio = false;
}

/**
 * 데이터셋 배열에 기본 색상을 적용한다.
 * @param {Array} datasets - Chart.js 데이터셋 배열
 * @param {string} type - 차트 유형 ('bar' | 'line')
 * @returns {Array} 색상이 적용된 데이터셋
 */
function applyDatasetColors(datasets, type) {
  return datasets.map((ds, i) => {
    const color = CHART_COLORS[i % CHART_COLORS.length];
    const colorAlpha = CHART_COLORS_ALPHA[i % CHART_COLORS_ALPHA.length];
    const defaults =
      type === 'line'
        ? {
            borderColor: color,
            backgroundColor: colorAlpha,
            borderWidth: 2.5,
            pointBackgroundColor: color,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.3,
            fill: true,
          }
        : {
            backgroundColor: color,
            borderColor: color,
            borderWidth: 0,
            borderRadius: 4,
            hoverBackgroundColor: color + 'cc',
          };
    return { ...defaults, ...ds };
  });
}

/* ==========================================================================
   3. Chart.js 래핑 헬퍼
   ========================================================================== */

/**
 * 막대 차트를 생성한다.
 * @param {string} canvasId - canvas 요소 ID
 * @param {string[]} labels - X축 라벨 배열
 * @param {Array} datasets - Chart.js 데이터셋 배열
 * @param {Object} [options={}] - Chart.js 옵션 오버라이드
 * @returns {Chart|null} Chart 인스턴스 또는 null
 */
function createBarChart(canvasId, labels, datasets, options = {}) {
  if (typeof Chart === 'undefined') {
    console.warn('[components.js] Chart.js가 로드되지 않았습니다.');
    return null;
  }
  applyChartDefaults();

  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.warn(`[components.js] canvas#${canvasId}를 찾을 수 없습니다.`);
    return null;
  }

  const defaultOptions = {
    plugins: {
      legend: { display: datasets.length > 1 },
    },
    scales: {
      x: {
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#f3f4f6' },
      },
    },
  };

  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: applyDatasetColors(datasets, 'bar'),
    },
    options: deepMerge(defaultOptions, options),
  });
}

/**
 * 라인 차트를 생성한다.
 * @param {string} canvasId - canvas 요소 ID
 * @param {string[]} labels - X축 라벨 배열
 * @param {Array} datasets - Chart.js 데이터셋 배열
 * @param {Object} [options={}] - Chart.js 옵션 오버라이드
 * @returns {Chart|null} Chart 인스턴스 또는 null
 */
function createLineChart(canvasId, labels, datasets, options = {}) {
  if (typeof Chart === 'undefined') {
    console.warn('[components.js] Chart.js가 로드되지 않았습니다.');
    return null;
  }
  applyChartDefaults();

  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.warn(`[components.js] canvas#${canvasId}를 찾을 수 없습니다.`);
    return null;
  }

  const defaultOptions = {
    plugins: {
      legend: { display: datasets.length > 1 },
    },
    scales: {
      x: {
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#f3f4f6' },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: applyDatasetColors(datasets, 'line'),
    },
    options: deepMerge(defaultOptions, options),
  });
}

/**
 * 파이 차트를 생성한다.
 * @param {string} canvasId - canvas 요소 ID
 * @param {string[]} labels - 라벨 배열
 * @param {number[]} data - 데이터 배열
 * @param {Object} [options={}] - Chart.js 옵션 오버라이드
 * @returns {Chart|null} Chart 인스턴스 또는 null
 */
function createPieChart(canvasId, labels, data, options = {}) {
  if (typeof Chart === 'undefined') {
    console.warn('[components.js] Chart.js가 로드되지 않았습니다.');
    return null;
  }
  applyChartDefaults();

  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.warn(`[components.js] canvas#${canvasId}를 찾을 수 없습니다.`);
    return null;
  }

  const colors = labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

  const defaultOptions = {
    plugins: {
      legend: { display: true },
      tooltip: {
        callbacks: {
          label: function (context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const value = context.parsed;
            const pct = ((value / total) * 100).toFixed(1);
            return ` ${context.label}: ${value.toLocaleString()} (${pct}%)`;
          },
        },
      },
    },
  };

  return new Chart(canvas, {
    type: 'pie',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 8,
        },
      ],
    },
    options: deepMerge(defaultOptions, options),
  });
}

/**
 * 도넛 차트를 생성한다.
 * @param {string} canvasId - canvas 요소 ID
 * @param {string[]} labels - 라벨 배열
 * @param {number[]} data - 데이터 배열
 * @param {Object} [options={}] - Chart.js 옵션 오버라이드
 * @returns {Chart|null} Chart 인스턴스 또는 null
 */
function createDonutChart(canvasId, labels, data, options = {}) {
  if (typeof Chart === 'undefined') {
    console.warn('[components.js] Chart.js가 로드되지 않았습니다.');
    return null;
  }
  applyChartDefaults();

  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.warn(`[components.js] canvas#${canvasId}를 찾을 수 없습니다.`);
    return null;
  }

  const colors = labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

  const defaultOptions = {
    cutout: '60%',
    plugins: {
      legend: { display: true },
      tooltip: {
        callbacks: {
          label: function (context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const value = context.parsed;
            const pct = ((value / total) * 100).toFixed(1);
            return ` ${context.label}: ${value.toLocaleString()} (${pct}%)`;
          },
        },
      },
    },
  };

  return new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 8,
        },
      ],
    },
    options: deepMerge(defaultOptions, options),
  });
}

/* ==========================================================================
   4. 아코디언 / 토글
   ========================================================================== */

/**
 * 모든 .accordion-item 을 초기화한다.
 * .accordion-header 클릭 시 .accordion-body 를 토글하고,
 * 화살표 아이콘(.accordion-icon)에 회전 애니메이션을 적용한다.
 */
function initAccordions() {
  const items = document.querySelectorAll('.accordion-item');

  items.forEach((item) => {
    const header = item.querySelector('.accordion-header');
    const body = item.querySelector('.accordion-body');

    if (!header || !body) return;

    // 아이콘이 없으면 자동으로 화살표 삽입
    let icon = header.querySelector('.accordion-icon');
    if (!icon) {
      icon = document.createElement('span');
      icon.className = 'accordion-icon';
      icon.innerHTML = '&#9662;'; // ▾
      icon.setAttribute('aria-hidden', 'true');
      header.appendChild(icon);
    }

    // 초기 스타일 설정 (접힌 상태)
    body.style.overflow = 'hidden';
    body.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';

    if (!item.classList.contains('active')) {
      body.style.maxHeight = '0';
      body.style.opacity = '0';
    } else {
      body.style.maxHeight = body.scrollHeight + 'px';
      body.style.opacity = '1';
      icon.style.transform = 'rotate(180deg)';
    }

    icon.style.transition = 'transform 0.3s ease';
    icon.style.display = 'inline-block';

    header.style.cursor = 'pointer';
    header.setAttribute('role', 'button');
    header.setAttribute('aria-expanded', item.classList.contains('active') ? 'true' : 'false');

    header.addEventListener('click', () => {
      const isActive = item.classList.toggle('active');

      if (isActive) {
        body.style.maxHeight = body.scrollHeight + 'px';
        body.style.opacity = '1';
        icon.style.transform = 'rotate(180deg)';
      } else {
        body.style.maxHeight = '0';
        body.style.opacity = '0';
        icon.style.transform = 'rotate(0deg)';
      }

      header.setAttribute('aria-expanded', String(isActive));
    });
  });
}

/* ==========================================================================
   5. 탭 전환
   ========================================================================== */

/**
 * 모든 .tab-group 컨테이너 안의 탭을 초기화한다.
 * .tab-button 클릭 시 해당 .tab-content 를 표시하고 나머지를 숨긴다.
 */
function initTabs() {
  const tabGroups = document.querySelectorAll('.tab-group');

  tabGroups.forEach((group) => {
    const buttons = group.querySelectorAll('.tab-button');
    const contents = group.querySelectorAll('.tab-content');

    if (buttons.length === 0) return;

    // 초기 상태: 첫 번째 탭 활성화 (이미 active인 것이 없으면)
    const hasActive = Array.from(buttons).some((btn) => btn.classList.contains('active'));
    if (!hasActive && buttons.length > 0) {
      buttons[0].classList.add('active');
      const targetId = buttons[0].getAttribute('data-tab');
      contents.forEach((content) => {
        if (content.id === targetId || content.getAttribute('data-tab-content') === targetId) {
          content.classList.add('active');
          content.style.display = 'block';
        } else {
          content.classList.remove('active');
          content.style.display = 'none';
        }
      });
    } else {
      // 이미 active 상태인 것만 보이게 설정
      contents.forEach((content) => {
        if (!content.classList.contains('active')) {
          content.style.display = 'none';
        } else {
          content.style.display = 'block';
        }
      });
    }

    buttons.forEach((button) => {
      button.setAttribute('role', 'tab');
      button.style.cursor = 'pointer';

      button.addEventListener('click', () => {
        const targetId = button.getAttribute('data-tab');

        // 모든 버튼 비활성화
        buttons.forEach((btn) => {
          btn.classList.remove('active');
          btn.setAttribute('aria-selected', 'false');
        });

        // 모든 콘텐츠 숨기기
        contents.forEach((content) => {
          content.classList.remove('active');
          content.style.display = 'none';
        });

        // 클릭된 탭 활성화
        button.classList.add('active');
        button.setAttribute('aria-selected', 'true');

        // 매칭 콘텐츠 표시
        contents.forEach((content) => {
          if (content.id === targetId || content.getAttribute('data-tab-content') === targetId) {
            content.classList.add('active');
            content.style.display = 'block';
          }
        });
      });
    });
  });
}

/* ==========================================================================
   6. 스크롤 애니메이션
   ========================================================================== */

/**
 * IntersectionObserver를 사용하여 .fade-in, .slide-up 클래스 요소에
 * 뷰포트 진입 시 애니메이션을 트리거한다.
 */
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('.fade-in, .slide-up');

  if (animatedElements.length === 0) return;

  // 초기 상태: 보이지 않는 상태로 설정
  animatedElements.forEach((el) => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';

    if (el.classList.contains('slide-up')) {
      el.style.transform = 'translateY(30px)';
    }
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;

          // 약간의 지연(stagger) 효과: data-delay 속성 지원
          const delay = parseInt(el.getAttribute('data-delay') || '0', 10);

          setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
            el.classList.add('animated');
          }, delay);

          // 한 번만 애니메이션 (반복 원하면 주석 해제)
          observer.unobserve(el);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  animatedElements.forEach((el) => observer.observe(el));
}

/* ==========================================================================
   7. 목차(TOC) 자동 생성
   ========================================================================== */

/**
 * <main> 안의 h2, h3 태그를 스캔하여 <nav id="toc"> 안에 목차를 생성한다.
 * 각 heading에 자동 ID를 부여하고, 클릭 시 해당 섹션으로 부드럽게 스크롤한다.
 */
function generateTOC() {
  const main = document.querySelector('main');
  const tocNav = document.querySelector('nav#toc, nav.toc, .toc-container');

  if (!main || !tocNav) return;

  const headings = main.querySelectorAll('h2, h3');

  if (headings.length === 0) return;

  const tocList = document.createElement('ul');
  tocList.className = 'toc-list';

  headings.forEach((heading, index) => {
    // 자동 ID 부여 (이미 있으면 유지)
    if (!heading.id) {
      const slug = heading.textContent
        .trim()
        .toLowerCase()
        .replace(/[^\w\s가-힣-]/g, '')
        .replace(/\s+/g, '-');
      heading.id = slug || `section-${index + 1}`;
    }

    const li = document.createElement('li');
    li.className = heading.tagName === 'H3' ? 'toc-item toc-item--sub' : 'toc-item';

    const a = document.createElement('a');
    a.href = `#${heading.id}`;
    a.textContent = heading.textContent.trim();
    a.className = 'toc-link';

    // 부드러운 스크롤
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(heading.id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // URL 해시 업데이트
        history.pushState(null, '', `#${heading.id}`);
      }
    });

    li.appendChild(a);
    tocList.appendChild(li);
  });

  tocNav.innerHTML = '';

  const tocTitle = document.createElement('h4');
  tocTitle.className = 'toc-title';
  tocTitle.textContent = '목차';

  tocNav.appendChild(tocTitle);
  tocNav.appendChild(tocList);
}

/* ==========================================================================
   8. 유틸리티 함수
   ========================================================================== */

/**
 * 두 객체를 깊은 병합(deep merge)한다.
 * 배열은 덮어쓰기로 처리한다.
 * @param {Object} target - 기본 객체
 * @param {Object} source - 오버라이드 객체
 * @returns {Object} 병합된 새 객체
 */
function deepMerge(target, source) {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

/* ==========================================================================
   9. DOMContentLoaded 초기화
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  generateTOC();
  initAccordions();
  initTabs();
  initScrollAnimations();
});
