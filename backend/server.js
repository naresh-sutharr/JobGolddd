import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { readDB, writeDB } from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'jobgold_secret_key_123';

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow profile photos

// Helper to generate IDs
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Middleware to authenticate JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Optional auth helper (for routes visible to guests but enhanced for users)
const getOptionalUser = (req) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

/* --- AUTH ROUTES --- */

app.post('/api/auth/register', async (req, res) => {
  const { name, email, pass, role } = req.body;
  if (!name || !email || !pass || !role) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const db = await readDB();
  const existingUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ message: 'Email already registered' });
  }

  const hashedPassword = await bcrypt.hash(pass, 10);
  const newUser = {
    id: uid(),
    name,
    email: email.toLowerCase(),
    pass: hashedPassword,
    role
  };

  db.users.push(newUser);
  await writeDB(db);

  const token = jwt.sign({ id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({
    token,
    user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, pass } = req.body;
  if (!email || !pass) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const db = await readDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  // Workaround: Support plain-text password for Naresh/admin if it hasn't been hashed (e.g. plain text matching)
  const isMatch = user.pass.startsWith('$2') 
    ? await bcrypt.compare(pass, user.pass)
    : pass === user.pass;

  if (!isMatch) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  const db = await readDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (user) {
    res.json({ message: `Password reset link sent to ${email}. Check your inbox!` });
  } else {
    res.status(404).json({ message: `Email ${email} not found. Please register.` });
  }
});

/* --- JOB ROUTES --- */

app.get('/api/jobs', async (req, res) => {
  const db = await readDB();
  res.json(db.jobs);
});

app.post('/api/jobs', authenticateToken, async (req, res) => {
  const { role, id } = req.user;
  if (role !== 'employer' && role !== 'admin') {
    return res.status(403).json({ message: 'Only Employers and Admins can post jobs' });
  }

  const { title, company, category, salary, location, description } = req.body;
  if (!title || !salary || !category) {
    return res.status(400).json({ message: 'Title, salary, and category are required' });
  }

  const db = await readDB();
  const newJob = {
    id: uid(),
    title,
    company: company || 'Private',
    category,
    salary,
    location: location || '',
    description: description || '',
    created: new Date().toISOString(),
    creatorId: id
  };

  db.jobs.push(newJob);
  await writeDB(db);

  res.status(201).json(newJob);
});

app.put('/api/jobs/:id', authenticateToken, async (req, res) => {
  const { id: userId, role } = req.user;
  const { id } = req.params;
  const { title, company, category, salary, location, description } = req.body;

  const db = await readDB();
  const index = db.jobs.findIndex(j => j.id === id);
  if (index === -1) return res.status(404).json({ message: 'Job not found' });

  const job = db.jobs[index];
  if (job.creatorId !== userId && role !== 'admin') {
    return res.status(403).json({ message: 'Permission Denied: You do not own this job post' });
  }

  const updatedJob = {
    ...job,
    title: title || job.title,
    company: company || job.company,
    category: category || job.category,
    salary: salary || job.salary,
    location: location || job.location,
    description: description || job.description
  };

  db.jobs[index] = updatedJob;
  await writeDB(db);

  res.json(updatedJob);
});

app.delete('/api/jobs/:id', authenticateToken, async (req, res) => {
  const { id: userId, role } = req.user;
  const { id } = req.params;

  const db = await readDB();
  const job = db.jobs.find(j => j.id === id);
  if (!job) return res.status(404).json({ message: 'Job not found' });

  if (job.creatorId !== userId && role !== 'admin') {
    return res.status(403).json({ message: 'Permission Denied: You do not own this job post' });
  }

  db.jobs = db.jobs.filter(j => j.id !== id);
  await writeDB(db);

  res.json({ message: 'Job deleted successfully' });
});

/* --- APPLICATION ROUTES --- */

app.get('/api/applications', authenticateToken, async (req, res) => {
  const { id: userId, role, email } = req.user;
  const db = await readDB();

  if (role === 'admin') {
    return res.json(db.applications);
  } else if (role === 'employer') {
    // Return applications submitted for jobs owned by the employer
    const employerJobIds = db.jobs.filter(j => j.creatorId === userId).map(j => j.id);
    const relevantApps = db.applications.filter(a => employerJobIds.includes(a.jobId));
    return res.json(relevantApps);
  } else if (role === 'jobseeker') {
    // Return applications submitted by the job seeker
    const myApps = db.applications.filter(a => a.email.toLowerCase() === email.toLowerCase());
    return res.json(myApps);
  }

  res.json([]);
});

app.post('/api/applications', authenticateToken, async (req, res) => {
  const { role, email } = req.user;
  if (role !== 'jobseeker' && role !== 'admin') {
    return res.status(403).json({ message: 'Only Job Seekers can apply for jobs' });
  }

  const { jobId, name, phone, skills } = req.body;
  if (!jobId || !name || !phone) {
    return res.status(400).json({ message: 'Job ID, name, and phone number are required' });
  }

  const db = await readDB();
  const job = db.jobs.find(j => j.id === jobId);
  if (!job) return res.status(404).json({ message: 'Job not found' });

  // Double application check
  const isApplied = db.applications.some(a => a.jobId === jobId && a.email.toLowerCase() === email.toLowerCase());
  if (isApplied) {
    return res.status(400).json({ message: 'You have already applied for this job!' });
  }

  const newApp = {
    id: uid(),
    jobId,
    jobTitle: job.title,
    name,
    email: email.toLowerCase(),
    phone,
    skills: skills || '',
    applied: new Date().toISOString()
  };

  db.applications.push(newApp);

  // Set initial status to Submitted
  db.app_status.push({
    id: uid(),
    appId: newApp.id,
    status: 'Submitted',
    date: new Date().toISOString()
  });

  await writeDB(db);

  res.status(201).json(newApp);
});

app.delete('/api/applications/:id', authenticateToken, async (req, res) => {
  const { role } = req.user;
  if (role !== 'admin') {
    return res.status(403).json({ message: 'Only administrators can delete applications' });
  }

  const { id } = req.params;
  const db = await readDB();
  db.applications = db.applications.filter(a => a.id !== id);
  db.app_status = db.app_status.filter(s => s.appId !== id);
  await writeDB(db);

  res.json({ message: 'Application deleted successfully' });
});

app.get('/api/applications/status', authenticateToken, async (req, res) => {
  const db = await readDB();
  res.json(db.app_status);
});

app.post('/api/applications/:id/status', authenticateToken, async (req, res) => {
  const { role, id: userId } = req.user;
  const { id } = req.params;
  const { status } = req.body; // 'Accepted' | 'Rejected' | 'Pending'

  if (role !== 'employer' && role !== 'admin') {
    return res.status(403).json({ message: 'Only Employers and Admins can update application status' });
  }

  const db = await readDB();
  const app = db.applications.find(a => a.id === id);
  if (!app) return res.status(404).json({ message: 'Application not found' });

  const job = db.jobs.find(j => j.id === app.jobId);
  if (!job) return res.status(404).json({ message: 'Associated job not found' });

  if (job.creatorId !== userId && role !== 'admin') {
    return res.status(403).json({ message: 'Permission Denied: You do not own the job associated with this application' });
  }

  const newStatus = {
    id: uid(),
    appId: id,
    status,
    date: new Date().toISOString()
  };

  db.app_status.push(newStatus);
  await writeDB(db);

  res.json(newStatus);
});

/* --- PROFILE ROUTES --- */

app.get('/api/profiles', async (req, res) => {
  const db = await readDB();
  const user = getOptionalUser(req);
  const userId = user ? user.id : null;
  const role = user ? user.role : 'guest';
  const email = user ? user.email.toLowerCase().trim() : '';

  // Filter logic similar to frontend original logic
  const filtered = db.candidate_profiles.filter(p => {
    const isOwnProfile = userId && p.userId === userId;
    const isVerified = p.status === 'Verified';
    const isPending = p.status === 'Pending Verification';
    const isManager = role === 'employer' && p.managerEmail && p.managerEmail.toLowerCase().trim() === email;
    const isAdmin = role === 'admin';

    return isVerified || isOwnProfile || ((isAdmin || isManager) && isPending);
  });

  res.json(filtered);
});

app.post('/api/profiles', authenticateToken, async (req, res) => {
  const { id: userId, email } = req.user;
  const { profileId, name, currentRole, prevCompany, prevRole, prevLocation, managerEmail, experience, photoUrl } = req.body;

  if (!name || !currentRole || !prevCompany || !prevRole || !managerEmail || !experience) {
    return res.status(400).json({ message: 'Please fill in all required fields' });
  }

  const db = await readDB();
  let profiles = db.candidate_profiles;

  const isCreatorProfile = profileId === 'p1' || (profileId === '' && userId === 'p1_creator_id' && email === 'admin@jobgold.com');
  const isEdit = !!profileId;

  let existing = null;
  if (isEdit) {
    existing = profiles.find(p => p.id === profileId);
    if (!existing) return res.status(404).json({ message: 'Profile not found' });
    if (existing.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only edit your own profile' });
    }
  }

  // Resolve the photo string directly before building data structure
  const finalPhoto = photoUrl || (existing ? existing.photoUrl : `https://i.pravatar.cc/150?u=${userId}`);

  const jobHistoryData = {
    name,
    currentRole,
    prevCompany,
    prevRole,
    prevLocation: prevLocation || '',
    managerEmail,
    experience,
    photoUrl: finalPhoto,
    status: isCreatorProfile ? 'Verified' : 'Pending Verification'
  };

  let savedProfile;

  if (isEdit) {
    const idx = profiles.findIndex(p => p.id === profileId);
    savedProfile = {
      ...existing,
      ...jobHistoryData
    };
    profiles[idx] = savedProfile;
  } else {
    // Check if user already has a profile (excluding Naresh creator account overrides)
    const exists = profiles.some(p => p.userId === userId && p.id !== 'p1');
    if (exists && userId !== 'p1_creator_id') {
      return res.status(400).json({ message: 'You have already submitted a job history profile. Edit it instead.' });
    }

    savedProfile = {
      id: uid(),
      userId,
      ...jobHistoryData,
      dateSubmitted: new Date().toISOString()
    };

    profiles.push(savedProfile);
  }

  await writeDB(db);
  res.json(savedProfile);
});

app.delete('/api/profiles/:id', authenticateToken, async (req, res) => {
  const { id: userId, role } = req.user;
  const { id } = req.params;

  if (id === 'p1') {
    return res.status(400).json({ message: 'Creator profile cannot be deleted' });
  }

  const db = await readDB();
  const profile = db.candidate_profiles.find(p => p.id === id);
  if (!profile) return res.status(404).json({ message: 'Profile not found' });

  if (profile.userId !== userId && role !== 'admin') {
    return res.status(403).json({ message: 'You can only delete your own submitted profile' });
  }

  db.candidate_profiles = db.candidate_profiles.filter(p => p.id !== id);
  await writeDB(db);

  res.json({ message: 'Profile deleted successfully' });
});

app.post('/api/profiles/:id/verify', authenticateToken, async (req, res) => {
  const { role, email } = req.user;
  const { id } = req.params;

  const db = await readDB();
  const idx = db.candidate_profiles.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ message: 'Profile not found' });

  const profile = db.candidate_profiles[idx];
  const isManager = role === 'employer' && 
                    profile.managerEmail && 
                    email.toLowerCase().trim() === profile.managerEmail.toLowerCase().trim();

  if (role !== 'admin' && !isManager) {
    return res.status(403).json({ message: 'Access Denied: Only the specified manager or Admin can verify this profile' });
  }

  db.candidate_profiles[idx].status = 'Verified';
  await writeDB(db);

  res.json({ message: 'Profile verified successfully', profile: db.candidate_profiles[idx] });
});

