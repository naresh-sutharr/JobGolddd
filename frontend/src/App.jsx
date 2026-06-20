import React, { useState, useEffect } from 'react';

// Categories Configuration
const catConfig = {
  'Retail & Shop': { icon: 'fa-bag-shopping', emoji: '🛍️' },
  'Hotel & Food': { icon: 'fa-utensils', emoji: '🍽️' },
  'Driver & Transport': { icon: 'fa-truck-field', emoji: '🚖' },
  'Technician': { icon: 'fa-screwdriver-wrench', emoji: '🛠️' },
  'Delivery': { icon: 'fa-motorcycle', emoji: '📦' },
  'Salon & Beauty': { icon: 'fa-scissors', emoji: '💇' },
  'Office & Admin': { icon: 'fa-laptop-file', emoji: '💼' },
  'Security & Other': { icon: 'fa-shield-halved', emoji: '🛡️' }
};
const cats = Object.keys(catConfig);

const LOGIN_ADMIN_EMAIL = "admin@jobgold.com";
const DISPLAY_CREATOR_EMAIL = "ns680578@gmail.com";

// Base64 helper
const getBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

function App() {
  // --- STATE VARIABLES ---
  const [activeView, setActiveView] = useState('dashboard');
  const [theme, setTheme] = useState(() => localStorage.getItem('jg_theme_v1') || 'dark');
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('jg_session_v3')) || null;
    } catch {
      return null;
    }
  });

  const [toasts, setToasts] = useState([]);
  
  // Data lists synced with backend
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [appStatusList, setAppStatusList] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [hireRequests, setHireRequests] = useState([]);

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAuthWrapperToggled, setIsAuthWrapperToggled] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [applyJobId, setApplyJobId] = useState(null);
  const [hireCandidate, setHireCandidate] = useState(null); // { id, name }
  const [showBellPopup, setShowBellPopup] = useState(false);

  // Search/Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [searchSalaryRange, setSearchSalaryRange] = useState('');
  const [isListening, setIsListening] = useState(false);

  // Form input states
  // Auth Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regRole, setRegRole] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  // Post Job Form
  const [jobFormTitle, setJobFormTitle] = useState('');
  const [jobFormCompany, setJobFormCompany] = useState('');
  const [jobFormCategory, setJobFormCategory] = useState('');
  const [jobFormOtherCategory, setJobFormOtherCategory] = useState('');
  const [jobFormSalary, setJobFormSalary] = useState('');
  const [jobFormLocation, setJobFormLocation] = useState('');
  const [jobFormDescription, setJobFormDescription] = useState('');
  const [editingJobId, setEditingJobId] = useState(null);

  // Apply Job Form
  const [appName, setAppName] = useState('');
  const [appEmail, setAppEmail] = useState('');
  const [appPhone, setAppPhone] = useState('');
  const [appSkills, setAppSkills] = useState('');

  // Send Offer Form
  const [hireJobTitle, setHireJobTitle] = useState('');
  const [hireSalary, setHireSalary] = useState('');
  const [hireMessage, setHireMessage] = useState('');

  // Candidate History Form
  const [histId, setHistId] = useState('');
  const [histName, setHistName] = useState('');
  const [histCurrentRole, setHistCurrentRole] = useState('');
  const [histPhotoFile, setHistPhotoFile] = useState(null);
  const [histPrevCompany, setHistPrevCompany] = useState('');
  const [histPrevRole, setHistPrevRole] = useState('');
  const [histPrevLocation, setHistPrevLocation] = useState('');
  const [histManagerEmail, setHistManagerEmail] = useState('');
  const [histDescription, setHistDescription] = useState('');

  // Creator Profile Edit Form
  const [creatorName, setCreatorName] = useState('');
  const [creatorCurrentRole, setCreatorCurrentRole] = useState('');
  const [creatorPhotoFile, setCreatorPhotoFile] = useState(null);
  const [creatorDescription, setCreatorDescription] = useState('');
  const [isEditingCreator, setIsEditingCreator] = useState(false);

  // Admin settings Form
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');

  // --- API FETCH UTILITY ---
  const apiFetch = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(session?.token ? { 'Authorization': `Bearer ${session.token}` } : {}),
      ...options.headers,
    };
    const response = await fetch(url, {
      ...options,
      headers,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'API request failed');
    }
    return response.json();
  };

  // --- TOAST ALERT ---
  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 7);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // --- INITIAL THEME AND SESSION SYNC ---
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('jg_theme_v1', theme);
  }, [theme]);

  useEffect(() => {
    if (session) {
      localStorage.setItem('jg_session_v3', JSON.stringify(session));
    } else {
      localStorage.removeItem('jg_session_v3');
    }
    // Refresh relevant data on session change
    loadData();
  }, [session]);

  // --- LOAD APP DATA ---
  const loadData = async () => {
    try {
      // Public endpoints
      const fetchedJobs = await apiFetch('/api/jobs');
      setJobs(fetchedJobs);

      const fetchedProfiles = await apiFetch('/api/profiles');
      setProfiles(fetchedProfiles);

      // Authenticated endpoints
      if (session?.token) {
        const fetchedApps = await apiFetch('/api/applications');
        setApplications(fetchedApps);

        const fetchedAppStatus = await apiFetch('/api/applications/status');
        setAppStatusList(fetchedAppStatus);

        const fetchedSaved = await apiFetch('/api/saved-jobs');
        setSavedJobs(fetchedSaved);

        const fetchedOffers = await apiFetch('/api/hire-requests');
        setHireRequests(fetchedOffers);
      } else {
        setApplications([]);
        setAppStatusList([]);
        setSavedJobs([]);
        setHireRequests([]);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  // Load on mount
  useEffect(() => {
    loadData();
  }, []);

  // --- COMPUTE UNREAD NOTIFICATIONS ---
  const getUnreadNotifications = () => {
    if (session?.user?.role !== 'jobseeker') return [];
    const myProfile = profiles.find(p => p.userId === session.user.id);
    if (!myProfile) return [];
    return hireRequests.filter(req => req.candidateId === myProfile.id && !req.read);
  };
  const unreadCount = getUnreadNotifications().length;

  // --- THEME TOGGLE ---
  const handleToggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // --- AUTH ACTIONS ---
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPass) {
      return showToast('Email and Password are required.', 'error');
    }
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, pass: loginPass })
      });
      setSession(data);
      setIsAuthModalOpen(false);
      setLoginEmail('');
      setLoginPass('');
      showToast(`Welcome back, ${data.user.name}`, 'success');
      setActiveView('dashboard');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPass || !regRole) {
      return showToast('Please fill all fields (Username, Email, Password, and Role).', 'error');
    }
    try {
      const data = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name: regName, email: regEmail, pass: regPass, role: regRole })
      });
      showToast('Account Created Successfully! Please Log In.', 'success');
      setIsAuthWrapperToggled(false); // Switch panel back to signin
      setRegName('');
      setRegEmail('');
      setRegPass('');
      setRegRole('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleLogout = () => {
    setSession(null);
    setActiveView('dashboard');
    showToast('Logged Out Successfully', 'success');
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      return showToast('Please enter your email.', 'error');
    }
    try {
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail })
      });
      showToast(res.message, 'success');
      setIsForgotModalOpen(false);
      setIsAuthModalOpen(true);
      setIsAuthWrapperToggled(false);
      setForgotEmail('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // --- JOB ACTIONS ---
  const handlePostJob = async (e) => {
    e.preventDefault();
    if (!jobFormTitle || !jobFormSalary || !jobFormCategory) {
      return showToast('Title, Salary, and Category are required.', 'error');
    }

    let finalCategory = jobFormCategory;
    if (jobFormCategory === 'Other') {
      if (!jobFormOtherCategory) {
        return showToast('Please specify the custom category.', 'error');
      }
      finalCategory = jobFormOtherCategory;
    }

    try {
      const bodyData = {
        title: jobFormTitle,
        company: jobFormCompany || 'Private',
        category: finalCategory,
        salary: jobFormSalary,
        location: jobFormLocation,
        description: jobFormDescription
      };

      if (editingJobId) {
        await apiFetch(`/api/jobs/${editingJobId}`, {
          method: 'PUT',
          body: JSON.stringify(bodyData)
        });
        showToast('Job Updated', 'success');
      } else {
        await apiFetch('/api/jobs', {
          method: 'POST',
          body: JSON.stringify(bodyData)
        });
        showToast('Job Posted Successfully', 'success');
      }

      // Reset form
      setJobFormTitle('');
      setJobFormCompany('');
      setJobFormCategory('');
      setJobFormOtherCategory('');
      setJobFormSalary('');
      setJobFormLocation('');
      setJobFormDescription('');
      setEditingJobId(null);
      
      // Reload and redirect
      loadData();
      setActiveView('jobs');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const startEditJob = (job) => {
    setEditingJobId(job.id);
    setJobFormTitle(job.title);
    setJobFormCompany(job.company);
    setJobFormCategory(cats.includes(job.category) ? job.category : 'Other');
    setJobFormOtherCategory(cats.includes(job.category) ? '' : job.category);
    setJobFormSalary(job.salary);
    setJobFormLocation(job.location);
    setJobFormDescription(job.description);
    setActiveView('add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteJob = async (id) => {
    if (!confirm('Delete this job post permanently?')) return;
    try {
      await apiFetch(`/api/jobs/${id}`, {
        method: 'DELETE'
      });
      showToast('Job Deleted', 'success');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // --- APPLICATION ACTIONS ---
  const handleApplyJob = async () => {
    if (!appName || !appPhone) {
      return showToast('Please enter Name and Phone Number.', 'error');
    }
    try {
      await apiFetch('/api/applications', {
        method: 'POST',
        body: JSON.stringify({
          jobId: applyJobId,
          name: appName,
          phone: appPhone,
          skills: appSkills
        })
      });
      showToast('Application Sent!', 'success');
      setApplyJobId(null);
      setAppName('');
      setAppPhone('');
      setAppSkills('');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRemoveApp = async (id) => {
    if (!confirm('Admin Action: Delete application?')) return;
    try {
      await apiFetch(`/api/applications/${id}`, {
        method: 'DELETE'
      });
      showToast('Application Deleted', 'success');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateAppStatus = async (appId, status, applicantName) => {
    if (!confirm(`Are you sure you want to ${status.toUpperCase()} this candidate?`)) return;
    try {
      await apiFetch(`/api/applications/${appId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status })
      });
      showToast(`Application ${status.toUpperCase()} for ${applicantName}!`, status === 'Accepted' ? 'success' : 'error');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // --- SAVED JOBS ACTIONS ---
  const handleToggleSaveJob = async (jobId) => {
    if (!session || session.user.role !== 'jobseeker') {
      return showToast('Please login as Job Seeker to save jobs.', 'error');
    }
    try {
      const res = await apiFetch('/api/saved-jobs/toggle', {
        method: 'POST',
        body: JSON.stringify({ jobId })
      });
      showToast(res.message, res.saved ? 'success' : 'info');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // --- HIRE OFFER ACTIONS ---
  const handleSendOffer = async () => {
    if (!hireJobTitle || !hireSalary) {
      return showToast('Please enter Job Title and Salary.', 'error');
    }
    try {
      await apiFetch('/api/hire-requests', {
        method: 'POST',
        body: JSON.stringify({
          candidateId: hireCandidate.id,
          jobTitle: hireJobTitle,
          salary: hireSalary,
          message: hireMessage
        })
      });
      showToast(`Offer sent to ${hireCandidate.name}!`, 'success');
      setHireCandidate(null);
      setHireJobTitle('');
      setHireSalary('');
      setHireMessage('');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRespondOffer = async (id, response) => {
    try {
      await apiFetch(`/api/hire-requests/${id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ response })
      });
      showToast(`Offer ${response}ed successfully`, 'success');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // --- CANDIDATE PROFILE ACTIONS ---
  const handleSubmitHistory = async (e) => {
    e.preventDefault();
    if (!histName || !histCurrentRole || !histPrevCompany || !histPrevRole || !histManagerEmail || !histDescription) {
      return showToast('Please fill all required fields.', 'error');
    }

    let photoBase64 = null;
    if (histPhotoFile) {
      if (histPhotoFile.size > 5 * 1024 * 1024) {
        return showToast('Photo size must be less than 5MB.', 'error');
      }
      try {
        photoBase64 = await getBase64(histPhotoFile);
      } catch {
        showToast('Error parsing photo file.', 'error');
      }
    }

    try {
      await apiFetch('/api/profiles', {
        method: 'POST',
        body: JSON.stringify({
          profileId: histId,
          name: histName,
          currentRole: histCurrentRole,
          prevCompany: histPrevCompany,
          prevRole: histPrevRole,
          prevLocation: histPrevLocation,
          managerEmail: histManagerEmail,
          experience: histDescription,
          photoUrl: photoBase64
        })
      });

      showToast(histId ? 'Profile Updated Successfully!' : 'Job History Submitted for Verification!', 'success');
      
      // Reset history form
      setHistId('');
      setHistName('');
      setHistCurrentRole('');
      setHistPhotoFile(null);
      setHistPrevCompany('');
      setHistPrevRole('');
      setHistPrevLocation('');
      setHistManagerEmail('');
      setHistDescription('');
      
      loadData();
      setActiveView('profiles');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const startEditProfile = (profile) => {
    if (profile.id === 'p1') {
      // Creator Edit
      setCreatorName(profile.name);
      setCreatorCurrentRole(profile.currentRole);
      setCreatorDescription(profile.experience);
      setIsEditingCreator(true);
      setActiveView('about-me');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setHistId(profile.id);
      setHistName(profile.name);
      setHistCurrentRole(profile.currentRole);
      setHistPrevCompany(profile.prevCompany);
      setHistPrevRole(profile.prevRole);
      setHistPrevLocation(profile.prevLocation || '');
      setHistManagerEmail(profile.managerEmail || '');
      setHistDescription(profile.experience);
      setActiveView('submit-history');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDeleteProfile = async (id) => {
    if (id === 'p1') {
      return showToast('Creator profile cannot be deleted.', 'error');
    }
    if (!confirm('Are you sure you want to delete this profile?')) return;
    try {
      await apiFetch(`/api/profiles/${id}`, {
        method: 'DELETE'
      });
      showToast('Profile deleted successfully', 'success');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleVerifyProfile = async (id, name) => {
    try {
      const res = await apiFetch(`/api/profiles/${id}/verify`, {
        method: 'POST'
      });
      showToast(res.message, 'success');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // --- CREATOR PROFILE ACTIONS ---
  const handleUpdateCreatorProfile = async (e) => {
    e.preventDefault();
    if (!creatorName || !creatorCurrentRole || !creatorDescription) {
      return showToast('Please fill all required fields.', 'error');
    }

    let photoBase64 = null;
    if (creatorPhotoFile) {
      if (creatorPhotoFile.size > 5 * 1024 * 1024) {
        return showToast('Photo size must be less than 5MB.', 'error');
      }
      try {
        photoBase64 = await getBase64(creatorPhotoFile);
      } catch {
        showToast('Error processing creator photo.', 'error');
      }
    }

    try {
      await apiFetch('/api/profiles', {
        method: 'POST',
        body: JSON.stringify({
          profileId: 'p1',
          name: creatorName,
          currentRole: creatorCurrentRole,
          prevCompany: 'JobGold Portal',
          prevRole: 'Creator',
          managerEmail: DISPLAY_CREATOR_EMAIL,
          experience: creatorDescription,
          photoUrl: photoBase64
        })
      });
      showToast('Creator Profile Updated Successfully!', 'success');
      setIsEditingCreator(false);
      setCreatorPhotoFile(null);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // --- ADMIN ACTIONS ---
  const handleCreateAdmin = async () => {
    if (!adminEmail || !adminPass) {
      return showToast('Email and Password are required.', 'error');
    }
    try {
      await apiFetch('/api/admin/create', {
        method: 'POST',
        body: JSON.stringify({ email: adminEmail, pass: adminPass })
      });
      showToast('New Admin Account Created Successfully!', 'success');
      setAdminEmail('');
      setAdminPass('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleClearAllData = async () => {
    if (!confirm('DANGER: Delete ALL jobs, applications, profiles, and hire requests? This action cannot be undone.')) return;
    try {
      const res = await apiFetch('/api/admin/clear', { method: 'POST' });
      showToast(res.message, 'error');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // --- PDF DOWNLOAD SIMULATION ---
  const handleDownloadApp = (app) => {
    const job = jobs.find(x => x.id === app.jobId);
    const content = `
        <div style="font-family: Arial, sans-serif; padding: 30px; border: 5px solid #d4af37; max-width: 650px; margin: 0 auto; box-shadow: 0 0 25px rgba(212,175,55,0.4); background: #ffffff; color: #1a1a1a;">
            <div style="text-align: center; border-bottom: 2px solid #d4af37; padding-bottom: 15px; margin-bottom: 20px;">
                <div style="margin-top: 5px; font-size: 36px; color: #d4af37; font-family: 'Playfair Display', serif; font-weight: 800;"><i class="fa-solid fa-crown"></i> JobGold</div>
                <h1 style="color: #1a1a1a; margin: 5px 0 0; font-family: 'Playfair Display', serif; font-size: 24px;">ELITE JOB APPLICATION</h1>
            </div>
            
            <h3 style="color: #d4af37; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 15px; font-size: 18px;">Job Details</h3>
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr><td style="padding: 5px 0; width: 30%; font-weight: bold;">Job Title:</td><td style="padding: 5px 0;">${app.jobTitle}</td></tr>
                <tr><td style="padding: 5px 0; width: 30%; font-weight: bold;">Company:</td><td style="padding: 5px 0;">${job ? job.company : 'Unknown'}</td></tr>
                <tr><td style="padding: 5px 0; width: 30%; font-weight: bold;">Location:</td><td style="padding: 5px 0;">${job ? job.location : 'N/A'}</td></tr>
            </table>

            <h3 style="color: #d4af37; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 30px; margin-bottom: 15px; font-size: 18px;">Candidate Contact</h3>
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr><td style="padding: 5px 0; width: 30%; font-weight: bold;">Candidate Name:</td><td style="padding: 5px 0;">${app.name}</td></tr>
                <tr><td style="padding: 5px 0; width: 30%; font-weight: bold;">Email:</td><td style="padding: 5px 0;">${app.email}</td></tr>
                <tr><td style="padding: 5px 0; width: 30%; font-weight: bold;">Phone:</td><td style="padding: 5px 0;">${app.phone}</td></tr>
                <tr><td style="padding: 5px 0; width: 30%; font-weight: bold;">Applied On:</td><td style="padding: 5px 0;">${new Date(app.applied).toLocaleDateString()}</td></tr>
            </table>

            <h3 style="color: #d4af37; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 30px; margin-bottom: 15px; font-size: 18px;">Skills & Cover Note</h3>
            <div style="border: 1px solid #eee; padding: 15px; background: #f9f9f9; white-space: pre-wrap; font-size: 13px; line-height: 1.6;">
                ${app.skills || 'Candidate provided no detailed note.'}
            </div>

            <p style="text-align: center; margin-top: 40px; font-size: 10px; color: #aaa;">
                Application ID: ${app.id} - This document is digitally verified.
            </p>
        </div>
    `;

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JobGold_Application_${app.name.replace(/\s/g, '_')}_${app.jobTitle.replace(/\s/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloading Elite PDF for ${app.name} (${app.jobTitle})...`, 'success');
  };

  // --- CONTACT CANDIDATE SIMULATION ---
  const handleContactCandidate = (type, value) => {
    if (type === 'call') {
      showToast(`📞 Initiating call to: ${value} (Simulated)`, 'info');
    } else {
      showToast(`💬 Opening chat window with: ${value} (Simulated)`, 'info');
    }
  };

  // --- VOICE SEARCH SIMULATION ---
  const handleVoiceSearch = () => {
    if (!isListening) {
      setIsListening(true);
      setSearchQuery('');
      showToast('🎙️ Voice Search Activated! Speak your job title or location now...', 'info');
    } else {
      setIsListening(false);
      showToast('Processing voice command...', 'info');
      setTimeout(() => {
        const query = 'Chef job in Dhaba';
        setSearchQuery(query);
        showToast(`🔍 Searching for: "${query}"`, 'success');
      }, 1500);
    }
  };

  // --- DYNAMIC FILTERS ---
  const getFilteredJobs = () => {
    const search = searchQuery.trim().toLowerCase();
    const category = searchCategory.trim();
    
    let minSalary = 0;
    let maxSalary = Infinity;
    if (searchSalaryRange) {
      const parts = searchSalaryRange.split('-').map(s => parseInt(s));
      minSalary = parts[0];
      maxSalary = parts[1];
    }

    return jobs.filter(j => {
      const salary = parseInt(j.salary);
      const matchesSearch = search === '' ||
        j.title.toLowerCase().includes(search) ||
        j.description.toLowerCase().includes(search) ||
        j.location.toLowerCase().includes(search) ||
        j.company.toLowerCase().includes(search);

      const matchesCategory = category === '' || j.category === category;
      const matchesSalary = salary >= minSalary && salary <= maxSalary;

      return matchesSearch && matchesCategory && matchesSalary;
    });
  };

  // --- NOTIFICATION CLICK (MARK READ) ---
  const handleBellClick = async () => {
    if (!session || session.user.role !== 'jobseeker') {
      return showToast('Please login as Job Seeker to view notifications.', 'error');
    }

    if (showBellPopup) {
      setShowBellPopup(false);
    } else {
      setShowBellPopup(true);
      // Mark read on click
      try {
        await apiFetch('/api/hire-requests/read-all', { method: 'POST' });
        loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // --- PREPARE FORMS ON TRANSITIONS ---
  const handleNavClick = (viewName) => {
    setActiveView(viewName);
    setShowBellPopup(false);

    if (viewName === 'add') {
      if (!session || (session.user.role !== 'employer' && session.user.role !== 'admin')) {
        showToast('Employers only! Please login as Employer.', 'error');
        setActiveView('dashboard');
      } else {
        setEditingJobId(null);
        setJobFormTitle('');
        setJobFormCompany('');
        setJobFormCategory('');
        setJobFormOtherCategory('');
        setJobFormSalary('');
        setJobFormLocation('');
        setJobFormDescription('');
      }
    }

    if (viewName === 'submit-history') {
      if (!session || (session.user.role !== 'jobseeker' && session.user.role !== 'admin')) {
        showToast('Please login as a Job Seeker or Admin to share job history.', 'error');
        setActiveView('dashboard');
      } else {
        const existing = profiles.find(p => p.userId === session.user.id);
        if (existing) {
          setHistId(existing.id);
          setHistName(existing.name || session.user.name || '');
          setHistCurrentRole(existing.currentRole || '');
          setHistPrevCompany(existing.prevCompany || '');
          setHistPrevRole(existing.prevRole || '');
          setHistPrevLocation(existing.prevLocation || '');
          setHistManagerEmail(existing.managerEmail || '');
          setHistDescription(existing.experience || '');
        } else {
          setHistId('');
          setHistName(session.user.name || '');
          setHistCurrentRole('');
          setHistPrevCompany('');
          setHistPrevRole('');
          setHistPrevLocation('');
          setHistManagerEmail('');
          setHistDescription('');
        }
      }
    }
  };

  // --- RENDER APPLICATION RECEIVED ---
  const renderEmployerAppsList = () => {
    const relevantJobIds = jobs.filter(j => session?.user?.role === 'admin' || j.creatorId === session?.user?.id).map(j => j.id);
    
    // Filter to show ONLY Submitted/Pending application statuses
    const pendingApps = applications.filter(a => {
      const isRelevant = relevantJobIds.includes(a.jobId);
      if (!isRelevant) return false;
      
      const appStatuses = appStatusList.filter(s => s.appId === a.id)
                                      .sort((x, y) => new Date(y.date) - new Date(x.date));
      const latest = appStatuses[0];
      return !latest || latest.status === 'Submitted' || latest.status === 'Pending';
    }).slice().reverse();

    if (pendingApps.length === 0) {
      return <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>No pending applications requiring review.</div>;
    }

    return pendingApps.map(a => {
      return (
        <div key={a.id} className="job">
          <div style={{ flex: 1 }}>
            <h3 style={{ color: 'var(--text-main)' }}>
              <i className="fa-solid fa-user-check" style={{ color: 'var(--gold)' }}></i> Candidate: {a.name}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '5px' }}>Applied for: <strong>{a.jobTitle}</strong></p>
            <div className="meta" style={{ marginTop: '8px', alignItems: 'center' }}>
              <span title="Email"><i className="fa-solid fa-envelope" style={{ color: '#00d4ff' }}></i> {a.email}</span>
              <span title="Phone"><i className="fa-solid fa-phone" style={{ color: '#00cc66' }}></i> {a.phone}</span>
            </div>
            <p style={{ fontSize: '13px', marginTop: '12px', lineHeight: 1.5, color: 'var(--muted)' }}>
              Skills/Note: {a.skills || 'N/A'}
            </p>
            <p style={{ fontSize: '11px', marginTop: '8px', color: 'var(--muted)' }}>
              Received On: {new Date(a.applied).toLocaleDateString()} | Status: <span style={{ color: 'var(--gold)', fontWeight: 700 }}>Pending Review</span>
            </p>
          </div>
          <div className="right" style={{ justifyContent: 'center' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <button className="action-btn" title="Call Candidate" onClick={() => handleContactCandidate('call', a.phone)}>
                <i className="fa-solid fa-phone" style={{ color: 'var(--green)' }}></i>
              </button>
              <button className="action-btn" title="Chat Candidate" onClick={() => handleContactCandidate('chat', a.phone)}>
                <i className="fa-solid fa-comment" style={{ color: '#00d4ff' }}></i>
              </button>
            </div>
            <button className="btn" style={{ borderColor: '#00d4ff', color: '#00d4ff', width: '100%' }} onClick={() => handleDownloadApp(a)} title="Download Full Application Form">
              <i className="fa-solid fa-file-pdf"></i> Download PDF
            </button>
            <div className="action-row" style={{ marginTop: '10px', justifyContent: 'space-between', width: '100%' }}>
              {session?.user?.role === 'admin' && (
                <button className="action-btn del" onClick={() => handleRemoveApp(a.id)} title="Admin Delete Application">
                  <i className="fa-solid fa-trash-can"></i>
                </button>
              )}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn hire-btn" onClick={() => handleUpdateAppStatus(a.id, 'Accepted', a.name)} style={{ background: 'var(--green)', color: '#000' }}>Hire</button>
                <button className="btn profile-del-btn" onClick={() => handleUpdateAppStatus(a.id, 'Rejected', a.name)} style={{ marginLeft: 0 }}>Reject</button>
              </div>
            </div>
          </div>
        </div>
      );
    });
  };

  // --- RENDER MY APPLICATIONS ---
  const renderJobseekerAppsList = () => {
    const myApps = applications.filter(a => session?.user?.role === 'admin' || a.email.toLowerCase() === session?.user?.email.toLowerCase()).slice().reverse();

    if (myApps.length === 0) {
      return <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>You haven't applied for any jobs yet. Start exploring our Elite Listings!</div>;
    }

    return myApps.map(a => {
      const statuses = appStatusList.filter(s => s.appId === a.id).sort((x, y) => new Date(y.date) - new Date(x.date));
      const status = statuses[0] ? statuses[0].status : 'Submitted';

      const status1Class = (status === 'Submitted' || status === 'Pending' || status === 'Accepted' || status === 'Rejected') ? 'completed' : '';
      const status2Class = (status === 'Pending' || status === 'Accepted') ? 'active' : '';
      const status3Class = (status === 'Accepted') ? 'completed' : (status === 'Rejected') ? 'rejected' : '';
      const decisionText = status === 'Accepted' ? 'Hired/Accepted' : status === 'Rejected' ? 'Rejected' : 'Hiring Decision';

      return (
        <div key={a.id} className="job">
          <div style={{ flex: 1 }}>
            <h3 style={{ color: 'var(--text-main)' }}><i className="fa-solid fa-file-invoice"></i> Applied for: {a.jobTitle}</h3>
            <p style={{ fontSize: '13px', marginTop: '12px', lineHeight: 1.5, color: 'var(--muted)' }}>
              Skills/Note: {a.skills || 'N/A'}
            </p>
            <div className="status-flow">
              <span className={`status-step ${status1Class}`}><i className="fa-solid fa-file-export"></i> Submitted</span>
              <span className="flow-arrow">&gt;</span>
              <span className={`status-step ${status2Class}`}><i className="fa-solid fa-clock"></i> Pending Review</span>
              <span className="flow-arrow">&gt;</span>
              <span className={`status-step ${status3Class}`}><i className="fa-solid fa-handshake-angle"></i> {decisionText}</span>
            </div>
            <p style={{ fontSize: '11px', marginTop: '8px', color: 'var(--muted)' }}>
              Applied On: {new Date(a.applied).toLocaleDateString()}
            </p>
          </div>
          <div className="right" style={{ justifyContent: 'center' }}>
            <button className="btn" style={{ borderColor: '#00d4ff', color: '#00d4ff' }} onClick={() => handleDownloadApp(a)} title="Download Application Form">
              <i className="fa-solid fa-file-pdf"></i> Download PDF
            </button>
          </div>
        </div>
      );
    });
  };

  // --- ESCAPE HTML ---
  const escapeHtml = (text) => {
    if (!text) return '';
    return text.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  };

  const getJobCategoryIcon = (category) => {
    const conf = catConfig[category] || { icon: 'fa-tag', emoji: '' };
    return conf.icon;
  };

  // Check if job is saved by current user
  const isJobSaved = (jobId) => {
    return savedJobs.some(sj => sj.jobId === jobId);
  };

  // Check if current user has already applied for this job
  const hasApplied = (jobId) => {
    return applications.some(a => a.jobId === jobId && a.email.toLowerCase() === session?.user?.email.toLowerCase());
  };

  // --- SHARED JOBS LIST COMPONENT ---
  const renderJobsList = (jobsToRender) => {
    if (jobsToRender.length === 0) {
      return <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>No jobs found matching your criteria.</div>;
    }

    const isAdmin = session?.user?.role === 'admin';
    const isEmployer = session?.user?.role === 'employer';
    const isJobseeker = session?.user?.role === 'jobseeker';

    return jobsToRender.map(j => {
      const isJobOwner = j.creatorId === session?.user?.id;
      const isSaved = isJobSaved(j.id);
      const isApplied = hasApplied(j.id);

      let actionButtons = '';
      if (isAdmin || (isEmployer && isJobOwner)) {
        actionButtons = (
          <div className="action-row">
            <button className="action-btn edit" onClick={() => startEditJob(j)} title="Edit Job"><i className="fa-solid fa-pen-to-square"></i></button>
            <button className="action-btn del" onClick={() => handleDeleteJob(j.id)} title="Delete Job"><i className="fa-solid fa-trash-can"></i></button>
          </div>
        );
      } else if (isJobseeker || !session) {
        actionButtons = (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {isJobseeker && (
              <i 
                className={`fa-solid fa-heart like-job-icon ${isSaved ? 'liked' : 'unliked'}`}
                onClick={() => handleToggleSaveJob(j.id)}
                title={isSaved ? 'Remove from Saved' : 'Save Job'}
              ></i>
            )}
            {isJobseeker && isApplied ? (
              <button className="btn" style={{ marginTop: 'auto', background: 'var(--green)', color: '#000', border: 'none' }} disabled>
                Applied <i className="fa-solid fa-check"></i>
              </button>
            ) : (
              <button 
                className="btn" 
                style={{ marginTop: 'auto', borderColor: 'var(--gold)', color: 'var(--gold)' }} 
                onClick={() => {
                  if (!session) {
                    showToast('Please login as Job Seeker to apply for jobs.', 'error');
                  } else {
                    setApplyJobId(j.id);
                    setAppName(session.user.name || '');
                    setAppEmail(session.user.email || '');
                  }
                }}
              >
                Apply Now
              </button>
            )}
          </div>
        );
      } else {
        actionButtons = <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: 'auto' }}>Employer view</div>;
      }

      const categoryEmoji = catConfig[j.category]?.emoji || '';
      const categoryIcon = getJobCategoryIcon(j.category);

      return (
        <div key={j.id} className="job">
          <div style={{ flex: 1 }}>
            <h3>{j.title}</h3>
            <div className="meta">
              <span title="Company"><i className="fa-solid fa-building"></i> {j.company}</span>
              <span title="Location"><i className="fa-solid fa-location-dot" style={{ color: '#00d4ff' }}></i> {j.location}</span>
              <span title="Category"><i className={`fa-solid ${categoryIcon}`} style={{ color: '#e91e63' }}></i> {categoryEmoji} {j.category}</span>
            </div>
            <p style={{ fontSize: '13px', marginTop: '12px', lineHeight: 1.5, color: 'var(--muted)' }}>
              {j.description.slice(0, 150)}...
            </p>
          </div>
          <div className="right">
            <div className="pill">₹{j.salary}</div>
            {actionButtons}
          </div>
        </div>
      );
    });
  };

  return (
    <>
      {/* Toast Alert Container */}
      <div id="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <i className={`fa-solid ${t.type === 'success' ? 'fa-check-circle' : t.type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}`}></i>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Top Navigation Bar */}
      <div className="topnav">
        <div className="brand" onClick={() => setActiveView('dashboard')}>
          <div className="brandLogo"><i className="fa-solid fa-crown"></i></div>
          <div>
            <div className="brandTitle">JobGold</div>
            <div className="brand-tagline">✨ ELITE HIRING PARTNER</div>
          </div>
        </div>

        <div className="navlinks" id="topLinks">
          <button className={activeView === 'dashboard' ? 'active' : ''} onClick={() => handleNavClick('dashboard')}><i className="fa-solid fa-gauge-high"></i> Dashboard</button>
          <button className={activeView === 'jobs' ? 'active' : ''} onClick={() => handleNavClick('jobs')}><i className="fa-solid fa-briefcase"></i> Browse Jobs</button>
          
          {session && session.user.role === 'jobseeker' && (
            <button 
              className={activeView === 'notifications' ? 'active' : ''} 
              id="notificationBtn" 
              onClick={handleBellClick}
              style={{ position: 'relative' }}
            >
              <i className="fa-solid fa-bell"></i> Notifications
              {unreadCount > 0 && <span id="notificationCount" className="notification-count">{unreadCount}</span>}
            </button>
          )}
        </div>

        {/* Bell Notifications Dropdown Popup */}
        {showBellPopup && (
          <div id="notification-popup" style={{ display: 'flex' }}>
            <h4 style={{ margin: '0 0 10px 0', color: 'var(--gold-light)', fontSize: '16px' }}>Hire Notifications</h4>
            <div id="notificationList">
              {hireRequests.length === 0 ? (
                <div className="no-notifications">No new hire requests.</div>
              ) : (
                hireRequests.slice().reverse().slice(0, 5).map(req => (
                  <div key={req.id} className="notification-item" style={{ background: !req.read ? 'rgba(212,175,55,0.1)' : 'transparent' }}>
                    {!req.read && <i className="fa-solid fa-circle" style={{ fontSize: '8px', color: 'var(--red)', marginRight: '5px' }}></i>}
                    New Offer: <strong>{req.jobTitle}</strong> (₹{req.salary}) from {req.employerName}.
                  </div>
                ))
              )}
              {hireRequests.length > 5 && (
                <div className="notification-item" style={{ textAlign: 'center' }}>
                  <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('notifications'); setShowBellPopup(false); }} style={{ color: 'var(--gold)' }}>
                    View All {hireRequests.length} Notifications
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="spacer"></div>

        <div className="top-actions" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button id="themeToggle" onClick={handleToggleTheme} title="Toggle Light/Dark Mode">
            <i className={`fa-solid ${theme === 'light' ? 'fa-moon' : 'fa-sun'}`} id="themeIcon"></i>
          </button>

          {!session ? (
            <div id="guestNav" style={{ display: 'flex', gap: '10px' }}>
              <button className="btn" onClick={() => { setIsAuthModalOpen(true); setIsAuthWrapperToggled(false); }}><i className="fa-solid fa-arrow-right-to-bracket"></i> Login</button>
              <button className="btn" onClick={() => { setIsAuthModalOpen(true); setIsAuthWrapperToggled(true); }}>Register</button>
            </div>
          ) : (
            <div id="userNav" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <div style={{ textAlign: 'right', lineHeight: '1.2' }}>
                <div id="userGreeting" className="user-glam-name">{session.user.name}</div>
                <div id="userRoleDisplay" style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {session.user.role === 'admin' || session.user.id === 'p1_creator_id' ? 'Creator' : session.user.role}
                </div>
              </div>
              <button className="btn logout-btn" onClick={handleLogout}>
                <i className="fa-solid fa-power-off"></i> <span>LOGOUT</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Wrapper Layout */}
      <div className="app">
        <div className="layout">
          {/* Sidebar Navigation */}
          <aside className="sidebar" id="sidebar">
            <nav className="nav">
              <button className={activeView === 'dashboard' ? 'active' : ''} onClick={() => handleNavClick('dashboard')}><i className="fa-solid fa-gauge-high" style={{ color: 'var(--gold)' }}></i> Dashboard</button>
              
              {session && (session.user.role === 'employer' || session.user.role === 'admin') && (
                <button className={activeView === 'add' ? 'active' : ''} onClick={() => handleNavClick('add')}><i className="fa-solid fa-circle-plus" style={{ color: '#4caf50' }}></i> Post New Job</button>
              )}

              <button className={activeView === 'jobs' ? 'active' : ''} onClick={() => handleNavClick('jobs')}><i className="fa-solid fa-list-check" style={{ color: '#2196f3' }}></i> All Active Jobs</button>
              
              {session && (session.user.role === 'employer' || session.user.role === 'admin') && (
                <button className={activeView === 'employer-apps' ? 'active' : ''} onClick={() => handleNavClick('employer-apps')}><i className="fa-solid fa-handshake-angle" style={{ color: '#9c27b0' }}></i> Applications Received</button>
              )}

              {session && (session.user.role === 'jobseeker' || session.user.role === 'admin') && (
                <button className={activeView === 'jobseeker-apps' ? 'active' : ''} onClick={() => handleNavClick('jobseeker-apps')}><i className="fa-solid fa-file-invoice" style={{ color: '#2196f3' }}></i> My Job Applications</button>
              )}

              <button className={activeView === 'profiles' ? 'active' : ''} onClick={() => handleNavClick('profiles')}><i className="fa-solid fa-user-gear" style={{ color: 'var(--gold)' }}></i> Candidate Profiles</button>
              
              {session && (session.user.role === 'jobseeker' || session.user.role === 'admin') && (
                <button className={activeView === 'submit-history' ? 'active' : ''} onClick={() => handleNavClick('submit-history')}><i className="fa-solid fa-clock-rotate-left" style={{ color: '#64b5f6' }}></i> Share Job History</button>
              )}

              {session && (session.user.role === 'jobseeker' || session.user.role === 'admin') && (
                <button className={activeView === 'saved-jobs' ? 'active' : ''} onClick={() => handleNavClick('saved-jobs')}><i className="fa-solid fa-heart" style={{ color: 'var(--red)' }}></i> Saved Jobs</button>
              )}

              <button className={activeView === 'map' ? 'active' : ''} onClick={() => handleNavClick('map')}><i className="fa-solid fa-map-location-dot" style={{ color: '#00d4ff' }}></i> Jobs Near Me (Map)</button>
              <button className={activeView === 'about-me' ? 'active' : ''} onClick={() => handleNavClick('about-me')}><i className="fa-solid fa-user-secret" style={{ color: '#f3d476' }}></i> About Me / Admin</button>
            </nav>
            
            <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
               <div className="tiny" style={{ color: 'var(--muted)', fontSize: '12px' }}><i className="fa-solid fa-shield-halved"></i> Secure Connection</div>
               <div style={{ fontSize: '11px', marginTop: '5px', color: 'var(--muted)' }}>
                 Status: <span style={{ color: 'var(--gold)' }}>{session ? (session.user.role === 'admin' ? 'CREATOR' : session.user.role.toUpperCase()) : 'GUEST'}</span>
               </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="main">
            {/* Hero Card with Search */}
            <section className="hero card">
              <div className="heroLeft" style={{ flex: 2 }}>
                <h1 className="hero-title">Find elite talent.</h1>
                <h1 className="hero-title"><span style={{ color: 'var(--gold)' }}>Hire in 24 Hours.</span></h1>
                <p className="tiny" style={{ color: 'var(--muted)', marginTop: '10px', fontSize: '14px' }}>The world's most premium local hiring portal. Fast, Secure & Free.</p>

                <div className="searchBar">
                  <div className="search-group">
                    <input 
                      id="searchInput" 
                      placeholder="Search by title, skill or city..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div 
                      id="voiceSearchBtn" 
                      onClick={handleVoiceSearch} 
                      className={isListening ? 'listening' : ''} 
                      title="Search using your voice (Simulated)"
                    >
                      <i className="fa-solid fa-microphone"></i>
                    </div>
                  </div>
                  <select id="searchCategory" value={searchCategory} onChange={(e) => setSearchCategory(e.target.value)}>
                    <option value="">✨ All Categories</option>
                    {cats.map(c => <option key={c} value={c}>{catConfig[c].emoji} {c}</option>)}
                  </select>
                  <select id="searchSalaryRange" value={searchSalaryRange} onChange={(e) => setSearchSalaryRange(e.target.value)}>
                    <option value="">Salary Range</option>
                    <option value="0-10000">0 - 10K</option>
                    <option value="10000-20000">10K - 20K</option>
                    <option value="20000-30000">20K - 30K</option>
                    <option value="30000-50000">30K - 50K</option>
                    <option value="50000-999999">50K+</option>
                  </select>
                  <button className="btn cta" id="searchBtn" style={{ borderRadius: '8px' }} onClick={loadData}>Find Elite Match</button>
                </div>
              </div>

              <div className="heroRight" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <i 
                  className="fa-solid fa-trophy" 
                  style={{ 
                    fontSize: '100px', 
                    background: '-webkit-linear-gradient(#d4af37, #f3d476)', 
                    WebkitBackgroundClip: 'text', 
                    WebkitTextFillColor: 'transparent', 
                    filter: 'drop-shadow(0 0 20px rgba(212,175,55,0.4))', 
                    animation: 'float 4s ease-in-out infinite' 
                  }}
                ></i>
              </div>
            </section>

            {/* VIEWS SWITCH RENDER */}

            {/* 1. Dashboard View */}
            {activeView === 'dashboard' && (
              <div id="view-dashboard" className="view">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '30px' }}>
                  <div className="card stat-card" onClick={() => setActiveView('jobs')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon"><i className="fa-solid fa-briefcase"></i></div>
                    <div>
                      <div className="stat-value" id="statJobs">{jobs.length}</div>
                      <div className="stat-label">Active Job Posts</div>
                    </div>
                  </div>
                  <div className="card stat-card">
                    <div className="stat-icon" style={{ background: 'var(--card-bg)', color: '#00d4ff', boxShadow: '0 0 15px rgba(0, 212, 255, 0.2)' }}><i className="fa-solid fa-file-invoice"></i></div>
                    <div>
                      <div className="stat-value" style={{ background: 'linear-gradient(90deg, var(--text-main), #00d4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {session ? (
                          session.user.role === 'admin' ? applications.length :
                          session.user.role === 'employer' ? applications.filter(a => jobs.filter(j => j.creatorId === session.user.id).map(j => j.id).includes(a.jobId)).length :
                          applications.filter(a => a.email.toLowerCase() === session.user.email.toLowerCase()).length
                        ) : '0'}
                      </div>
                      <div className="stat-label">
                        {session ? (
                          session.user.role === 'admin' ? 'Total Applications (Admin)' :
                          session.user.role === 'employer' ? 'Pending Applications' :
                          'My Total Applications'
                        ) : 'Total Applications (Guest)'}
                      </div>
                    </div>
                  </div>
                </div>
                
                <h3 style={{ marginTop: '30px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-gem" style={{ color: 'var(--gold)', fontSize: '20px' }}></i> 
                  <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: 800, background: 'linear-gradient(to right, var(--gold), var(--gold-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Elite Recent Listings
                  </span>
                </h3>

                <div id="recentJobs" className="jobList">
                  {renderJobsList(jobs.slice().reverse().slice(0, 6))}
                </div>
              </div>
            )}

            {/* 2. Map View */}
            {activeView === 'map' && (
              <div id="view-map" className="view">
                <h3 style={{ color: 'var(--text-main)', marginBottom: '15px' }}><i className="fa-solid fa-map-location-dot" style={{ color: '#00d4ff' }}></i> Jobs Near Me (Map View)</h3>
                <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>View available job locations on the map below (Simulated 3D Look).</p>
                <div id="map-container" className="card">
                  <iframe id="map-iframe" src="https://nareshmakad.github.io/3d-map-simulation" title="Simulated 3D Map of Jobs Near Me" allowFullScreen></iframe>
                </div>
              </div>
            )}

            {/* 3. About Me / Admin View */}
            {activeView === 'about-me' && (
              <div id="view-about-me" className="view">
                {!isEditingCreator ? (
                  <>
                    <div id="aboutMeCard" className="card about-me-card">
                      {profiles.find(p => p.id === 'p1') ? (
                        (() => {
                          const creatorProfile = profiles.find(p => p.id === 'p1');
                          const isCreatorLoggedIn = session?.user?.id === 'p1_creator_id' && session?.user?.email === LOGIN_ADMIN_EMAIL;
                          
                          return (
                            <>
                              <div className="about-me-header">
                                <h2 className="about-me-title"><i className="fa-solid fa-crown" style={{ color: 'var(--gold-light)' }}></i> Premium Profile: {creatorProfile.name} (The Designer) ✨</h2>
                              </div>
                              <div className="about-me-info">
                                <div className="about-me-photo-container">
                                  <img 
                                    src={creatorProfile.photoUrl} 
                                    alt={creatorProfile.name} 
                                    className="about-me-photo" 
                                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://i.pravatar.cc/150?u=fallback'; }} 
                                  />
                                </div>
                                <div className="about-me-details">
                                  <div className="detail-item"><i className="fa-solid fa-envelope"></i> Email: {DISPLAY_CREATOR_EMAIL}</div>
                                  <div className="detail-item"><i className="fa-solid fa-briefcase"></i> Role: {creatorProfile.currentRole}</div>
                                  <div className="detail-item"><i className="fa-solid fa-location-dot"></i> Location: Jodhpur, Rajasthan, India</div>
                                  <div className="detail-item"><i className="fa-solid fa-globe"></i> Portfolio: Coming Soon</div>
                                  
                                  {isCreatorLoggedIn && (
                                    <>
                                      <button className="btn profile-edit-btn" style={{ marginTop: '15px', maxWidth: '250px' }} onClick={() => startEditProfile(creatorProfile)}>
                                        <i className="fa-solid fa-camera"></i> Change Photo / Edit Profile
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="about-me-experience">
                                <h4>About Me</h4>
                                <p dangerouslySetInnerHTML={{ __html: creatorProfile.experience.replace(/\*\*(.*?)\*\//g, '<b>$1</b>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }}></p>
                              </div>
                              <div className="about-me-experience">
                                <h4>My Goal (मेरा लक्ष्य)</h4>
                                <p style={{ fontSize: '12px', color: 'var(--gold-light)' }}>
                                  गुणवत्ता और नए मुकामों पर ध्यान केंद्रित करते हुए, हर किसी को एक उच्च-स्तरीय, परेशानी मुक्त अनुभव प्रदान करना ही मेरा लक्ष्य और उद्देश्य है।
                                </p>
                              </div>
                            </>
                          );
                        })()
                      ) : (
                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--red)' }}>Creator Profile data not found.</div>
                      )}
                    </div>

                    {/* Admin Settings Card (Visible to Creator / Admins only) */}
                    {session?.user?.role === 'admin' && (
                      <div id="adminSettingsCard" className="card" style={{ marginTop: '30px' }}>
                        <h3><i className="fa-solid fa-user-shield"></i> Admin Settings</h3>
                        <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>Manage local admin access and data operations.</p>
                        <div className="heroActions" style={{ display: 'flex', gap: '15px', marginTop: '20px', flexWrap: 'wrap' }}>
                          <button className="btn" onClick={() => showToast('Data Exported/Backed up successfully (Simulated).', 'success')}><i className="fa-solid fa-cloud-arrow-down"></i> Backup Data</button>
                          <button className="btn" onClick={() => showToast('Data Restored successfully (Simulated).', 'success')}><i className="fa-solid fa-cloud-arrow-up"></i> Restore Data</button>
                        </div>

                        <div className="row" style={{ marginTop: '30px', borderTop: '1px solid var(--border)', paddingTop: '20px', flexWrap: 'wrap' }}>
                          <h4 style={{ width: '100%', fontSize: '16px', marginTop: '0px', color: 'var(--text-main)', fontFamily: 'Inter, sans-serif' }}><i className="fa-solid fa-user-plus"></i> Create New Admin</h4>
                          <input placeholder="New Admin Email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} style={{ flex: 1, minWidth: '150px' }} />
                          <input placeholder="Password" type="password" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} style={{ flex: 1, minWidth: '150px' }} />
                          <button className="btn" onClick={handleCreateAdmin}>Create</button>
                        </div>

                        <div style={{ marginTop: '30px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                          <p className="tiny" style={{ color: 'var(--red)', fontSize: '12px' }}>Danger Zone (Admin Only)</p>
                          <button className="btn" style={{ borderColor: 'var(--red)', color: 'var(--red)', background: 'rgba(255,0,0,0.05)' }} onClick={handleClearAllData}>
                            <i className="fa-solid fa-trash"></i> Delete All Data
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  // Creator edit form
                  <div id="creatorEditFormContainer" className="card">
                    <h3><i className="fa-solid fa-pen-to-square" style={{ color: 'var(--gold)' }}></i> Edit Creator Profile</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>Update your master profile details here.</p>
                    <form onSubmit={handleUpdateCreatorProfile}>
                      <h4 style={{ fontSize: '16px', marginTop: '10px', color: 'var(--text-main)', fontFamily: 'Inter, sans-serif' }}><i className="fa-solid fa-user-tag"></i> Profile Details</h4>
                      <div className="row" style={{ marginTop: '15px' }}>
                        <div style={{ flex: 1 }}><input placeholder="Your Name" value={creatorName} onChange={(e) => setCreatorName(e.target.value)} required /></div>
                        <div style={{ flex: 1 }}><input placeholder="Current Role / Title" value={creatorCurrentRole} onChange={(e) => setCreatorCurrentRole(e.target.value)} required /></div>
                      </div>
                      
                      <h4 style={{ fontSize: '16px', marginTop: '30px', color: 'var(--text-main)', fontFamily: 'Inter, sans-serif' }}><i className="fa-solid fa-camera"></i> Profile Photo</h4>
                      <div style={{ marginTop: '15px' }}>
                        <input type="file" onChange={(e) => setCreatorPhotoFile(e.target.files[0])} accept="image/*" title="Upload new photo" />
                      </div>

                      <h4 style={{ fontSize: '16px', marginTop: '30px', color: 'var(--text-main)', fontFamily: 'Inter, sans-serif' }}><i className="fa-solid fa-feather-pointed"></i> About Me / Experience</h4>
                      <div style={{ marginTop: '15px' }}>
                        <textarea placeholder="Describe your experience..." value={creatorDescription} onChange={(e) => setCreatorDescription(e.target.value)} style={{ height: '120px' }} required></textarea>
                      </div>

                      <div className="actionsRow" style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                        <button type="button" className="btn" onClick={() => setIsEditingCreator(false)}>Cancel</button>
                        <button type="submit" className="btn cta">Update Profile <i class="fa-solid fa-cloud-arrow-up"></i></button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* 4. Post/Edit Job View */}
            {activeView === 'add' && (
              <div id="view-add" className="view">
                <div className="card">
                  <h3><i className="fa-solid fa-pen-nib" style={{ color: 'var(--gold)' }}></i> {editingJobId ? 'Edit Elite Job' : 'Post a New Elite Job'}</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>Fill in the details to reach thousands of candidates.</p>
                  <form onSubmit={handlePostJob}>
                    <div className="row">
                      <div style={{ flex: 2 }}><input placeholder="Job Title (e.g. Senior Chef)" value={jobFormTitle} onChange={(e) => setJobFormTitle(e.target.value)} required /></div>
                      <div style={{ flex: 1 }}><input placeholder="Company Name" value={jobFormCompany} onChange={(e) => setJobFormCompany(e.target.value)} /></div>
                    </div>
                    <div className="row" style={{ marginTop: '15px' }}>
                      <select value={jobFormCategory} onChange={(e) => setJobFormCategory(e.target.value)} style={{ flex: 1 }} required>
                        <option value="" disabled>--- Select Category ---</option>
                        {cats.map(c => <option key={c} value={c}>{catConfig[c].emoji} {c}</option>)}
                        <option value="Other">💬 Other (Specify below)</option>
                      </select>
                      <input type="number" placeholder="Monthly Salary (₹)" value={jobFormSalary} onChange={(e) => setJobFormSalary(e.target.value)} required style={{ flex: 1 }} />
                      <input placeholder="City / Area" value={jobFormLocation} onChange={(e) => setJobFormLocation(e.target.value)} required style={{ flex: 1 }} />
                    </div>
                    
                    {jobFormCategory === 'Other' && (
                      <div id="f_other_category_container" style={{ marginTop: '15px' }}>
                        <input placeholder="Enter custom category name (e.g., HVAC Technician)" value={jobFormOtherCategory} onChange={(e) => setJobFormOtherCategory(e.target.value)} required />
                      </div>
                    )}

                    <div style={{ marginTop: '15px' }}>
                      <textarea placeholder="Describe the role, requirements and timings..." value={jobFormDescription} onChange={(e) => setJobFormDescription(e.target.value)} style={{ height: '120px' }}></textarea>
                    </div>
                    <div className="actionsRow" style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                      <button type="button" className="btn" onClick={() => {
                        setJobFormTitle('');
                        setJobFormCompany('');
                        setJobFormCategory('');
                        setJobFormOtherCategory('');
                        setJobFormSalary('');
                        setJobFormLocation('');
                        setJobFormDescription('');
                      }}>Reset Form</button>
                      <button type="submit" className="btn cta">{editingJobId ? 'Update Job' : 'Publish Elite Job'} <i className="fa-solid fa-arrow-right"></i></button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 5. Browse Jobs View */}
            {activeView === 'jobs' && (
              <div id="view-jobs" className="view">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ color: 'var(--text-main)' }}>All Available Elite Jobs</h3>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}><i className="fa-solid fa-filter"></i> Showing all active listings</div>
                </div>
                <div id="allJobs" className="jobList">
                  {renderJobsList(getFilteredJobs())}
                </div>
              </div>
            )}

            {/* 6. Saved Jobs View */}
            {activeView === 'saved-jobs' && (
              <div id="view-saved-jobs" className="view">
                <h3 style={{ color: 'var(--text-main)', marginBottom: '15px' }}><i className="fa-solid fa-heart" style={{ color: 'var(--red)' }}></i> Your Saved Jobs</h3>
                <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>These are the jobs you have liked for quick access and later application.</p>
                <div id="savedJobsList" className="jobList">
                  {renderJobsList(jobs.filter(j => isJobSaved(j.id)))}
                </div>
              </div>
            )}

            {/* 7. Applications Received View / My Job Applications (Express wrapper) */}
            {activeView === 'employer-apps' && (
              <div id="view-apps" className="view">
                <h3 id="appViewTitle" style={{ color: 'var(--text-main)', marginBottom: '15px' }}>
                  <i className="fa-solid fa-handshake-angle" style={{ color: '#9c27b0' }}></i> Applications Received
                </h3>
                <div id="appList" className="jobList">
                  {renderEmployerAppsList()}
                </div>
              </div>
            )}

            {activeView === 'jobseeker-apps' && (
              <div id="view-apps" className="view">
                <h3 id="appViewTitle" style={{ color: 'var(--text-main)', marginBottom: '15px' }}>
                  <i className="fa-solid fa-file-invoice" style={{ color: '#2196f3' }}></i> My Job Applications
                </h3>
                <div id="appList" className="jobList">
                  {renderJobseekerAppsList()}
                </div>
              </div>
            )}

            {/* 8. Notifications View (Hire requests page) */}
            {activeView === 'notifications' && (
              <div id="view-notifications" className="view">
                <h3 style={{ color: 'var(--text-main)', marginBottom: '15px' }}><i className="fa-solid fa-bell" style={{ color: 'var(--gold)' }}></i> Your Notifications (Hire Requests)</h3>
                <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>View all pending and received Hire Requests here.</p>
                <div id="notificationsViewList">
                  {hireRequests.length === 0 ? (
                    <div className="card" style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>No notifications or hire requests received yet.</div>
                  ) : (
                    hireRequests.slice().reverse().map(req => (
                      <div key={req.id} className="notification-card" style={{ borderLeftColor: req.read ? 'var(--gold)' : 'var(--red)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <h4 style={{ margin: 0, fontSize: '18px', color: 'var(--text-main)' }}><i className="fa-solid fa-handshake" style={{ color: 'var(--green)' }}></i> Hire Offer: {req.jobTitle}</h4>
                          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{new Date(req.date).toLocaleDateString()}</div>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '10px' }}>
                          From: <strong>{req.employerName}</strong> (Email: {req.employerEmail})
                        </p>
                        <p style={{ fontSize: '14px', color: 'var(--gold)', fontWeight: 600, marginTop: '5px' }}>
                          Proposed Salary: ₹{req.salary} / Month
                        </p>
                        <blockquote style={{ marginTop: '15px', padding: '10px', borderLeft: '3px solid var(--border)', fontSize: '13px', color: 'var(--text-main)' }}>
                          {req.message || 'No message provided.'}
                        </blockquote>
                        <div style={{ marginTop: '15px', textAlign: 'right' }}>
                          <button className="btn hire-btn" onClick={() => handleRespondOffer(req.id, 'Accept')} style={{ background: 'var(--green)', color: '#000' }}><i className="fa-solid fa-check"></i> Accept Offer</button>
                          <button className="btn profile-del-btn" onClick={() => handleRespondOffer(req.id, 'Decline')} style={{ marginLeft: '10px' }}><i className="fa-solid fa-xmark"></i> Decline</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 9. Candidate Profiles View */}
            {activeView === 'profiles' && (
              <div id="view-profiles" className="view">
                <h3 style={{ color: 'var(--text-main)', marginBottom: '15px' }}><i className="fa-solid fa-user-gear" style={{ color: 'var(--gold)' }}></i> Verified Candidate Profiles</h3>
                <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>Profiles are built using verified job history submitted by the candidates.</p>
                <div id="profilesList">
                  {profiles.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center' }}>No profiles available currently.</div>
                  ) : (
                    profiles.slice().reverse().map(p => {
                      const isPremium = p.id === 'p1' && p.name === 'Naresh Suthar';
                      const isPending = p.status === 'Pending Verification';
                      const isOwnProfile = session?.user?.id && p.userId === session.user.id;
                      const isTargetManager = session?.user?.role === 'employer' && p.managerEmail && (session.user.email.toLowerCase().trim() === p.managerEmail.toLowerCase().trim());
                      
                      const requestSentByThisEmployer = session?.user?.role === 'employer' && hireRequests.some(req => req.candidateId === p.id && req.employerEmail === session.user.email);
                      const requestSentByAdmin = session?.user?.role === 'admin' && hireRequests.some(req => req.candidateId === p.id);

                      let actionAreaHtml = '';
                      if (p.id !== 'p1') {
                        if (session?.user?.role === 'admin') {
                          actionAreaHtml = (
                            <div>
                              <div className="action-row" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                                <button className="action-btn edit" onClick={() => startEditProfile(p)} title="Edit Profile"><i className="fa-solid fa-pen-to-square"></i></button>
                                <button className="action-btn del" onClick={() => handleDeleteProfile(p.id)} title="Delete Profile"><i className="fa-solid fa-trash-can"></i></button>
                              </div>
                              {isPending ? (
                                <div style={{ marginTop: '10px' }}>
                                  <button className="btn cta verify-btn" onClick={() => handleVerifyProfile(p.id, p.name)}>Verify (Admin)</button>
                                  <div className="hire-status">Pending Verification</div>
                                </div>
                              ) : requestSentByAdmin ? (
                                <div className="hire-status" style={{ marginTop: '10px', color: 'var(--green)' }}>Offer Sent</div>
                              ) : (
                                <div style={{ marginTop: '10px' }}><button className="btn cta hire-btn" onClick={() => setHireCandidate({ id: p.id, name: p.name })}>Send Offer</button></div>
                              )}
                            </div>
                          );
                        } else if (session?.user?.role === 'employer') {
                          if (isPending) {
                            if (isTargetManager) {
                              actionAreaHtml = (
                                <div style={{ background: 'rgba(0,204,102,0.1)', padding: '10px', borderRadius: '8px', textAlign: 'right' }}>
                                  <div style={{ fontSize: '12px', color: 'var(--green)', marginBottom: '5px' }}>Former Employee Verification Req.</div>
                                  <button className="btn cta verify-btn" onClick={() => handleVerifyProfile(p.id, p.name)}>
                                    <i className="fa-solid fa-check"></i> Verify Now
                                  </button>
                                </div>
                              );
                            } else {
                              actionAreaHtml = (
                                <div className="hire-status" style={{ color: 'var(--muted)', fontWeight: 600 }}>
                                  <i className="fa-solid fa-lock"></i> Verification Pending <br />
                                  <span style={{ fontSize: '10px', fontWeight: 400 }}>(Waiting for Manager Approval)</span>
                                </div>
                              );
                            }
                          } else if (p.status === 'Verified') {
                            if (requestSentByThisEmployer) {
                              actionAreaHtml = <div className="hire-status">Offer Sent</div>;
                            } else {
                              actionAreaHtml = <div style={{ marginTop: '10px' }}><button className="btn cta hire-btn" onClick={() => setHireCandidate({ id: p.id, name: p.name })}>Send Offer</button></div>;
                            }
                          }
                        } else if (isOwnProfile && session?.user?.role === 'jobseeker') {
                          actionAreaHtml = (
                            <div>
                              <button className="btn profile-edit-btn" onClick={() => startEditProfile(p)}><i className="fa-solid fa-pen-to-square"></i> Edit</button>
                              <button className="btn profile-del-btn" onClick={() => handleDeleteProfile(p.id)}><i className="fa-solid fa-trash-can"></i> Delete</button>
                              <div className="hire-status" style={{ marginTop: '10px' }}>
                                {isPending ? <span><i className="fa-solid fa-clock"></i> Sent to Manager for Verification</span> : <span><i className="fa-solid fa-check-circle"></i> Profile Verified</span>}
                              </div>
                            </div>
                          );
                        } else {
                          actionAreaHtml = isPending 
                            ? <div className="hire-status">Verification Pending</div> 
                            : <div className="hire-status">Verified Candidate</div>;
                        }
                      } else {
                        actionAreaHtml = <div className="hire-status"><span style={{ color: 'var(--gold-light)', fontWeight: 700 }}>⭐ Creator Profile</span></div>;
                      }

                      return (
                        <div key={p.id} className={`profile-card ${isPremium ? 'premium' : ''} ${isPending ? 'pending' : ''}`} style={isPending && isTargetManager ? { borderColor: '#00cc66', boxShadow: '0 0 15px rgba(0, 204, 102, 0.2)' } : {}}>
                          <div className="profile-card-left">
                            <div className="profile-photo">
                              <img src={p.photoUrl} alt={p.name} onError={(e) => { e.target.onerror = null; e.target.src = 'https://i.pravatar.cc/150?u=fallback'; }} />
                            </div>
                            <div className="profile-info">
                              <h4>{p.name}</h4>
                              <div className="role">{p.currentRole}</div>
                              <div className="prev-company">Last worked at: <strong>{p.prevCompany}</strong> ({p.prevRole})</div>
                              <p className="experience-text">{p.experience}</p>
                            </div>
                          </div>
                          <div className="profile-card-right">
                            {actionAreaHtml}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* 10. Submit/Edit Job History View */}
            {activeView === 'submit-history' && (
              <div id="view-submit-history" className="view">
                <div className="card">
                  <h3><i className="fa-solid fa-clipboard-check" style={{ color: 'var(--gold)' }}></i> {histId ? 'Edit Your Job History' : 'Submit Previous Job History'}</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>
                    {histId ? 'Admin/Owner: Update the candidate\'s profile information.' : 'Apni pichhli job ki details bharein. Yeh data aapki profile ki vishwasniyata badhane mein madad karega.'}
                  </p>
                  <form onSubmit={handleSubmitHistory}>
                    <h4 style={{ fontSize: '16px', marginTop: '10px', color: 'var(--text-main)', fontFamily: 'Inter, sans-serif' }}><i className="fa-solid fa-user-tag"></i> Your Current Details</h4>
                    <div className="row" style={{ marginTop: '15px' }}>
                      <div style={{ flex: 1 }}><input placeholder="Your Name" value={histName} onChange={(e) => setHistName(e.target.value)} required /></div>
                      <div style={{ flex: 1 }}><input placeholder="Desired Role / New Role" value={histCurrentRole} onChange={(e) => setHistCurrentRole(e.target.value)} required /></div>
                    </div>
                    
                    <h4 style={{ fontSize: '16px', marginTop: '30px', color: 'var(--text-main)', fontFamily: 'Inter, sans-serif' }}><i className="fa-solid fa-camera"></i> Profile Photo (Optional)</h4>
                    <div style={{ marginTop: '15px' }}>
                      <input type="file" onChange={(e) => setHistPhotoFile(e.target.files[0])} accept="image/*" title="Upload your photo" />
                    </div>

                    <h4 style={{ fontSize: '16px', marginTop: '30px', color: 'var(--text-main)', fontFamily: 'Inter, sans-serif' }}><i className="fa-solid fa-building-user"></i> Previous Job Details</h4>
                    <div className="row" style={{ marginTop: '15px' }}>
                      <div style={{ flex: 1 }}><input placeholder="Previous Company/Shop Name" value={histPrevCompany} onChange={(e) => setHistPrevCompany(e.target.value)} required /></div>
                      <div style={{ flex: 1 }}><input placeholder="Your Role at Previous Job (e.g., Salesman)" value={histPrevRole} onChange={(e) => setHistPrevRole(e.target.value)} required /></div>
                    </div>
                    <div className="row" style={{ marginTop: '15px' }}>
                      <div style={{ flex: 1 }}><input placeholder="Previous Job Location" value={histPrevLocation} onChange={(e) => setHistPrevLocation(e.target.value)} required /></div>
                      <div style={{ flex: 1 }}><input type="email" placeholder="Previous Manager's Email (for validation)" value={histManagerEmail} onChange={(e) => setHistManagerEmail(e.target.value)} required /></div>
                    </div>
                    
                    <h4 style={{ fontSize: '16px', marginTop: '30px', color: 'var(--text-main)', fontFamily: 'Inter, sans-serif' }}><i className="fa-solid fa-feather-pointed"></i> Work Description</h4>
                    <div style={{ marginTop: '15px' }}>
                      <textarea placeholder="Pichhle kaam ke baare mein vistar se likhein (Kya karte تھے? Kitne saal kiya?)." value={histDescription} onChange={(e) => setHistDescription(e.target.value)} style={{ height: '120px' }} required></textarea>
                    </div>

                    <div className="actionsRow" style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                      <button type="button" className="btn" onClick={() => {
                        setHistName('');
                        setHistCurrentRole('');
                        setHistPrevCompany('');
                        setHistPrevRole('');
                        setHistPrevLocation('');
                        setHistManagerEmail('');
                        setHistDescription('');
                      }}>Reset Form</button>
                      <button type="submit" className="btn cta">{histId ? 'Update Profile' : 'Submit Job History'} <i className="fa-solid fa-paper-plane"></i></button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="footer">
              <div>JobGold Portal © 2026 • Secured Full Stack Application</div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--muted)' }}>
                Made with <i className="fa-solid fa-heart" style={{ color: 'var(--red)', animation: 'pulse 1.5s infinite' }}></i> by <span style={{ color: 'var(--gold)', fontWeight: 600 }}>Naresh Suthar (The Designer)</span>
              </div>
              <div className="footer-icons">
                <a href="mailto:ns680578@gmail.com" target="_blank" rel="noreferrer" title="Email Naresh Suthar"><i class="fa-solid fa-envelope"></i></a>
                <i className="fa-brands fa-twitter" title="Twitter Profile" style={{ cursor: 'pointer' }}></i>
                <a href="https://www.instagram.com/naresh_makad" target="_blank" rel="noreferrer" title="Instagram: @naresh_makad"><i className="fa-brands fa-instagram"></i></a>
                <a href="https://www.linkedin.com/in/naresh-suthar-579b00365" target="_blank" rel="noreferrer" title="LinkedIn Profile"><i className="fa-brands fa-linkedin"></i></a>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* --- ALL POPUP MODALS --- */}

      {/* 1. Auth Login/Register Modal */}
      {isAuthModalOpen && (
        <div id="authModal" className="modal" style={{ display: 'flex' }} aria-hidden="false">
          <div className={`auth-wrapper ${isAuthWrapperToggled ? 'toggled' : ''}`}>
            <button id="closeAuth" className="modal-close-btn" onClick={() => setIsAuthModalOpen(false)}><i className="fa-solid fa-xmark"></i></button>
            <div className="background-shape"></div>
            <div className="secondary-shape"></div>
            
            {/* Signin Panel */}
            <div className="credentials-panel signin">
              <h2 className="slide-element">Login</h2>
              <form onSubmit={handleLogin} className="form-wrapper">
                <div className="field-wrapper slide-element">
                  <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                  <label>Email</label>
                  <i className="fa-solid fa-at"></i>
                </div>
                <div className="field-wrapper slide-element">
                  <input type={showLoginPass ? "text" : "password"} value={loginPass} onChange={(e) => setLoginPass(e.target.value)} required />
                  <label>Password</label>
                  <i className={`fa-solid ${showLoginPass ? 'fa-eye' : 'fa-eye-slash'} pass-toggle`} onClick={() => setShowLoginPass(!showLoginPass)}></i>
                </div>
                <div className="field-wrapper slide-element">
                  <button className="submit-button" type="submit">Login</button>
                </div>
                <div className="switch-link slide-element">
                  <p style={{ marginBottom: '5px' }}><a href="#" onClick={(e) => { e.preventDefault(); setIsAuthModalOpen(false); setIsForgotModalOpen(true); }} className="forgot-trigger" style={{ fontSize: '13px' }}>Forgot Password?</a></p>
                  <p>Don't have an account? <br /><a href="#" onClick={(e) => { e.preventDefault(); setIsAuthWrapperToggled(true); }} className="register-trigger">Sign Up</a></p>
                </div>
              </form>
            </div>
            <div className="welcome-section signin"><h2 className="slide-element">WELCOME BACK!</h2></div>
            
            {/* Signup Panel */}
            <div className="credentials-panel signup">
              <h2 className="slide-element">Register</h2>
              <form onSubmit={handleRegister} className="form-wrapper">
                <div className="field-wrapper slide-element">
                  <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} required />
                  <label>Username</label>
                  <i className="fa-solid fa-user-astronaut"></i>
                </div>
                <div className="field-wrapper slide-element">
                  <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
                  <label>Email</label>
                  <i className="fa-solid fa-at"></i>
                </div>
                <div className="field-wrapper slide-element">
                  <input type={showRegPass ? "text" : "password"} value={regPass} onChange={(e) => setRegPass(e.target.value)} required />
                  <label>Password</label>
                  <i className={`fa-solid ${showRegPass ? 'fa-eye' : 'fa-eye-slash'} pass-toggle`} onClick={() => setShowRegPass(!showRegPass)}></i>
                </div>
                <div className="field-wrapper slide-element">
                  <select value={regRole} onChange={(e) => setRegRole(e.target.value)} className={regRole ? 'has-val' : ''} required>
                    <option value="" disabled></option>
                    <option value="jobseeker">Job Seeker (Candidate)</option>
                    <option value="employer">Employer (Hiring Partner)</option>
                  </select>
                  <label>Role</label>
                  <i className="fa-solid fa-user-tie"></i>
                </div>
                <div className="field-wrapper slide-element">
                  <button className="submit-button" type="submit">Register</button>
                </div>
                <div className="switch-link slide-element">
                  <p>Already have an account? <br /><a href="#" onClick={(e) => { e.preventDefault(); setIsAuthWrapperToggled(false); }} className="login-trigger">Sign In</a></p>
                </div>
              </form>
            </div>
            <div className="welcome-section signup"><h2 className="slide-element">WELCOME!</h2></div>
          </div>
        </div>
      )}

      {/* 2. Forgot Password Modal */}
      {isForgotModalOpen && (
        <div id="forgotPassModal" className="modal" style={{ display: 'flex' }}>
          <div className="card" style={{ width: '400px', border: '1px solid #00d4ff', boxShadow: '0 0 50px rgba(0, 212, 255, 0.2)' }}>
            <h3 style={{ color: '#00d4ff', fontSize: '22px' }}>Forgot Password</h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Enter your registered email address to receive a password reset link.</p>
            <form onSubmit={handleForgotPassword} style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input placeholder="Registered Email" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required />
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                <button type="button" className="btn" onClick={() => { setIsForgotModalOpen(false); setIsAuthModalOpen(true); }}>Cancel</button>
                <button type="submit" className="btn cta" style={{ background: '#00d4ff', color: '#000', borderColor: '#00d4ff', boxShadow: 'none' }}>Send Reset Link</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Apply Job Modal */}
      {applyJobId && (
        <div id="applyModal" className="modal" style={{ display: 'flex' }}>
          <div className="card" style={{ width: '500px', border: '1px solid var(--gold)', boxShadow: '0 0 50px rgba(212,175,55,0.2)' }}>
            <h3 id="applyJobTitle" style={{ color: 'var(--gold)', fontSize: '22px' }}>
              Apply for: {jobs.find(j => j.id === applyJobId)?.title || 'Job'}
            </h3>
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input placeholder="Your Full Name" value={appName} onChange={(e) => setAppName(e.target.value)} />
              <input placeholder="Email Address" value={appEmail} readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              <input placeholder="Phone Number" value={appPhone} onChange={(e) => setAppPhone(e.target.value)} />
              <textarea placeholder="Skills, Experience or Cover Note..." value={appSkills} onChange={(e) => setAppSkills(e.target.value)} style={{ height: '100px' }}></textarea>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                <button className="btn" onClick={() => setApplyJobId(null)}>Cancel</button>
                <button className="btn cta" onClick={handleApplyJob}>Submit Application</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Send Offer (Hire) Modal */}
      {hireCandidate && (
        <div id="hireModal" className="modal" style={{ display: 'flex' }}>
          <div className="card" style={{ width: '400px', border: '1px solid var(--green)', boxShadow: '0 0 50px rgba(0, 204, 102, 0.2)' }}>
            <h3 style={{ color: 'var(--green)', fontSize: '22px' }}>Send Hire Request</h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>You are sending a hiring offer to <strong id="hireCandidateName" style={{ color: 'var(--text-main)' }}>{hireCandidate.name}</strong>.</p>
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input placeholder="Job Title (e.g. Senior Chef)" value={hireJobTitle} onChange={(e) => setHireJobTitle(e.target.value)} required />
              <input type="number" placeholder="Proposed Monthly Salary (₹)" value={hireSalary} onChange={(e) => setHireSalary(e.target.value)} required />
              <textarea placeholder="Short Message/Offer Details..." value={hireMessage} onChange={(e) => setHireMessage(e.target.value)} style={{ height: '80px' }}></textarea>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                <button className="btn" onClick={() => setHireCandidate(null)}>Cancel</button>
                <button className="btn cta" style={{ background: 'var(--green)', color: '#000' }} onClick={handleSendOffer}>Send Offer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
