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
      ? data.projects.filter(project => ['On Track', 'Active', 'Preparing'].includes(project.status))
      : [];
    const backlogProjects = Array.isArray(data.projects)
      ? data.projects.filter(project => !['On Track', 'Active', 'Preparing'].includes(project.status))
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
      timelineCard.innerHTML = data.timeline
        .map(entry => {
          const formattedDate = formatDate(entry.date);
          const [day, month] = formattedDate.split(' ');
          return `
            <div class="timeline-item">
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