/* --- SAVED JOBS --- */

app.get('/api/saved-jobs', authenticateToken, async (req, res) => {
  const { id: userId } = req.user;
  const db = await readDB();
  const userSaved = db.saved_jobs.filter(sj => sj.userId === userId);
  res.json(userSaved);
});

app.post('/api/saved-jobs/toggle', authenticateToken, async (req, res) => {
  const { id: userId, role } = req.user;
  if (role !== 'jobseeker') {
    return res.status(403).json({ message: 'Only Job Seekers can save jobs' });
  }

  const { jobId } = req.body;
  if (!jobId) return res.status(400).json({ message: 'Job ID is required' });

  const db = await readDB();
  const idx = db.saved_jobs.findIndex(sj => sj.jobId === jobId && sj.userId === userId);

  let saved = false;
  if (idx > -1) {
    // Remove
    db.saved_jobs.splice(idx, 1);
  } else {
    // Add
    db.saved_jobs.push({
      id: uid(),
      jobId,
      userId,
      dateSaved: new Date().toISOString()
    });
    saved = true;
  }

  await writeDB(db);
  res.json({ saved, message: saved ? 'Job saved' : 'Job unsaved' });
});

/* --- HIRE REQUESTS (NOTIFICATIONS) --- */

app.get('/api/hire-requests', authenticateToken, async (req, res) => {
  const { id: userId, role, email } = req.user;
  const db = await readDB();

  // Find candidate profile associated with the current user
  const profile = db.candidate_profiles.find(p => p.userId === userId);
  
  if (role === 'jobseeker' && profile) {
    // Return requests targeting this candidate
    const candidateRequests = db.hire_requests.filter(req => req.candidateId === profile.id);
    return res.json(candidateRequests);
  } else if (role === 'employer') {
    // Return requests sent by this employer
    const sentRequests = db.hire_requests.filter(req => req.employerEmail.toLowerCase() === email.toLowerCase());
    return res.json(sentRequests);
  } else if (role === 'admin') {
    return res.json(db.hire_requests);
  }

  res.json([]);
});

