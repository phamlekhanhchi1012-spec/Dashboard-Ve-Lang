async function loadDashboard() {
  try {
    const response = await fetch('data.json');
    const data = await response.json();

    renderHeader(data);
    renderSummary(data);
    renderProjects(data);
    renderTimeline(data);
    renderRoadmap(data);
    renderPartners(data);
    renderTasks(data);
    renderRawJson(data);
    attachUiHandlers();
    setLastUpdated();
  } catch (error) {
    console.error('Failed to load dashboard data:', error);
  }
}

function renderHeader(data) {
  const teamList = document.getElementById('teamList');
  const dashboardTitle = document.getElementById('dashboardTitle');
  const dashboardDescription = document.getElementById('dashboardDescription');

  if (teamList && Array.isArray(data.team)) {
    teamList.textContent = data.team.join(' · ');
  }

  if (dashboardTitle) {
    dashboardTitle.textContent = data.objective || 'Project Dashboard';
  }

  if (dashboardDescription) {
    dashboardDescription.textContent = data.description || 'Everything the team needs to track projects, events and partnerships.';
  }
}

function renderSummary(data) {
  const summaryGrid = document.getElementById('summaryGrid');
  if (!summaryGrid) return;

  const activeProjects = Array.isArray(data.projects)
    ? data.projects.filter(project => project.group?.toString().toLowerCase() !== 'upcoming')
    : [];
  const backlogProjects = Array.isArray(data.projects)
    ? data.projects.filter(project => project.group?.toString().toLowerCase() === 'upcoming')
    : [];

  const partnerCount = Array.isArray(data.partners) ? data.partners.length : 0;
  const taskCount = Array.isArray(data.tasks) ? data.tasks.length : 0;
  const overallStatus = data.summary?.status || deriveOverallStatus(activeProjects, backlogProjects, taskCount);
  const description = data.summary?.description || 'Core activities are moving forward with no critical blockers.';

  const cards = [
    {
      title: 'Overall Status',
      value: overallStatus,
      description,
      variant: 'featured'
    },
    {
      title: 'Active Projects',
      value: String(activeProjects.length),
      description: 'Projects currently in execution.'
    },
    {
      title: 'Upcoming',
      value: String(backlogProjects.length),
      description: 'Projects waiting for planning or approval.'
    },
    {
      title: 'Partnership Deals',
      value: String(partnerCount),
      description: 'Active, confirmed or in discussion.'
    },
    {
      title: 'Open Items',
      value: String(taskCount),
      description: 'Tasks requiring follow-up across all projects.'
    }
  ];

  summaryGrid.innerHTML = cards.map(card => `
    <article class="summary-card ${card.variant || ''}">
      <span class="eyebrow">${escapeHtml(card.title)}</span>
      <strong class="metric">${escapeHtml(card.value)}</strong>
      <p>${escapeHtml(card.description)}</p>
    </article>`).join('');
}

function deriveOverallStatus(activeProjects, backlogProjects, taskCount) {
  if (!activeProjects.length && backlogProjects.length) return 'Planning';
  if (taskCount > 10) return 'Busy';
  return activeProjects.length ? 'On Track' : 'Starting';
}

function renderProjects(data) {
  const container = document.getElementById('projectContainer');
  if (!container) return;

  if (!Array.isArray(data.projects) || !data.projects.length) {
    container.innerHTML = '<div class="roadmap-event-empty">No project data available.</div>';
    return;
  }

  const grouped = data.projects.reduce((accumulator, project) => {
    const group = project.group?.toString().trim() || 'Uncategorized';
    if (!accumulator[group]) accumulator[group] = [];
    accumulator[group].push(project);
    return accumulator;
  }, {});

  container.innerHTML = Object.entries(grouped)
    .map(([group, projects]) => `
      <div class="project-group">
        <div class="section-heading project-group-heading">
          <div><span class="eyebrow">${escapeHtml(group)}</span><h3>${escapeHtml(group)}</h3></div>
        </div>
        <div class="project-grid">${renderProjectCards(projects)}</div>
      </div>`)
    .join('');
}

