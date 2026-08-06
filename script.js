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
  const roadmapRange = document.getElementById('roadmapRange');
  const roadmapSummary = document.getElementById('roadmapSummary');
  const ganttTimelineHeader = document.getElementById('ganttTimelineHeader');
  const ganttRows = document.getElementById('ganttRows');

  if (!roadmapRange || !roadmapSummary || !ganttTimelineHeader || !ganttRows) return;

  const roadmapEntries = [];

  if (Array.isArray(data.projects)) {
    data.projects.forEach(project => {
      roadmapEntries.push({
        title: project.name,
        description: project.description || project.currentEvent || 'Upcoming milestone',
        label: project.nextEvent || 'TBD',
        status: project.status,
        type: 'Project',
        date: parseRoadmapDate(project.nextEvent)
      });
    });
  }

  if (Array.isArray(data.timeline)) {
    data.timeline.forEach(entry => {
      roadmapEntries.push({
        title: entry.title,
        description: entry.description || 'Milestone',
        label: entry.date || 'TBD',
        status: 'Milestone',
        type: 'Milestone',
        date: parseRoadmapDate(entry.date)
      });
    });
  }

  const validEntries = roadmapEntries.filter(entry => entry.date);
  validEntries.sort((a, b) => a.date - b.date);

  if (validEntries.length) {
    roadmapRange.textContent = `${formatRoadmapRange(validEntries[0].date)} → ${formatRoadmapRange(validEntries[validEntries.length - 1].date)}`;
    const inMotion = validEntries.filter(entry => /track|active|planning|preparing/i.test(entry.status || '')).length;
    roadmapSummary.innerHTML = `<span>${validEntries.length} milestones</span><span>${inMotion} in motion</span>`;
    ganttTimelineHeader.innerHTML = validEntries.slice(0, 6).map(entry => `
      <div class="gantt-tick">${entry.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
    `).join('');
    ganttRows.innerHTML = validEntries.slice(0, 6).map((entry, index) => `
      <div class="gantt-row">
        <div class="gantt-row-label">
          <strong>${entry.title}</strong>
          <span>${entry.description}</span>
        </div>
        <div class="gantt-bar-wrap">
          <span class="pill ${getPillClass(entry.status)}">${entry.type}</span>
          <div class="gantt-bar" style="width:${Math.max(28, 100 - index * 10)}%"></div>
          <small>${entry.label}</small>
        </div>
      </div>
    `).join('');
  } else {
    roadmapRange.textContent = 'No roadmap milestones available yet';
    roadmapSummary.innerHTML = '<span>0 milestones</span>';
    ganttTimelineHeader.innerHTML = '<div class="gantt-tick">No dates</div>';
    ganttRows.innerHTML = '<div class="gantt-row"><div class="gantt-row-label"><strong>Nothing to show yet</strong><span>Add dates to projects or timeline entries to populate the roadmap.</span></div></div>';
  }
}

function parseRoadmapDate(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toUpperCase() === 'TBD') return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function formatRoadmapRange(value) {
  return value.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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