app.post('/api/hire-requests', authenticateToken, async (req, res) => {
  const { role, email, name: employerName } = req.user;
  if (role !== 'employer' && role !== 'admin') {
    return res.status(403).json({ message: 'Only employers and admins can send hire offers' });
  }

  const { candidateId, jobTitle, salary, message } = req.body;
  if (!candidateId || !jobTitle || !salary) {
    return res.status(400).json({ message: 'Candidate ID, job title, and salary are required' });
  }

  const db = await readDB();
  const candidate = db.candidate_profiles.find(p => p.id === candidateId);
  if (!candidate) return res.status(404).json({ message: 'Candidate profile not found' });

  const newRequest = {
    id: uid(),
    candidateId,
    candidateName: candidate.name,
    employerEmail: email,
    employerName,
    jobTitle,
    salary,
    message: message || '',
    date: new Date().toISOString(),
    read: false
  };

  db.hire_requests.push(newRequest);
  await writeDB(db);

  res.status(201).json(newRequest);
});

app.post('/api/hire-requests/:id/respond', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { response } = req.body; // 'Accept' | 'Decline'
  const db = await readDB();

  // Check if target request exists
  const reqIdx = db.hire_requests.findIndex(r => r.id === id);
  if (reqIdx === -1) return res.status(404).json({ message: 'Offer not found' });

  // Optional: check ownership
  // Remove or update requests
  db.hire_requests = db.hire_requests.filter(r => r.id !== id);
  await writeDB(db);

  res.json({ message: `Offer response processed: ${response}` });
});