function renderProjectCards(projects) {
  return projects.map((project, index) => {
    const statusClass = getPillClass(project.status);
    const partnerLabel = project.partner || 'TBD';
    const nextEvent = formatDate(project.nextEvent);
    const currentLabel = project.currentEvent || project.currentPhase || 'TBD';
    const description = project.description
      ? project.description
      : `${project.name} is ${String(project.status || 'active').toLowerCase()} with ${partnerLabel}.`;

    return `
      <article class="project-card">
        <div class="project-card-top">
          <span class="project-index">${String(index + 1).padStart(2, '0')}</span>
          <span class="pill ${statusClass}">${escapeHtml(project.status || 'Unknown')}</span>
        </div>
        <h3>${escapeHtml(project.name)}</h3>
        <p class="project-description">${escapeHtml(description)}</p>
        <div class="project-meta">
          <div><span>Current</span><strong>${escapeHtml(currentLabel)}</strong></div>
          <div><span>Next</span><strong>${escapeHtml(nextEvent)}</strong></div>
          <div><span>Partner</span><strong>${escapeHtml(partnerLabel)}</strong></div>
        </div>
      </article>`;
  }).join('');
}

function renderTimeline(data) {
  const timelineCard = document.getElementById('timelineCard');
  if (!timelineCard) return;

  if (!Array.isArray(data.timeline) || !data.timeline.length) {
    timelineCard.innerHTML = '<div class="roadmap-event-empty">No timeline items available.</div>';
    return;
  }

  const sortedTimeline = [...data.timeline].sort((a, b) => new Date(a.date) - new Date(b.date));
  timelineCard.innerHTML = sortedTimeline
    .map(entry => {
      const formattedDate = formatDate(entry.date);
      const [day, month] = formattedDate.split(' ');
      return `
        <div class="timeline-item timeline-item-large">
          <div class="timeline-date"><span>${escapeHtml(day)}</span><small>${escapeHtml(month)}</small></div>
          <div class="timeline-content"><strong>${escapeHtml(entry.title)}</strong><p>${escapeHtml(entry.description || '')}</p></div>
        </div>`;
    })
    .join('');
}

function renderRoadmap(data) {
  const partnerTrack = document.getElementById('roadmapPartnerTrack');
  const timeline = document.getElementById('roadmapTimeline');

  if (!partnerTrack || !timeline) return;

  const roadmapData = data?.roadmap;
  if (!roadmapData || !Array.isArray(roadmapData.partners) || !Array.isArray(roadmapData.events)) {
    partnerTrack.innerHTML = '<div class="roadmap-event-empty">Roadmap data is not available yet.</div>';
    timeline.innerHTML = '<div class="roadmap-event-empty">Add roadmap partners and events in data.json to populate this timeline.</div>';
    return;
  }

  const partners = roadmapData.partners.filter(partner => partner && partner.id);
  const events = roadmapData.events
    .map(event => ({
      ...event,
      partnerIds: normalizeRoadmapPartnerIds(event.partnerIds),
      parsedDate: parseRoadmapDate(event.date)
    }))
    .filter(event => event.parsedDate && !/weekly funrun/i.test(event.title || '') && !/weekly funrun/i.test(event.id || ''))
    .sort((a, b) => a.parsedDate - b.parsedDate);

  renderRoadmapPartners(partners, events, partnerTrack);
  renderRoadmapEvents(partners, events, timeline);
}

function renderRoadmapPartners(partners, events, container) {
  if (!partners.length) {
    container.innerHTML = '<div class="roadmap-event-empty">No roadmap partners available.</div>';
    return;
  }

  const partnerMap = getRoadmapPartnerMap(partners);
  const markup = partners.map(partner => {
    const partnerId = normalizeRoadmapPartnerId(partner.id);
    const linkedCount = events.filter(event => event.partnerIds.includes(partnerId)).length;
    return `
      <button class="roadmap-partner-chip" type="button" data-partner-id="${escapeHtml(partnerId)}" aria-label="Show events for ${escapeHtml(partner.name)}">
        <span class="roadmap-partner-meta">
          <strong>${escapeHtml(partner.name)}</strong>
          <span>${escapeHtml(partner.role || 'Partner')}</span>
        </span>
        <span class="roadmap-partner-count">${linkedCount}</span>
      </button>`;
  }).join('');

  container.innerHTML = markup;

  container.querySelectorAll('.roadmap-partner-chip').forEach((chip) => {
    const partner = partnerMap[chip.dataset.partnerId];
    if (!partner) return;
    chip.style.setProperty('--roadmap-partner-color', partner.color || '#fa2d1a');
    chip.addEventListener('click', () => {
      const isActive = chip.classList.toggle('is-active');
      const selectedId = chip.dataset.partnerId;
      const timeline = document.getElementById('roadmapTimeline');
      if (!timeline) return;
      timeline.querySelectorAll('.roadmap-event-card').forEach((card) => {
        const linked = card.dataset.partnerIds.split(' ').includes(selectedId);
        card.classList.toggle('is-highlighted', isActive && linked);
        card.classList.toggle('is-muted', isActive && !linked);
      });
    });
  });
}

