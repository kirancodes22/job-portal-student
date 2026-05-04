// server.js - Complete backend with REST API + WebSocket for real-time features
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// File upload configuration for resumes
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Data paths
const dataDir = path.join(__dirname, 'data');
const usersPath = path.join(dataDir, 'users.json');
const jobsPath = path.join(dataDir, 'jobs.json');
const applicationsPath = path.join(dataDir, 'applications.json');

// Initialize data directory and files
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
['users.json', 'jobs.json', 'applications.json'].forEach(file => {
    if (!fs.existsSync(path.join(dataDir, file))) {
        fs.writeFileSync(path.join(dataDir, file), '[]');
    }
});

// Helper functions
const readData = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const writeData = (filePath, data) => fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

// ============ SKILL MATCHING ALGORITHM ============
function calculateSkillMatch(jobSkills, studentSkills) {
    if (!jobSkills.length) return 0;
    const matched = jobSkills.filter(skill => 
        studentSkills.some(s => s.toLowerCase() === skill.toLowerCase())
    );
    return Math.round((matched.length / jobSkills.length) * 100);
}

function getSkillGaps(jobSkills, studentSkills) {
    return jobSkills.filter(skill => 
        !studentSkills.some(s => s.toLowerCase() === skill.toLowerCase())
    );
}

// ============ API ENDPOINTS ============

// Get all jobs with personalized match scores
app.get('/api/jobs', (req, res) => {
    const jobs = readData(jobsPath);
    const studentSkills = req.query.skills ? req.query.skills.split(',') : [];
    
    const enrichedJobs = jobs.map(job => ({
        ...job,
        matchPercentage: studentSkills.length ? 
            calculateSkillMatch(job.requiredSkills, studentSkills) : null,
        skillGaps: studentSkills.length ? 
            getSkillGaps(job.requiredSkills, studentSkills) : []
    }));
    
    res.json(enrichedJobs);
});

// Post a new job (company side)
app.post('/api/jobs', (req, res) => {
    const jobs = readData(jobsPath);
    const newJob = {
        id: Date.now(),
        ...req.body,
        postedDate: new Date().toISOString(),
        applications: 0,
        status: 'active'
    };
    jobs.push(newJob);
    writeData(jobsPath, jobs);
    
    // Real-time notification to all connected students
    io.emit('newJob', newJob);
    
    res.status(201).json(newJob);
});

// Apply for a job
app.post('/api/applications', (req, res) => {
    const applications = readData(applicationsPath);
    const application = {
        id: Date.now(),
        ...req.body,
        status: 'applied',
        appliedDate: new Date().toISOString(),
        updates: [{
            status: 'applied',
            date: new Date().toISOString(),
            note: 'Application submitted'
        }]
    };
    applications.push(application);
    writeData(applicationsPath, application);
    
    // Update application count on job
    const jobs = readData(jobsPath);
    const jobIndex = jobs.findIndex(j => j.id === req.body.jobId);
    if (jobIndex !== -1) {
        jobs[jobIndex].applications = (jobs[jobIndex].applications || 0) + 1;
        writeData(jobsPath, jobs);
    }
    
    res.status(201).json(application);
});

// Get student applications with kanban data
app.get('/api/applications/:studentId', (req, res) => {
    const applications = readData(applicationsPath);
    const studentApps = applications.filter(app => 
        app.studentId === parseInt(req.params.studentId)
    );
    res.json(studentApps);
});

// Update application status (company side)
app.put('/api/applications/:id/status', (req, res) => {
    const applications = readData(applicationsPath);
    const index = applications.findIndex(a => a.id === parseInt(req.params.id));
    
    if (index !== -1) {
        applications[index].status = req.body.status;
        applications[index].updates.push({
            status: req.body.status,
            date: new Date().toISOString(),
            note: req.body.note || `Status changed to ${req.body.status}`
        });
        writeData(applicationsPath, applications);
        
        // Notify student about status change
        io.emit('statusUpdate', {
            studentId: applications[index].studentId,
            status: req.body.status,
            jobId: applications[index].jobId
        });
        
        res.json(applications[index]);
    } else {
        res.status(404).json({ error: 'Application not found' });
    }
});

// AI Resume Analyzer endpoint
app.post('/api/analyze-resume', upload.single('resume'), (req, res) => {
    // Simulate AI analysis (in production, use NLP libraries)
    const analysis = {
        score: Math.floor(Math.random() * 40) + 60, // 60-100
        strengths: [
            'Good project descriptions',
            'Clear contact information',
            'Quantifiable achievements present'
        ],
        improvements: [
            'Add more industry keywords',
            'Include portfolio links',
            'Tailor objective to specific roles'
        ],
        atsCompatibility: Math.floor(Math.random() * 30) + 70,
        keywordSuggestions: ['Agile', 'React', 'Node.js', 'Team Leadership'],
        formatScore: Math.floor(Math.random() * 20) + 80
    };
    
    res.json(analysis);
});

// Get dashboard statistics
app.get('/api/dashboard/:studentId', (req, res) => {
    const applications = readData(applicationsPath);
    const studentApps = applications.filter(a => 
        a.studentId === parseInt(req.params.studentId)
    );
    
    const stats = {
        total: studentApps.length,
        shortlisted: studentApps.filter(a => a.status === 'shortlisted').length,
        interview: studentApps.filter(a => a.status === 'interview').length,
        offered: studentApps.filter(a => a.status === 'offered').length,
        rejected: studentApps.filter(a => a.status === 'rejected').length,
        successRate: studentApps.length ? 
            Math.round((studentApps.filter(a => a.status === 'offered').length / studentApps.length) * 100) : 0,
        recentUpdates: studentApps
            .flatMap(a => a.updates.map(u => ({...u, jobId: a.jobId, company: a.company})))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5)
    };
    
    res.json(stats);
});

// Submit interview experience
app.post('/api/interview-experiences', (req, res) => {
    const experiences = readData(path.join(dataDir, 'experiences.json'));
    experiences.push({
        id: Date.now(),
        ...req.body,
        date: new Date().toISOString(),
        helpful: 0
    });
    writeData(path.join(dataDir, 'experiences.json'), experiences);
    res.status(201).json({ message: 'Experience shared' });
});

// ============ WEBSOCKET HANDLING ============
io.on('connection', (socket) => {
    console.log('👤 User connected:', socket.id);
    
    socket.on('join', (userId) => {
        socket.join(`user-${userId}`);
        console.log(`User ${userId} joined their room`);
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start server
server.listen(PORT, () => {
    console.log('🚀 Student Job Portal running on http://localhost:' + PORT);
    console.log('📊 Dashboard: http://localhost:' + PORT + '/dashboard.html');
    console.log('📝 Resume Analyzer: http://localhost:' + PORT + '/resume-analyzer.html');
    console.log('🎤 Interview Prep: http://localhost:' + PORT + '/interview-prep.html');
});