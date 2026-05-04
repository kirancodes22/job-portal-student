// dashboard.js - Handles student dashboard, Kanban, stats, and activity feed

const socket = io();

// Student ID (simulated – in production this comes from login)
const currentStudentId = 1;

socket.on('connect', () => {
    socket.emit('join', currentStudentId);
});

// Listen for real-time status updates
socket.on('statusUpdate', (data) => {
    if (data.studentId === currentStudentId) {
        loadDashboard();
    }
});

// Load everything on page load
document.addEventListener('DOMContentLoaded', loadDashboard);

async function loadDashboard() {
    try {
        const response = await fetch(`/api/dashboard/${currentStudentId}`);
        const stats = await response.json();
        
        updateStats(stats);
        loadKanban();
        loadActivityFeed(stats.recentUpdates);
    } catch (error) {
        console.error('Dashboard load error:', error);
    }
}

function updateStats(stats) {
    document.getElementById('totalApps').textContent = stats.total;
    document.getElementById('shortlisted').textContent = stats.shortlisted;
    document.getElementById('interview').textContent = stats.interview;
    document.getElementById('offered').textContent = stats.offered;
    document.getElementById('successRate').textContent = stats.successRate + '%';
}

async function loadKanban() {
    try {
        const response = await fetch(`/api/applications/${currentStudentId}`);
        const applications = await response.json();
        
        // Clear all columns
        ['applied', 'shortlisted', 'interview', 'offered', 'rejected'].forEach(status => {
            document.getElementById(`col-${status}`).innerHTML = '';
        });
        
        // Group by status
        applications.forEach(app => {
            const col = document.getElementById(`col-${app.status}`);
            if (col) {
                col.innerHTML += `
                    <div class="app-card">
                        <h4>${app.company}</h4>
                        <p>${getJobTitle(app.jobId)}</p>
                        <p class="date">Applied: ${formatDate(app.appliedDate)}</p>
                        ${app.status === 'interview' ? '<p style="color:#e17055;font-weight:600;">📅 Interview Scheduled</p>' : ''}
                        ${app.status === 'offered' ? '<p style="color:#00b894;font-weight:600;">🎉 Offer Received!</p>' : ''}
                    </div>
                `;
            }
        });
        
        // Add empty state messages
        document.querySelectorAll('.column-body').forEach(col => {
            if (col.children.length === 0) {
                col.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">No applications</p>';
            }
        });
    } catch (error) {
        console.error('Kanban load error:', error);
    }
}

function loadActivityFeed(updates) {
    const feed = document.getElementById('activityFeed');
    if (!updates || updates.length === 0) {
        feed.innerHTML = '<p style="color:#999;">No recent activity</p>';
        return;
    }
    
    feed.innerHTML = updates.map(update => `
        <div class="activity-item">
            <div class="activity-icon icon-${update.status}">
                ${getStatusEmoji(update.status)}
            </div>
            <div class="activity-content">
                <strong>${update.company}</strong> – Status changed to <span style="text-transform:capitalize;">${update.status}</span>
                <span class="time">${formatDate(update.date)}</span>
            </div>
        </div>
    `).join('');
}

// Helper functions (simplified for demo)
function getJobTitle(jobId) {
    const jobMap = {
        1: 'Frontend Developer Intern',
        2: 'Full Stack Developer',
        3: 'Data Science Intern',
        4: 'UI/UX Designer',
        5: 'DevOps Intern',
        6: 'Backend Developer'
    };
    return jobMap[jobId] || 'Unknown Position';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getStatusEmoji(status) {
    const map = {
        applied: '📄',
        shortlisted: '⭐',
        interview: '🎤',
        offered: '🏆',
        rejected: '❌'
    };
    return map[status] || '📌';
}