function renderRoadmapEvents(partners, events, container) {
  if (!events.length) {
    container.innerHTML = '<div class="roadmap-event-empty">No roadmap events available.</div>';
    return;
  }

  const partnerMap = getRoadmapPartnerMap(partners);
  const startDate = events[0].parsedDate;
  const endDate = events[events.length - 1].parsedDate;
  const monthLabels = generateMonthLabels(startDate, endDate);

  const railMarkup = '<div class="roadmap-timeline-rail"></div>';
  const eventMarkup = events.map((event, index) => {
    const position = calculateEventPosition(event.parsedDate, startDate, endDate);
    const isMonthOnly = ['ve-lang-01', 'ss-music-run-01'].includes(event.id);
    const dateLabel = (isMonthOnly && event.parsedDate)
      ? event.parsedDate.toLocaleDateString('en-GB', { month: 'short' })
      : formatRoadmapDate(event.parsedDate);
    const partnerMarkers = renderEventPartnerMarkers(event, partnerMap);
    return `
      <article class="roadmap-event-card" data-partner-ids="${escapeHtml(event.partnerIds.join(' '))}">
        <div class="roadmap-event-accent"></div>
        <span class="roadmap-event-date">${escapeHtml(dateLabel)}</span>
        <strong>${escapeHtml(event.title)}</strong>
        <p>${escapeHtml(event.type || 'Event')}</p>
        <div class="roadmap-event-partners">${partnerMarkers}</div>
      </article>`;
  }).join('');

  container.innerHTML = `
    <div class="roadmap-month-labels">${monthLabels.map(item => `<div class="roadmap-month-label">${escapeHtml(item)}</div>`).join('')}</div>
    <div class="roadmap-timeline-shell">
      ${railMarkup}
      ${eventMarkup}
    </div>`;

  container.querySelectorAll('.roadmap-event-card').forEach((card, index) => {
    const event = events[index];
    const lane = index % 2 === 0 ? 0 : 1;
    const position = calculateEventPosition(event.parsedDate, startDate, endDate);
    const accentColor = getEventAccentColor(event, partnerMap);
    card.style.setProperty('--event-left', `${position}%`);
    card.style.setProperty('--event-top', lane === 0 ? '24px' : '104px');
    card.style.setProperty('--event-accent', accentColor);
    card.querySelectorAll('.roadmap-event-partner').forEach(marker => {
      const partnerId = marker.dataset.partnerId;
      const partner = partnerMap[partnerId];
      if (partner) {
        marker.style.setProperty('--roadmap-partner-color', partner.color || '#fa2d1a');
      }
    });
  });
}

function getRoadmapPartnerMap(partners) {
  return partners.reduce((accumulator, partner) => {
    const id = normalizeRoadmapPartnerId(partner.id);
    if (id) accumulator[id] = partner;
    return accumulator;
  }, {});
}

function renderEventPartnerMarkers(event, partnerMap) {
  const partnerIds = normalizeRoadmapPartnerIds(event.partnerIds);
  if (!partnerIds.length) {
    return '<span class="roadmap-event-partner" data-partner-id=""><span>Unassigned</span></span>';
  }

  return partnerIds
    .map((partnerId) => {
      const partner = partnerMap[partnerId];
      if (!partner) {
        return `<span class="roadmap-event-partner" data-partner-id="${escapeHtml(partnerId)}">${escapeHtml(partnerId.replace(/[-_]/g, ' '))}</span>`;
      }
      return `<span class="roadmap-event-partner" data-partner-id="${escapeHtml(partnerId)}">${escapeHtml(partner.name)}</span>`;
    })
    .filter(Boolean)
    .join('');
}

