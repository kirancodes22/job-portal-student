// script.js - Complete frontend logic with all features

// Sample student data (in production, this comes from login)
let currentStudent = {
    id: 1,
    name: 'Rahul Verma',
    skills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL']
};

// Initialize Socket.io for real-time features
const socket = io();

socket.on('connect', () => {
    console.log('🟢 Connected to real-time server');
    socket.emit('join', currentStudent.id);
});

// Real-time notification for new jobs
socket.on('newJob', (job) => {
    showToast(`🔔 New job alert: ${job.title} at ${job.company}`, 'info');
    loadJobs(); // Refresh job listings
});

// Application status updates
socket.on('statusUpdate', (data) => {
    if (data.studentId === currentStudent.id) {
        showToast(`📋 Application status updated to: ${data.status}`, 'success');
    }
});

// ============ PAGE LOAD ============
document.addEventListener('DOMContentLoaded', () => {
    loadJobs();
    setupEventListeners();
});

// ============ LOAD JOBS WITH MATCHING ============
async function loadJobs(searchTerm = '', filterType = '') {
    try {
        const skillsParam = currentStudent.skills.join(',');
        let url = `/api/jobs?skills=${skillsParam}`;
        
        const response = await fetch(url);
        let jobs = await response.json();
        
        // Client-side filtering
        if (searchTerm) {
            jobs = jobs.filter(job => 
                job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                job.requiredSkills.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        
        if (filterType && filterType !== 'all') {
            jobs = jobs.filter(job => job.type === filterType);
        }
        
        displayJobs(jobs);
    } catch (error) {
        console.error('Error loading jobs:', error);
    }
}

// ============ DISPLAY JOB CARDS ============
function displayJobs(jobs) {
    const container = document.getElementById('jobsContainer');
    
    if (!jobs.length) {
        container.innerHTML = `
            <div style="text-align:center; padding:60px; grid-column:1/-1;">
                <h3>😕 No jobs found</h3>
                <p>Try adjusting your search or check back later for new opportunities!</p>
            </div>`;
        return;
    }
    
    container.innerHTML = jobs.map(job => `
        <div class="job-card">
            <div class="job-card-header">
                <div class="company-logo">${job.company[0]}</div>
                ${job.matchPercentage !== null ? 
                    `<span class="match-badge">🎯 ${job.matchPercentage}% Match</span>` : ''}
            </div>
            <h3 class="job-title">${job.title}</h3>
            <p class="company-name">🏢 ${job.company}</p>
            <div class="job-details">
                <span class="job-tag">📍 ${job.location}</span>
                <span class="job-tag">💰 ${job.salary}</span>
                <span class="job-tag">📅 ${job.type}</span>
            </div>
            <div class="skills-list">
                ${job.requiredSkills.map(skill => 
                    `<span class="skill-tag ${job.skillGaps && job.skillGaps.includes(skill) ? 'skill-gap' : ''}">
                        ${skill} ${job.skillGaps && job.skillGaps.includes(skill) ? '⚠️' : '✅'}
                    </span>`
                ).join('')}
            </div>
            ${job.skillGaps && job.skillGaps.length ? 
                `<p style="color:#E17055; font-size:0.85rem; margin-bottom:10px;">
                    📚 Skill gaps: ${job.skillGaps.join(', ')}
                </p>` : ''}
            <button class="apply-btn" onclick="applyForJob(${job.id}, '${job.company}', '${job.title}')">
                🚀 Quick Apply
            </button>
        </div>
    `).join('');
}

// ============ APPLICATION MODAL ============
function applyForJob(jobId, company, title) {
    document.getElementById('applyJobTitle').textContent = `${title} at ${company}`;
    document.getElementById('applyJobId').value = jobId;
    document.getElementById('applyCompany').value = company;
    document.getElementById('applyModal').style.display = 'block';
}

// ============ SUBMIT APPLICATION ============
async function submitApplication(e) {
    e.preventDefault();
    
    const application = {
        studentId: currentStudent.id,
        studentName: currentStudent.name,
        jobId: parseInt(document.getElementById('applyJobId').value),
        company: document.getElementById('applyCompany').value,
        coverLetter: document.getElementById('coverLetter').value,
        skills: currentStudent.skills
    };
    
    try {
        const response = await fetch('/api/applications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(application)
        });
        
        if (response.ok) {
            closeModal('applyModal');
            showToast('✅ Application submitted successfully!', 'success');
            document.getElementById('applicationForm').reset();
        }
    } catch (error) {
        showToast('❌ Failed to submit application', 'error');
    }
}

// ============ EVENT LISTENERS ============
function setupEventListeners() {
    // Search functionality
    document.getElementById('searchInput').addEventListener('input', (e) => {
        loadJobs(e.target.value, document.getElementById('filterType').value);
    });
    
    document.getElementById('filterType').addEventListener('change', (e) => {
        loadJobs(document.getElementById('searchInput').value, e.target.value);
    });
    
    // Application form
    document.getElementById('applicationForm').addEventListener('submit', submitApplication);
    
    // Close modals
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// ============ UTILITY FUNCTIONS ============
function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--primary)'};
        color: white;
        border-radius: 12px;
        font-weight: 600;
        z-index: 99999;
        animation: slideIn 0.3s;
        box-shadow: var(--shadow-lg);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}