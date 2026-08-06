async function loadDashboard() {
  try {
    const response = await fetch('data.json');
    const data = await response.json();

    const teamList = document.getElementById('teamList');
    const activeProjectsCount = document.getElementById('activeProjectsCount');
    const backlogProjectsCount = document.getElementById('backlogProjectsCount');
    const partnershipCount = document.getElementById('partnershipCount');
    const openItemsCount = document.getElementById('openItemsCount');
    const activeProjectGrid = document.getElementById('activeProjectGrid');
    const backlogProjectGrid = document.getElementById('backlogProjectGrid');
    const timelineCard = document.getElementById('timelineCard');
    const partnerList = document.getElementById('partnerList');
    const taskBoard = document.getElementById('taskBoard');

    if (teamList && Array.isArray(data.team)) {
      teamList.textContent = data.team.join(' · ');
    }

    if (activeProjectsCount) {
      activeProjectsCount.textContent = String(data.projects?.length ?? 0);
    }
    if (partnershipCount) {
      partnershipCount.textContent = String(data.partners?.length ?? 0);
    }
    if (openItemsCount) {
      openItemsCount.textContent = String(data.tasks?.length ?? 0);
    }

    const activeProjects = Array.isArray(data.projects)
      ? data.projects.filter(project => project.group !== 'Backlog')
      : [];
    const backlogProjects = Array.isArray(data.projects)
      ? data.projects.filter(project => project.group === 'Backlog')
      : [];

    const renderProjectCards = (projects) => projects
      .map((project, index) => {
        const statusClass = getPillClass(project.status);
        const partnerLabel = project.partner || 'TBD';
        const nextEvent = formatDate(project.nextEvent);
        const currentLabel = project.currentEvent || project.currentPhase || 'TBD';
        const description = project.description
          ? project.description
          : `${project.name} is ${project.status.toLowerCase()} with partner ${partnerLabel}.`;

        return `
          <article class="project-card">
            <div class="project-card-top">
              <span class="project-index">${String(index + 1).padStart(2, '0')}</span>
              <span class="pill ${statusClass}">${project.status}</span>
            </div>
            <h3>${project.name}</h3>
            <p class="project-description">${description}</p>
            <div class="project-meta">
              <div><span>Current</span><strong>${currentLabel}</strong></div>
              <div><span>Next</span><strong>${nextEvent}</strong></div>
              <div><span>Partner</span><strong>${partnerLabel}</strong></div>
            </div>
          </article>`;
      })
      .join('');

    if (activeProjectsCount) {
      activeProjectsCount.textContent = String(activeProjects.length);
    }
    if (backlogProjectsCount) {
      backlogProjectsCount.textContent = String(backlogProjects.length);
    }
    if (activeProjectGrid) {
      activeProjectGrid.innerHTML = renderProjectCards(activeProjects);
    }
    if (backlogProjectGrid) {
      backlogProjectGrid.innerHTML = renderProjectCards(backlogProjects);
    }

    if (timelineCard && Array.isArray(data.timeline)) {
      const sortedTimeline = [...data.timeline].sort((a, b) => new Date(a.date) - new Date(b.date));
      timelineCard.innerHTML = sortedTimeline
        .map(entry => {
          const formattedDate = formatDate(entry.date);
          const [day, month] = formattedDate.split(' ');
          return `
            <div class="timeline-item timeline-item-large">
              <div class="timeline-date"><span>${day}</span><small>${month}</small></div>
              <div class="timeline-content"><strong>${entry.title}</strong><p>${entry.description || ''}</p></div>
            </div>`;
        })
        .join('');
    }

    if (partnerList && Array.isArray(data.partners)) {
      partnerList.innerHTML = data.partners
        .map(partner => {
          const avatar = partner.name?.trim().charAt(0).toUpperCase() || 'P';
          const statusClass = getPillClass(partner.status);
          return `
            <article class="partner-card">
              <div class="partner-avatar">${avatar}</div>
              <div class="partner-info">
                <strong>${partner.name}</strong>
                <span>${partner.project}</span>
              </div>
              <span class="pill ${statusClass}">${partner.status}</span>
            </article>`;
        })
        .join('');
    }

    if (taskBoard && Array.isArray(data.tasks)) {
      taskBoard.innerHTML = data.tasks
        .map(task => {
          const priorityClass = task.priority?.toLowerCase() === 'high'
            ? 'high'
            : task.priority?.toLowerCase() === 'medium'
            ? 'medium'
            : 'low';
          return `
            <article class="task-row">
              <label class="task-main">
                <input type="checkbox">
                <span><strong>${task.title}</strong><small>${task.project ? `${task.project} · ` : ''}${task.due ? `Due ${formatDate(task.due)}` : ''}</small></span>
              </label>
              <span class="priority ${priorityClass}">${task.priority}</span>
            </article>`;
        })
        .join('');
    }

    renderRoadmap(data);
  } catch (error) {
    console.error('Failed to load dashboard data:', error);
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
    .map(event => ({ ...event, parsedDate: parseRoadmapDate(event.date) }))
    .filter(event => event.parsedDate)
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
    const linkedCount = events.filter(event => event.partnerIds?.includes(partner.id)).length;
    return `
      <button class="roadmap-partner-chip" type="button" data-partner-id="${escapeHtml(partner.id)}" aria-label="Show events for ${escapeHtml(partner.name)}">
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
    const lane = index % 2 === 0 ? 0 : 1;
    const partnerMarkers = renderEventPartnerMarkers(event, partnerMap);
    const dateLabel = formatRoadmapDate(event.parsedDate);
    return `
      <article class="roadmap-event-card" data-partner-ids="${escapeHtml(event.partnerIds?.join(' ') || '')}">
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
    accumulator[partner.id] = partner;
    return accumulator;
  }, {});
}

function renderEventPartnerMarkers(event, partnerMap) {
  if (!Array.isArray(event.partnerIds) || !event.partnerIds.length) {
    return '<span class="roadmap-event-partner" data-partner-id=""><span>Unassigned</span></span>';
  }

  return event.partnerIds
    .filter(Boolean)
    .map((partnerId) => {
      const partner = partnerMap[partnerId];
      if (!partner) return '';
      return `<span class="roadmap-event-partner" data-partner-id="${escapeHtml(partner.id)}">${escapeHtml(partner.name)}</span>`;
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
  const clamped = Math.min(88, Math.max(12, ratio * 100));
  return clamped;
}

function parseRoadmapDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function formatRoadmapDate(value) {
  if (!value) return 'TBD';
  return value.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function getEventAccentColor(event, partnerMap) {
  const partnerIds = Array.isArray(event.partnerIds) ? event.partnerIds.filter(Boolean) : [];
  if (!partnerIds.length) return 'var(--accent)';
  if (partnerIds.length === 1) {
    return partnerMap[partnerIds[0]]?.color || 'var(--accent)';
  }
  return partnerIds.slice(0, 3).map((partnerId) => partnerMap[partnerId]?.color || 'var(--accent)').join(', ');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value) {
  if (!value) return 'TBD';
  if (value.toUpperCase?.() === 'TBD') return 'TBD';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function setLastUpdated() {
  const updateText = document.getElementById('lastUpdated');
  if (!updateText) return;
  const today = new Date();
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  updateText.textContent = `Last updated ${today.toLocaleDateString('en-GB', options)}`;
}

document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  setLastUpdated();
  const darkBtn = document.getElementById('darkModeButton');
  if (darkBtn) {
    darkBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      darkBtn.textContent = document.body.classList.contains('dark') ? 'Light' : 'Dark';
    });
  }
});