function generateMonthLabels(startDate, endDate) {
  const labels = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const endCursor = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  while (cursor <= endCursor) {
    labels.push(cursor.toLocaleDateString('en-GB', { month: 'short' }));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return labels;
}

function calculateEventPosition(date, startDate, endDate) {
  const totalDays = Math.max(1, (endDate - startDate) / (1000 * 60 * 60 * 24));
  const offsetDays = Math.max(0, (date - startDate) / (1000 * 60 * 60 * 24));
  const ratio = offsetDays / totalDays;
  return Math.min(88, Math.max(12, ratio * 100));
}

function parseRoadmapDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function formatDate(value) {
  if (!value) return 'TBD';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return String(value);
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function formatRoadmapDate(value) {
  if (!value) return 'TBD';
  return value.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function getEventAccentColor(event, partnerMap) {
  const partnerIds = normalizeRoadmapPartnerIds(event.partnerIds);
  if (!partnerIds.length) return 'var(--accent)';
  if (partnerIds.length === 1) {
    return partnerMap[partnerIds[0]]?.color || 'var(--accent)';
  }
  return partnerIds.slice(0, 3).map(partnerId => partnerMap[partnerId]?.color || 'var(--accent)').join(', ');
}

function normalizeRoadmapPartnerId(value) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeRoadmapPartnerIds(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeRoadmapPartnerId).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(/[,;]+/).map(normalizeRoadmapPartnerId).filter(Boolean);
  }
  return [];
}

function renderPartners(data) {
  const partnerList = document.getElementById('partnerList');
  if (!partnerList) return;

  if (!Array.isArray(data.partners) || !data.partners.length) {
    partnerList.innerHTML = '<div class="roadmap-event-empty">No partners available.</div>';
    return;
  }

  partnerList.innerHTML = data.partners
    .map(partner => {
      const avatar = partner.name?.trim().charAt(0).toUpperCase() || 'P';
      const statusClass = getPillClass(partner.status);
      return `
        <article class="partner-card">
          <div class="partner-avatar">${escapeHtml(avatar)}</div>
          <div class="partner-info">
            <strong>${escapeHtml(partner.name)}</strong>
            <span>${escapeHtml(partner.project || '')}</span>
          </div>
          <span class="pill ${statusClass}">${escapeHtml(partner.status || 'Unknown')}</span>
        </article>`;
    })
    .join('');
}

function renderTasks(data) {
  const taskBoard = document.getElementById('taskBoard');
  const taskCountDisplay = document.getElementById('taskCount');
  if (!taskBoard) return;

  const tasks = Array.isArray(data.tasks) ? data.tasks : [];
  if (taskCountDisplay) {
    const highPriorityCount = tasks.filter(task => task.priority?.toString().toLowerCase() === 'high').length;
    taskCountDisplay.textContent = `${highPriorityCount} priority items`;
  }

  if (!tasks.length) {
    taskBoard.innerHTML = '<div class="roadmap-event-empty">No open items available.</div>';
    return;
  }

  taskBoard.innerHTML = tasks
    .map(task => {
      const priorityClass = task.priority?.toString().toLowerCase() === 'high'
        ? 'high'
        : task.priority?.toString().toLowerCase() === 'medium'
        ? 'medium'
        : 'low';
      return `
        <article class="task-row">
          <label class="task-main">
            <input type="checkbox">
            <span><strong>${escapeHtml(task.title)}</strong><small>${task.project ? `${escapeHtml(task.project)} · ` : ''}${task.due ? `Due ${escapeHtml(formatDate(task.due))}` : ''}</small></span>
          </label>
          <span class="priority ${priorityClass}">${escapeHtml(task.priority || 'Low')}</span>
        </article>`;
    })
    .join('');
}

function renderRawJson(data) {
  const contentSection = document.getElementById('content');
  if (!contentSection) return;
  contentSection.innerHTML = `<pre class="json-view">${escapeHtml(JSON.stringify(data, null, 2))}</pre>`;
}

function attachUiHandlers() {
  const darkBtn = document.getElementById('darkModeButton');
  if (darkBtn) {
    darkBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      darkBtn.textContent = document.body.classList.contains('dark') ? 'Light' : 'Dark';
    });
  }
}

function getPillClass(status) {
  if (!status) return 'neutral';
  const normalized = status.toString().toLowerCase();
  if (normalized.includes('on track') || normalized.includes('active')) return 'success';
  if (normalized.includes('need') || normalized.includes('negotiating') || normalized.includes('warning')) return 'warning';
  if (normalized.includes('planning') || normalized.includes('confirmed') || normalized.includes('preparing')) return 'neutral';
  return 'accent';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setLastUpdated() {
  const updateText = document.getElementById('lastUpdated');
  if (!updateText) return;
  const today = new Date();
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  updateText.textContent = `Last updated ${today.toLocaleDateString('en-GB', options)}`;
}

document.addEventListener('DOMContentLoaded', loadDashboard);