// Mark notifications as read
app.post('/api/hire-requests/read-all', authenticateToken, async (req, res) => {
  const { id: userId } = req.user;
  const db = await readDB();
  const profile = db.candidate_profiles.find(p => p.userId === userId);
  
  if (profile) {
    db.hire_requests.forEach(req => {
      if (req.candidateId === profile.id) {
        req.read = true;
      }
    });
    await writeDB(db);
  }
  res.json({ message: 'Notifications marked as read' });
});

/* --- ADMIN DANGER ZONE & MANAGEMENT --- */

app.post('/api/admin/create', authenticateToken, async (req, res) => {
  const { role } = req.user;
  if (role !== 'admin') {
    return res.status(403).json({ message: 'Only Administrators can create new admins' });
  }

  const { email, pass } = req.body;
  if (!email || !pass) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const db = await readDB();
  const exists = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (exists) return res.status(400).json({ message: 'User with this email already exists' });

  const hashedPassword = await bcrypt.hash(pass, 10);
  const newAdmin = {
    id: uid(),
    name: 'New Admin',
    email: email.toLowerCase(),
    pass: hashedPassword,
    role: 'admin'
  };

  db.users.push(newAdmin);
  await writeDB(db);

  res.status(201).json({ message: 'Admin account created successfully' });
});

app.post('/api/admin/clear', authenticateToken, async (req, res) => {
  const { role } = req.user;
  if (role !== 'admin') {
    return res.status(403).json({ message: 'Only Administrators can wipe database' });
  }

  const db = await readDB();
  // Clear all except Admin users
  db.jobs = [];
  db.applications = [];
  db.app_status = [];
  // Keep only Naresh suthar (p1) profile and initial dummies for restore
  db.candidate_profiles = db.candidate_profiles.filter(p => p.id === 'p1');
  db.hire_requests = [];
  db.saved_jobs = [];
  
  // Keep only admins in users
  db.users = db.users.filter(u => u.role === 'admin');

  await writeDB(db);
  res.json({ message: 'All transactions and listings cleared. Admins preserved.' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;

