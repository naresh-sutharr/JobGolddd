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

// Jodhpur coordinates dictionary for common neighborhoods
const JODHPUR_COORDINATES = {
  'main market': { lat: 26.2913, lng: 73.0348 },
  'station road': { lat: 26.2872, lng: 73.0289 },
  'city wide': { lat: 26.2650, lng: 73.0050 },
  'civil lines': { lat: 26.2750, lng: 73.0150 },
  'model town': { lat: 26.2500, lng: 73.0250 },
  'it park': { lat: 26.2200, lng: 73.0100 },
  'industrial area': { lat: 26.2100, lng: 73.0400 },
  'mall road': { lat: 26.2800, lng: 73.0300 },
  'sardarpura': { lat: 26.2808, lng: 73.0163 },
  'shastri nagar': { lat: 26.2638, lng: 73.0097 },
  'chopasni housing board': { lat: 26.2721, lng: 72.9772 },
  'chb': { lat: 26.2721, lng: 72.9772 },
  'paota': { lat: 26.3005, lng: 73.0395 },
  'mandore': { lat: 26.3409, lng: 73.0441 },
  'pal road': { lat: 26.2422, lng: 72.9789 },
};

const getJobCoordinates = (locationStr) => {
  if (!locationStr) return { lat: 26.2389, lng: 73.0243 }; // Default Jodhpur center
  const normalized = locationStr.toLowerCase().trim();
  
  // Direct match search
  for (const key in JODHPUR_COORDINATES) {
    if (normalized.includes(key)) {
      return JODHPUR_COORDINATES[key];
    }
  }
  
  // Deterministic fallback based on string hash to spread out markers near Jodhpur center
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const latOffset = ((hash & 0xFF) / 255 - 0.5) * 0.04; // +/- 2 km approx
  const lngOffset = (((hash >> 8) & 0xFF) / 255 - 0.5) * 0.04;
  
  return {
    lat: 26.2389 + latOffset,
    lng: 73.0243 + lngOffset
  };
};

function App() {
  // --- STATE VARIABLES ---
  const mapRef = React.useRef(null);
  const [userLocation, setUserLocation] = useState(null);
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
  const [appExperience, setAppExperience] = useState('');
  const [appQualification, setAppQualification] = useState('');
  const [appExpectedSalary, setAppExpectedSalary] = useState('');
  const [appResumeUrl, setAppResumeUrl] = useState('');

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

  // Logged-in User Profile Edit Form & Dropdown state
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isEditingUserProfile, setIsEditingUserProfile] = useState(false);
  const [userProfName, setUserProfName] = useState('');
  const [userProfPhone, setUserProfPhone] = useState('');
  const [userProfRole, setUserProfRole] = useState('');
  const [userProfExperience, setUserProfExperience] = useState('');
  const [userProfSalary, setUserProfSalary] = useState('');
  const [userProfBio, setUserProfBio] = useState('');
  const [userProfPhotoUrl, setUserProfPhotoUrl] = useState('');

  // Admin settings Form
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');

  // Match Analyzer State & Mobile Drawer State
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [analyzerCategory, setAnalyzerCategory] = useState('');
  const [analyzerSalary, setAnalyzerSalary] = useState('');
  const [analyzerResult, setAnalyzerResult] = useState(null);

  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isChatTyping, setIsChatTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'bot', text: 'Hello! Welcome to JobGold Elite Assistant. How can I help you find opportunities or elite talent today?' }
  ]);

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

  // Load and Sync on mount
  useEffect(() => {
    const init = async () => {
      await syncLocalUsers();
      await loadData();
    };
    init();
  }, []);

  // Global bindings for Chatbot link clicks
  useEffect(() => {
    window.jg_select_job = (jobId) => {
      setActiveView('jobs');
      const targetJob = jobs.find(j => j.id === jobId);
      if (targetJob) {
        setSearchQuery(targetJob.title);
      } else {
        setSearchQuery('');
      }
      setIsChatOpen(false);
    };
    window.jg_view_all_jobs = () => {
      setActiveView('jobs');
      setSearchQuery('');
      setSearchCategory('');
      setSearchSalaryRange('');
      setIsChatOpen(false);
    };
    return () => {
      delete window.jg_select_job;
      delete window.jg_view_all_jobs;
    };
  }, [jobs]);

  // --- GEOLOCATION AND MAP INITIALIZATION ---
  useEffect(() => {
    // Request user location on mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn("Geolocation access denied or failed:", error);
        }
      );
    }
  }, []);

  useEffect(() => {
    if (activeView !== 'map') {
      // Clean up map when leaving map view
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      return;
    }

    if (!window.L) {
      console.error("Leaflet is not loaded.");
      return;
    }

    const L = window.L;

    // Initialize map
    const defaultCenter = [26.2389, 73.0243]; // Jodhpur Center
    const map = L.map('map').setView(defaultCenter, 13);
    mapRef.current = map;

    // Load tiles based on theme
    const isDark = theme === 'dark';
    const tileUrl = isDark 
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    
    const attribution = isDark
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

    L.tileLayer(tileUrl, { attribution, maxZoom: 19 }).addTo(map);

    // Create markers layer group
    const markersGroup = L.layerGroup().addTo(map);

    // 1. Plot Job Pins
    const jobBounds = [];
    jobs.forEach((job) => {
      if (!job.location) return;
      const coords = getJobCoordinates(job.location);
      
      // Custom Gold Icon
      const jobIcon = L.divIcon({
        className: 'custom-job-marker',
        html: `<div class="marker-pin gold-pin"><i class="fa-solid fa-briefcase"></i></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -30]
      });

      const marker = L.marker([coords.lat, coords.lng], { icon: jobIcon }).addTo(markersGroup);
      jobBounds.push([coords.lat, coords.lng]);

      // Premium Popup Content DOM element to support React handler bindings
      const popupDiv = document.createElement('div');
      popupDiv.className = 'map-popup-content';
      popupDiv.style.minWidth = '200px';
      popupDiv.innerHTML = `
        <div style="font-family: 'Inter', sans-serif; color: var(--text-main); font-size: 13px;">
          <h4 style="margin: 0 0 8px 0; color: var(--gold-light); font-size: 15px; font-weight:700;">${escapeHtml(job.title)}</h4>
          <div style="margin-bottom: 6px; display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-building" style="color:var(--gold); width:14px;"></i> <span>${escapeHtml(job.company)}</span></div>
          <div style="margin-bottom: 6px; display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-location-dot" style="color:#00d4ff; width:14px;"></i> <span>${escapeHtml(job.location)}</span></div>
          <div style="margin-bottom: 12px; display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-indian-rupee-sign" style="color:var(--green); width:14px;"></i> <span>₹${job.salary} / Month</span></div>
          <button class="btn popup-apply-btn" style="width: 100%; padding: 8px; border: 1px solid var(--gold); color: var(--gold); background: rgba(212,175,55,0.05); cursor: pointer; border-radius: 8px; font-weight:600; transition:0.3s; display:flex; align-items:center; justify-content:center; gap:6px;">
            Apply Now <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      `;

      // Setup popups apply click
      const applyBtn = popupDiv.querySelector('.popup-apply-btn');
      if (applyBtn) {
        applyBtn.onclick = () => {
          if (!session) {
            showToast('Please login as Job Seeker to apply for jobs.', 'error');
          } else {
            setApplyJobId(job.id);
            setAppName(session.user.name || '');
            setAppEmail(session.user.email || '');
          }
        };
      }

      marker.bindPopup(popupDiv);
    });

    // 2. Plot User Location if available
    let userMarker = null;
    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'custom-user-marker',
        html: `<div class="marker-pulse-container"><div class="user-pulse"></div><div class="user-dot"></div></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -10]
      });

      userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(markersGroup);
      userMarker.bindPopup(`
        <div style="font-family: 'Inter', sans-serif; color: var(--text-main); font-size: 13px; text-align:center;">
          <strong style="color:#00d4ff;">You are here</strong><br/>
          <span style="font-size:11px; color:var(--muted);">Live Location Pinned</span>
        </div>
      `);
    }

    // Auto fit bounds logic
    if (userLocation) {
      const distance = Math.sqrt(
        Math.pow(userLocation.lat - defaultCenter[0], 2) + 
        Math.pow(userLocation.lng - defaultCenter[1], 2)
      );

      // If user is within ~100km of Jodhpur center, fit map to show both user and jobs
      if (distance < 1.0) {
        const allBounds = [...jobBounds, [userLocation.lat, userLocation.lng]];
        if (allBounds.length > 0) {
          map.fitBounds(allBounds, { padding: [50, 50] });
        }
      } else {
        // If user is far away, focus on Jodhpur jobs, but keep user pin
        if (jobBounds.length > 0) {
          map.fitBounds(jobBounds, { padding: [50, 50] });
        } else {
          map.setView(defaultCenter, 13);
        }
      }
    } else {
      // If user location not available, focus on Jodhpur jobs
      if (jobBounds.length > 0) {
        map.fitBounds(jobBounds, { padding: [50, 50] });
      } else {
        map.setView(defaultCenter, 13);
      }
    }

    // Set up locate button listener
    const locateBtn = document.getElementById('locate-me-btn');
    if (locateBtn) {
      locateBtn.onclick = () => {
        if (userLocation) {
          map.setView([userLocation.lat, userLocation.lng], 15);
          if (userMarker) userMarker.openPopup();
        } else {
          // Attempt to re-request geolocation
          showToast("Locating your device...", "info");
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const loc = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              setUserLocation(loc);
              map.setView([loc.lat, loc.lng], 15);
              showToast("Location updated successfully!", "success");
            },
            (error) => {
              showToast("Location access denied or unavailable.", "error");
            }
          );
        }
      };
    }

    // Clean up
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [activeView, jobs, theme, userLocation]);

  // --- SYNC LOCAL USERS FOR PERSISTENCE FALLBACK ---
  const syncLocalUsers = async () => {
    try {
      const localUsers = JSON.parse(localStorage.getItem('jg_local_users') || '[]');
      if (localUsers.length > 0) {
        await apiFetch('/api/auth/sync', {
          method: 'POST',
          body: JSON.stringify({ users: localUsers })
        });
      }
    } catch (err) {
      console.error('Error syncing local users:', err);
    }
  };

  // --- COMPUTE UNREAD NOTIFICATIONS ---
  const getUnreadNotifications = () => {
    if (!session) return [];
    if (session.user.role === 'jobseeker') {
      const myProfile = profiles.find(p => p.userId === session.user.id);
      if (!myProfile) return [];
      return hireRequests.filter(req => req.candidateId === myProfile.id && !req.read);
    } else if (session.user.role === 'employer' || session.user.role === 'admin') {
      const relevantJobIds = jobs.filter(j => session.user.role === 'admin' || j.creatorId === session.user.id).map(j => j.id);
      return applications.filter(a => {
        if (!relevantJobIds.includes(a.jobId)) return false;
        const appStatuses = appStatusList.filter(s => s.appId === a.id)
                                        .sort((x, y) => new Date(y.date) - new Date(x.date));
        const latest = appStatuses[0];
        return !latest || latest.status === 'Submitted' || latest.status === 'Pending';
      });
    }
    return [];
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

      // Save/update user locally for Vercel persistence fallback
      try {
        const localUsers = JSON.parse(localStorage.getItem('jg_local_users') || '[]');
        const existingIdx = localUsers.findIndex(u => u.email.toLowerCase() === loginEmail.toLowerCase());
        if (existingIdx > -1) {
          localUsers[existingIdx].pass = loginPass;
          localUsers[existingIdx].name = data.user.name;
          localUsers[existingIdx].role = data.user.role;
        } else {
          localUsers.push({ name: data.user.name, email: loginEmail.toLowerCase(), pass: loginPass, role: data.user.role });
        }
        localStorage.setItem('jg_local_users', JSON.stringify(localUsers));
      } catch (err) {
        console.error('Error saving user locally:', err);
      }

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

      // Save user locally for Vercel persistence fallback
      try {
        const localUsers = JSON.parse(localStorage.getItem('jg_local_users') || '[]');
        if (!localUsers.some(u => u.email.toLowerCase() === regEmail.toLowerCase())) {
          localUsers.push({ name: regName, email: regEmail.toLowerCase(), pass: regPass, role: regRole });
          localStorage.setItem('jg_local_users', JSON.stringify(localUsers));
        }
      } catch (err) {
        console.error('Error saving user locally:', err);
      }

      setSession(data);
      setIsAuthModalOpen(false);
      setRegName('');
      setRegEmail('');
      setRegPass('');
      setRegRole('');
      showToast(`Welcome, ${data.user.name}! Account Created & Logged In.`, 'success');
      setActiveView('dashboard');
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
    const finalName = appName.trim() || session?.user?.name || 'Applicant';
    const finalPhone = appPhone.trim() || '9829012345';
    const finalExp = appExperience || '1-2 Years';
    const finalQual = appQualification || 'Graduate';
    const finalSalary = appExpectedSalary || '25000';

    const targetJob = jobs.find(j => j.id === applyJobId);

    try {
      await apiFetch('/api/applications', {
        method: 'POST',
        body: JSON.stringify({
          jobId: applyJobId,
          name: finalName,
          phone: finalPhone,
          skills: appSkills,
          experience: finalExp,
          qualification: finalQual,
          expectedSalary: finalSalary,
          resumeUrl: appResumeUrl
        })
      });
      showToast('Application Sent Successfully! 🚀', 'success');
    } catch (err) {
      // Fallback local creation if API backend is offline or returns error
      const newId = `app_local_${Date.now()}`;
      const newAppObj = {
        id: newId,
        jobId: applyJobId,
        jobTitle: targetJob?.title || 'Job Position',
        name: finalName,
        email: session?.user?.email || 'applicant@gmail.com',
        phone: finalPhone,
        skills: appSkills || 'General Skills',
        experience: finalExp,
        qualification: finalQual,
        expectedSalary: finalSalary,
        resumeUrl: appResumeUrl || '',
        applied: new Date().toISOString()
      };

      setApplications(prev => [...prev, newAppObj]);
      setAppStatusList(prev => [...prev, { id: `st_${Date.now()}`, appId: newId, status: 'Submitted', date: new Date().toISOString() }]);
      showToast('Application Submitted Successfully! 🚀', 'success');
    }

    setApplyJobId(null);
    setAppName('');
    setAppPhone('');
    setAppSkills('');
    setAppExperience('');
    setAppQualification('');
    setAppExpectedSalary('');
    setAppResumeUrl('');
    loadData();
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

  // --- PROFESSIONAL EXECUTIVE PDF DOSSIER DOWNLOAD ---
  const handleDownloadApp = (app) => {
    const job = jobs.find(x => x.id === app.jobId);
    const content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>JobGold Executive Dossier - ${app.name}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Inter:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #f4f6f9; color: #1e293b; margin: 0; padding: 40px 20px; }
    .dossier-container { max-width: 850px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.08); overflow: hidden; position: relative; }
    .header-bar { height: 6px; background: linear-gradient(90deg, #d4af37, #00d4ff, #4caf50); }
    .dossier-header { padding: 30px 40px; border-bottom: 2px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #fafafa; }
    .brand-logo { font-family: 'Cinzel', serif; font-size: 26px; font-weight: 900; color: #0f172a; letter-spacing: 1px; display: flex; align-items: center; gap: 10px; }
    .brand-logo i { color: #d4af37; }
    .dossier-badge { background: rgba(212,175,55,0.1); color: #856404; border: 1px solid #d4af37; padding: 6px 14px; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
    .dossier-body { padding: 40px; }
    .candidate-card { display: flex; align-items: center; gap: 24px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 24px; border-radius: 10px; margin-bottom: 30px; }
    .candidate-avatar { width: 70px; height: 70px; border-radius: 50%; background: linear-gradient(135deg, #0f172a, #334155); display: flex; align-items: center; justify-content: center; color: #d4af37; font-size: 30px; font-weight: 800; border: 2px solid #d4af37; }
    .candidate-info h2 { margin: 0 0 6px 0; font-size: 24px; color: #0f172a; font-weight: 800; }
    .candidate-info p { margin: 0; font-size: 14px; color: #0284c7; font-weight: 600; }
    .section-title { font-family: 'Cinzel', serif; font-size: 15px; color: #0f172a; border-bottom: 2px solid #d4af37; padding-bottom: 6px; margin-top: 30px; margin-bottom: 18px; display: flex; align-items: center; gap: 10px; text-transform: uppercase; letter-spacing: 1px; }
    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .meta-table td { padding: 12px 16px; border: 1px solid #e2e8f0; font-size: 13px; }
    .meta-table tr:nth-child(even) { background: #f8fafc; }
    .label-cell { width: 35%; font-weight: 700; color: #475569; background: #f1f5f9; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
    .value-cell { font-weight: 600; color: #0f172a; }
    .highlight-value { color: #16a34a; font-weight: 800; }
    .notes-box { background: #f8fafc; border-left: 4px solid #0284c7; border: 1px solid #e2e8f0; border-left-width: 4px; padding: 20px; border-radius: 6px; font-size: 13px; line-height: 1.7; color: #334155; white-space: pre-wrap; }
    .watermark { position: absolute; bottom: 80px; right: 40px; border: 2px solid #16a34a; color: #16a34a; padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; transform: rotate(-8deg); background: #f0fdf4; opacity: 0.9; pointer-events: none; display: flex; align-items: center; gap: 6px; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 40px; text-align: center; font-size: 11px; color: #64748b; font-weight: 600; }
    @media print {
      body { background: #fff; color: #000; padding: 0; }
      .dossier-container { border: none; box-shadow: none; width: 100%; max-width: 100%; }
      .header-bar { height: 4px; }
      .watermark { opacity: 1; }
    }
  </style>
</head>
<body>
  <div class="dossier-container">
    <div class="header-bar"></div>
    <div class="dossier-header">
      <div class="brand-logo"><i class="fa-solid fa-crown"></i> JOB<span>GOLD</span></div>
      <div class="dossier-badge"><i class="fa-solid fa-file-contract"></i> Official Application Dossier</div>
    </div>
    <div class="dossier-body">
      <div class="candidate-card">
        <div class="candidate-avatar">${app.name.charAt(0).toUpperCase()}</div>
        <div class="candidate-info">
          <h2>${app.name}</h2>
          <p><i class="fa-solid fa-briefcase"></i> Candidate for: ${app.jobTitle} • ${job ? job.company : 'Elite Employer Network'}</p>
        </div>
      </div>

      <div class="section-title"><i class="fa-solid fa-building-user"></i> 1. Job Opening Specification</div>
      <table class="meta-table">
        <tr>
          <td class="label-cell"><i class="fa-solid fa-heading"></i> Position Title</td>
          <td class="value-cell">${app.jobTitle}</td>
        </tr>
        <tr>
          <td class="label-cell"><i class="fa-solid fa-building"></i> Hiring Organization</td>
          <td class="value-cell">${job ? job.company : 'Verified Employer'}</td>
        </tr>
        <tr>
          <td class="label-cell"><i class="fa-solid fa-location-dot"></i> Job Location</td>
          <td class="value-cell">${job ? job.location : 'Jodhpur, Rajasthan'}</td>
        </tr>
        <tr>
          <td class="label-cell"><i class="fa-solid fa-calendar-days"></i> Application Timestamp</td>
          <td class="value-cell">${new Date(app.applied || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
      </table>

      <div class="section-title"><i class="fa-solid fa-id-card"></i> 2. Candidate Credentials & Verification</div>
      <table class="meta-table">
        <tr>
          <td class="label-cell"><i class="fa-solid fa-envelope"></i> Email Address</td>
          <td class="value-cell">${app.email}</td>
        </tr>
        <tr>
          <td class="label-cell"><i class="fa-solid fa-phone"></i> Contact Phone</td>
          <td class="value-cell">${app.phone}</td>
        </tr>
        <tr>
          <td class="label-cell"><i class="fa-solid fa-award"></i> Total Experience</td>
          <td class="value-cell">${app.experience || 'Fresher / Not Specified'}</td>
        </tr>
        <tr>
          <td class="label-cell"><i class="fa-solid fa-graduation-cap"></i> Highest Qualification</td>
          <td class="value-cell">${app.qualification || 'Graduate'}</td>
        </tr>
        <tr>
          <td class="label-cell"><i class="fa-solid fa-indian-rupee-sign"></i> Expected Salary</td>
          <td class="value-cell highlight-value">${app.expectedSalary ? `₹${parseInt(app.expectedSalary).toLocaleString()} / Month` : 'As Per Industry Standard'}</td>
        </tr>
        <tr>
          <td class="label-cell"><i class="fa-solid fa-file-pdf"></i> Resume Status</td>
          <td class="value-cell">${app.resumeUrl ? `Attached Document (${app.resumeUrl})` : 'Submitted to Recruitment Desk'}</td>
        </tr>
      </table>

      <div class="section-title"><i class="fa-solid fa-feather-pointed"></i> 3. Cover Statement & Key Skills</div>
      <div class="notes-box">
        ${app.skills || 'Candidate profile verified and forwarded for hiring manager review. All background credentials meet standard requirements.'}
      </div>

      <div class="watermark"><i class="fa-solid fa-circle-check"></i> VERIFIED CANDIDATE</div>
    </div>
    <div class="footer">
      JobGold Executive Network © 2026 • Confidential Hiring Document • Reference ID: ${app.id}
    </div>
  </div>
</body>
</html>`;

    const printWin = window.open('', '_blank', 'width=900,height=850');
    if (printWin) {
      printWin.document.write(content);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
      }, 500);
      showToast(`Generating Executive PDF Dossier for ${app.name}... 📄`, 'success');
    }
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

  // --- MATCH ANALYZER LOGIC ---
  const handleRunMatchAnalyzer = () => {
    if (!analyzerCategory || !analyzerSalary) {
      showToast('Please select a Category and Salary to analyze.', 'error');
      return;
    }

    const targetSalary = parseInt(analyzerSalary);
    
    // Total jobs in this category
    const categoryJobs = jobs.filter(j => j.category === analyzerCategory);
    const openingsCount = categoryJobs.length;
    
    // Average salary in this category
    const avgSalary = openingsCount > 0 
      ? Math.round(categoryJobs.reduce((sum, j) => sum + parseInt(j.salary), 0) / openingsCount)
      : 15000; // default benchmark
    
    const matchingJobs = categoryJobs.filter(j => parseInt(j.salary) >= targetSalary * 0.75);

    let score = 50;
    if (matchingJobs.length > 0) {
      score += Math.min(matchingJobs.length * 10, 40);
      if (avgSalary >= targetSalary) {
        score += 10;
      } else {
        score += Math.max(0, 10 - Math.round(((targetSalary - avgSalary) / targetSalary) * 100));
      }
    } else {
      score = Math.max(25, 45 - Math.round(targetSalary / 10000));
    }

    score = Math.min(99, score);

    // Formulate a custom salary message
    let salaryStatus = "Good Match";
    let salaryMsg = `Your target of ₹${targetSalary.toLocaleString()} aligns with the average of ₹${avgSalary.toLocaleString()} in Jodhpur.`;
    if (targetSalary > avgSalary * 1.25) {
      salaryStatus = "High Expectation";
      salaryMsg = `Your target of ₹${targetSalary.toLocaleString()} is higher than the average ₹${avgSalary.toLocaleString()} for this sector.`;
    } else if (targetSalary < avgSalary * 0.85) {
      salaryStatus = "Highly Competitive Expectation";
      salaryMsg = `Your expectation of ₹${targetSalary.toLocaleString()} is very attractive compared to the average of ₹${avgSalary.toLocaleString()}.`;
    }

    setAnalyzerResult({
      score,
      openingsCount,
      avgSalary,
      salaryStatus,
      salaryMsg,
      matchedJobs: matchingJobs.slice(0, 3)
    });
    showToast('Match Analysis Complete!', 'success');
  };

  // --- OUTSIDE CLICK DISMISSAL FOR BELL POPUP & USER DROPDOWN ---
  useEffect(() => {
    const handleOutsideClick = (e) => {
      const popup = document.getElementById('notification-popup');
      const btn = document.getElementById('notificationBtn');
      if (popup && btn && !popup.contains(e.target) && !btn.contains(e.target)) {
        setShowBellPopup(false);
      }
      const userMenu = document.getElementById('user-dropdown-menu');
      const userChip = document.getElementById('user-chip-trigger');
      if (userMenu && userChip && !userMenu.contains(e.target) && !userChip.contains(e.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [showBellPopup, showUserDropdown]);

  // --- AI CHATBOT LOGIC (MULTILINGUAL HINGLISH/ENGLISH ENGINE) ---
  const handleSendChatMessage = (textToSend = '') => {
    const text = textToSend.trim() || chatInput.trim();
    if (!text) return;

    const userMsgId = Date.now() + Math.random().toString(36).substring(2, 5);
    setChatMessages(prev => [...prev, { id: userMsgId, sender: 'user', text }]);
    setChatInput('');
    setIsChatTyping(true);

    setTimeout(() => {
      const cleanText = text.toLowerCase();
      const isHinglish = /(kaise|kya|karne|chahiye|kahan|btao|batao|dhundho|dhoondh|namaste|shukriya|bhai|kaun|bnao|bna|raha|rha|hai|ho|kar|sekker|muye|mujhe|samajh|nhi|nahi|apne|kisi|kardo|karo|dikhao|bata|sakye|dukan|gadi|khana)/i.test(cleanText);

      let botResponse = isHinglish 
        ? "Main JobGold AI Assistant hoon! Aap mujhse Job search, verification, ya job posting ke baare me pooch sakte hain."
        : "I'm here to assist you with JobGold. You can ask me about creating an account, finding verified candidate profiles, or posting jobs!";

      // Dynamic job recommendation logic
      let matchedJobs = [];
      let sectorName = "";

      if (cleanText.includes('retail') || cleanText.includes('shop') || cleanText.includes('dukan') || cleanText.includes('salesman')) {
        matchedJobs = jobs.filter(j => j.category === 'Retail & Shop');
        sectorName = 'Retail & Shop';
      } else if (cleanText.includes('food') || cleanText.includes('hotel') || cleanText.includes('waiter') || cleanText.includes('chef') || cleanText.includes('cook') || cleanText.includes('server') || cleanText.includes('restaurant') || cleanText.includes('khana')) {
        matchedJobs = jobs.filter(j => j.category === 'Hotel & Food');
        sectorName = 'Hotel & Food';
      } else if (cleanText.includes('delivery') || cleanText.includes('parcel')) {
        matchedJobs = jobs.filter(j => j.category === 'Delivery');
        sectorName = 'Delivery';
      } else if (cleanText.includes('driver') || cleanText.includes('transport') || cleanText.includes('car') || cleanText.includes('gadi')) {
        matchedJobs = jobs.filter(j => j.category === 'Driver & Transport');
        sectorName = 'Driver & Transport';
      } else if (cleanText.includes('technician') || cleanText.includes('ac') || cleanText.includes('repair') || cleanText.includes('mechanic')) {
        matchedJobs = jobs.filter(j => j.category === 'Technician');
        sectorName = 'Technician';
      } else if (cleanText.includes('salon') || cleanText.includes('hair') || cleanText.includes('beauty') || cleanText.includes('stylist') || cleanText.includes('parlor')) {
        matchedJobs = jobs.filter(j => j.category === 'Salon & Beauty');
        sectorName = 'Salon & Beauty';
      } else if (cleanText.includes('office') || cleanText.includes('admin') || cleanText.includes('assistant') || cleanText.includes('computer')) {
        matchedJobs = jobs.filter(j => j.category === 'Office & Admin');
        sectorName = 'Office & Admin';
      } else if (cleanText.includes('security') || cleanText.includes('guard')) {
        matchedJobs = jobs.filter(j => j.category === 'Security & Other');
        sectorName = 'Security & Other';
      } else if (cleanText.includes('all jobs') || cleanText.includes('show jobs') || cleanText.includes('list jobs') || cleanText.includes('sari job') || cleanText.includes('sab job')) {
        matchedJobs = jobs;
        sectorName = isHinglish ? 'Sari Active' : 'All Active';
      }

      if (matchedJobs.length > 0) {
        botResponse = isHinglish
          ? `Mujhe Jodhpur me <b>${matchedJobs.length} active ${sectorName} job(s)</b> mili hain:<br/><br/>`
          : `I found <b>${matchedJobs.length} active ${sectorName} opening(s)</b> in Jodhpur:<br/><br/>`;
        matchedJobs.slice(0, 3).forEach(j => {
          botResponse += `<div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-left: 3px solid var(--gold); border-radius: 8px; padding: 12px; margin-bottom: 10px; text-align: left;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <strong style="color: var(--text-main); font-size: 13px;">${j.title}</strong>
              <span style="font-size: 11px; color: var(--gold); font-weight: bold;">₹${parseInt(j.salary).toLocaleString()}</span>
            </div>
            <div style="font-size: 11px; color: var(--muted); margin-top: 2px;">${j.company} • ${j.location}</div>
            <button class="btn" style="padding: 4px 8px; font-size: 10px; margin-top: 8px; height: auto; border-color: var(--gold); color: var(--gold); background: rgba(212,175,55,0.03);" onclick="window.jg_select_job('${j.id}')">${isHinglish ? 'Details Dekhein' : 'View Details'}</button>
          </div>`;
        });
        if (matchedJobs.length > 3) {
          botResponse += `<a href="#" onclick="window.jg_view_all_jobs(); return false;" style="color: #00d4ff; font-size: 12px; font-weight: 600; text-decoration: underline; display: block; margin-top: 5px;">+ ${isHinglish ? 'Baaki sari jobs dekhein' : 'View all remaining jobs'}</a>`;
        }
      } else if (cleanText.includes('hello') || cleanText.includes('hi') || cleanText.includes('hey') || cleanText.includes('namaste') || cleanText.includes('kaise ho')) {
        botResponse = isHinglish
          ? "Namaste! Main aapka <b>JobGold AI Assistant</b> hoon. Aaj main aapki kya madad kar sakta hoon?<br/><br/>Aap mujhse pooch sakte hain:<ul><li><b>'Shop jobs dikhao'</b></li><li><b>'Job apply kaise kare'</b></li><li><b>'Verification kaise hoga'</b></li></ul>"
          : "Hello! I am your JobGold AI Assistant. How can I guide you today?<br/><br/>Try asking me:<ul><li><b>'Show retail jobs'</b></li><li><b>'How to get verified'</b></li><li><b>'Post a job'</b></li></ul>";
      } else if (cleanText.includes('verify') || cleanText.includes('verification') || cleanText.includes('history')) {
        botResponse = isHinglish
          ? "Verification bahut aasan hai! Job seeker '<b>Share Job History</b>' par click karke apni purani job ki details submit karte hain. Purane manager ke approval ke baad unhe '<b>Verified Profile</b>' badge mil jata hai."
          : "Verification is simple! Job seekers can click '<b>Share Job History</b>' to submit details. The former manager will receive a validation request. Once approved, the candidate gets a '<b>Verified Profile</b>' badge.";
      } else if (cleanText.includes('job') || cleanText.includes('opening') || cleanText.includes('work') || cleanText.includes('hire') || cleanText.includes('kaise apply')) {
        botResponse = isHinglish
          ? "Job apply karne ke liye '<b>Browse Jobs</b>' par jayein aur kisi bhi job par Apply dabayein. Employer job post karne ke liye '<b>Post New Job</b>' option use kar sakte hain."
          : "To look for jobs, click '<b>Browse Jobs</b>' or view them on our live Map. To post a job, register as an Employer, log in, and click '<b>Post New Job</b>' in the menu.";
      } else if (cleanText.includes('salary') || cleanText.includes('match') || cleanText.includes('analyzer')) {
        botResponse = isHinglish
          ? "Humara <b>Match Analyzer</b> aapki target salary aur sector ke basis par Jodhpur ke live openings se matching percentage calculate karta hai."
          : "Our dynamic <b>Match Analyzer</b> evaluates matching rates by comparing your desired sector and target salary against active job openings in Jodhpur.";
      } else if (cleanText.includes('creator') || cleanText.includes('naresh') || cleanText.includes('designer') || cleanText.includes('banaya') || cleanText.includes('owner')) {
        botResponse = isHinglish
          ? "JobGold Portal ko <b>Naresh Suthar (The Designer)</b> ne design aur develop kiya hai. Vo ek expert full-stack developer hain!"
          : "JobGold was designed and created by <b>Naresh Suthar (The Designer)</b>, a senior full-stack developer focused on building ultra-premium, high-performance web applications.";
      } else if (cleanText.includes('contact') || cleanText.includes('email') || cleanText.includes('support')) {
        botResponse = isHinglish
          ? "Kisi bhi official query ke liye aap creator ko email kar sakte hain: <b>ns680578@gmail.com</b> par."
          : "For official inquiries, you can email our creator at <b>ns680578@gmail.com</b>, or check out his LinkedIn profile in the footer section.";
      } else if (cleanText.includes('register') || cleanText.includes('sign up') || cleanText.includes('account')) {
        botResponse = isHinglish
          ? "Account banane ke liye navbar me '<b>Register</b>' button par click karein. Details bharein aur Job Seeker ya Employer role select karein."
          : "To register, click on the '<b>Register</b>' button in the top navigation bar. Fill in your name, email, password, and select your role (Job Seeker or Employer) to create your account.";
      } else if (cleanText.includes('candidate') || cleanText.includes('profiles') || cleanText.includes('talent')) {
        botResponse = isHinglish
          ? "Verified candidates dekhne ke liye sidebar me '<b>Candidate Profiles</b>' par click karein."
          : "To view candidates, click '<b>Candidate Profiles</b>' in the sidebar. You will see verified local talent with their previous employment history and verification status.";
      } else if (cleanText.includes('application status') || cleanText.includes('tracker') || cleanText.includes('track my application')) {
        botResponse = isHinglish
          ? "Apni application ka status dekhne ke liye Dashboard par '<b>Live Job Application Tracker</b>' dekhein ya '<b>My Job Applications</b>' par click karein."
          : "To track your applications, look at the '<b>Live Job Application Tracker</b>' widget on your dashboard or click '<b>My Job Applications</b>' in the sidebar.";
      }

      const botMsgId = Date.now() + Math.random().toString(36).substring(2, 5);
      setChatMessages(prev => [...prev, { id: botMsgId, sender: 'bot', text: botResponse }]);
      setIsChatTyping(false);
      
      setTimeout(() => {
        const msgContainer = document.getElementById('chat-messages-container');
        if (msgContainer) {
          msgContainer.scrollTop = msgContainer.scrollHeight;
        }
      }, 50);
    }, 1200);
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
        (j.title || '').toLowerCase().includes(search) ||
        (j.description || '').toLowerCase().includes(search) ||
        (j.location || '').toLowerCase().includes(search) ||
        (j.company || '').toLowerCase().includes(search);

      const matchesCategory = category === '' || j.category === category;
      const matchesSalary = salary >= minSalary && salary <= maxSalary;

      return matchesSearch && matchesCategory && matchesSalary;
    });
  };

  // --- NOTIFICATION CLICK (MARK READ) ---
  const handleBellClick = async () => {
    if (!session) {
      return showToast('Please login to view notifications.', 'error');
    }

    if (showBellPopup) {
      setShowBellPopup(false);
    } else {
      setShowBellPopup(true);
      if (session.user.role === 'jobseeker') {
        try {
          await apiFetch('/api/hire-requests/read-all', { method: 'POST' });
          loadData();
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

  // --- PREPARE FORMS ON TRANSITIONS ---
  const handleNavClick = (viewName) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveView(viewName);
    setShowBellPopup(false);

    if (viewName === 'jobs' || viewName === 'dashboard') {
      setSearchQuery('');
      setSearchCategory('');
      setSearchSalaryRange('');
    }

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
              {a.experience && <span title="Experience"><i className="fa-solid fa-briefcase" style={{ color: 'var(--gold)' }}></i> {a.experience}</span>}
              {a.qualification && <span title="Qualification"><i className="fa-solid fa-graduation-cap" style={{ color: '#ff9800' }}></i> {a.qualification}</span>}
              {a.expectedSalary && <span title="Expected Salary"><i className="fa-solid fa-indian-rupee-sign" style={{ color: '#4caf50' }}></i> ₹{a.expectedSalary}/Mo</span>}
              {a.resumeUrl && <span title="Resume / Portfolio"><i className="fa-solid fa-link" style={{ color: '#e91e63' }}></i> <a href={a.resumeUrl} target="_blank" rel="noreferrer" style={{ color: '#00d4ff', textDecoration: 'underline' }}>Resume Link</a></span>}
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
    const myApps = applications.filter(a => session?.user?.role === 'admin' || (a.email && session?.user?.email && a.email.toLowerCase() === session.user.email.toLowerCase())).slice().reverse();

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
              Applied On: {new Date(a.applied || Date.now()).toLocaleDateString()}
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
    return applications.some(a => a.jobId === jobId && a.email && session?.user?.email && a.email.toLowerCase() === session.user.email.toLowerCase());
  };

  // --- SHARED JOBS LIST COMPONENT ---
  const renderJobsList = (jobsToRender) => {
    if (jobsToRender.length === 0) {
      const hasActiveFilters = searchQuery || searchCategory || searchSalaryRange;
      return (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)', background: 'var(--card-bg)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '32px', marginBottom: '15px', color: 'var(--gold-light)' }}></i>
          <p style={{ margin: 0, fontSize: '15px', fontWeight: '500', color: 'var(--text-main)' }}>No jobs found matching your criteria.</p>
          <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>Try adjusting your search terms or filters to find other openings.</p>
          {hasActiveFilters && (
            <button 
              className="btn" 
              style={{ marginTop: '15px', borderColor: 'var(--gold)', color: 'var(--gold)', background: 'rgba(212,175,55,0.05)' }} 
              onClick={() => {
                setSearchQuery('');
                setSearchCategory('');
                setSearchSalaryRange('');
                showToast('Filters reset.', 'info');
              }}
            >
              Reset Search / Show All Jobs
            </button>
          )}
        </div>
      );
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
      } else {
        actionButtons = (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {session && (
              <i 
                className={`fa-solid fa-heart like-job-icon ${isSaved ? 'liked' : 'unliked'}`}
                onClick={() => handleToggleSaveJob(j.id)}
                title={isSaved ? 'Remove from Saved' : 'Save Job'}
              ></i>
            )}
            {session && isApplied ? (
              <button className="btn" style={{ marginTop: 'auto', background: 'var(--green)', color: '#000', border: 'none' }} disabled>
                Applied <i className="fa-solid fa-check"></i>
              </button>
            ) : (
              <button 
                className="btn cta" 
                style={{ marginTop: 'auto' }} 
                onClick={() => {
                  if (!session) {
                    setIsAuthModalOpen(true);
                    setIsAuthWrapperToggled(false);
                    showToast('Please log in to apply for jobs.', 'info');
                  } else {
                    setApplyJobId(j.id);
                    setAppName(session.user.name || 'Candidate');
                    setAppEmail(session.user.email || '');
                    setAppPhone(session.user.phone || '9829012345');
                    setAppExperience('1-2 Years');
                    setAppQualification('Graduate');
                    setAppExpectedSalary('25000');
                  }
                }}
              >
                Apply Now <i className="fa-solid fa-paper-plane"></i>
              </button>
            )}
          </div>
        );
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
        <button className="hamburger-btn" onClick={() => setIsMobileDrawerOpen(true)} title="Open Menu">
          <i className="fa-solid fa-bars"></i>
        </button>

        <div className="brand" onClick={() => setActiveView('dashboard')}>
          <div className="brandLogo"><i className="fa-solid fa-crown"></i></div>
          <div>
            <div className="brandTitle">Job<span>Gold</span></div>
            <div className="brand-tagline">ELITE HIRING NETWORK</div>
          </div>
        </div>

        <div className="navlinks" id="topLinks">
          <button className={activeView === 'dashboard' ? 'active' : ''} onClick={() => handleNavClick('dashboard')}><i className="fa-solid fa-gauge-high"></i> Dashboard</button>
          <button className={activeView === 'jobs' ? 'active' : ''} onClick={() => handleNavClick('jobs')}><i className="fa-solid fa-briefcase"></i> Browse Jobs</button>
          
          {session && (
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
            <h4 style={{ margin: '0 0 10px 0', color: 'var(--gold-light)', fontSize: '16px' }}>
              {session.user.role === 'jobseeker' ? 'Hire Notifications' : 'Pending Applications'}
            </h4>
            <div id="notificationList">
              {session.user.role === 'jobseeker' ? (
                hireRequests.length === 0 ? (
                  <div className="no-notifications">No new hire requests.</div>
                ) : (
                  hireRequests.slice().reverse().slice(0, 5).map(req => (
                    <div key={req.id} className="notification-item" style={{ background: !req.read ? 'rgba(212,175,55,0.1)' : 'transparent' }}>
                      {!req.read && <i className="fa-solid fa-circle" style={{ fontSize: '8px', color: 'var(--red)', marginRight: '5px' }}></i>}
                      New Offer: <strong>{req.jobTitle}</strong> (₹{req.salary}) from {req.employerName}.
                    </div>
                  ))
                )
              ) : (
                getUnreadNotifications().length === 0 ? (
                  <div className="no-notifications">No pending applications.</div>
                ) : (
                  getUnreadNotifications().slice(0, 5).map(app => (
                    <div key={app.id} className="notification-item" onClick={() => { setActiveView('employer-apps'); setShowBellPopup(false); }} style={{ cursor: 'pointer' }}>
                      <i className="fa-solid fa-circle" style={{ fontSize: '8px', color: 'var(--gold)', marginRight: '5px' }}></i>
                      <strong>{app.name}</strong> applied for <strong>{app.jobTitle}</strong>.
                    </div>
                  ))
                )
              )}
              {session.user.role === 'jobseeker' && hireRequests.length > 5 && (
                <div className="notification-item" style={{ textAlign: 'center' }}>
                  <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('notifications'); setShowBellPopup(false); }} style={{ color: 'var(--gold)' }}>
                    View All {hireRequests.length} Notifications
                  </a>
                </div>
              )}
              {session.user.role !== 'jobseeker' && getUnreadNotifications().length > 5 && (
                <div className="notification-item" style={{ textAlign: 'center' }}>
                  <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('employer-apps'); setShowBellPopup(false); }} style={{ color: 'var(--gold)' }}>
                    View All {getUnreadNotifications().length} Applications
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
            <div id="userNav" style={{ display: 'flex', gap: '12px', alignItems: 'center', position: 'relative' }}>
              {/* User Avatar Chip Trigger (Compact & Clean) */}
              <div 
                id="user-chip-trigger"
                className="user-avatar-chip"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                title="Account Options"
              >
                {(() => {
                  const p = profiles.find(pr => pr.userId === session.user.id || pr.email?.toLowerCase() === session.user.email?.toLowerCase());
                  if (p?.photoUrl && !p.photoUrl.includes('placeholder') && !p.photoUrl.includes('dicebear')) {
                    return (
                      <div className="user-chip-img" style={{ background: 'transparent', border: 'none' }}>
                        <img src={p.photoUrl} alt={session.user.name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--gold)' }} />
                        <span className="online-dot"></span>
                      </div>
                    );
                  }
                  return (
                    <div className="user-chip-img" style={{ background: 'linear-gradient(135deg, var(--gold), #00d4ff)', color: '#000', fontWeight: 900, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {session.user.name.charAt(0).toUpperCase()}
                      <span className="online-dot"></span>
                    </div>
                  );
                })()}
                <div style={{ textAlign: 'left', lineHeight: '1' }}>
                  <div className="user-glam-name" style={{ fontSize: '20px' }}>{session.user.name}</div>
                </div>
                <i className={`fa-solid ${showUserDropdown ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '2px' }}></i>
              </div>

              {/* Floating User Account Dropdown Menu (Strictly Profile & Logout) */}
              {showUserDropdown && (
                <div id="user-dropdown-menu" className="user-dropdown-menu">
                  <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px' }}>{session.user.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase' }}>{session.user.role}</div>
                  </div>
                  
                  <div className="user-dropdown-item" onClick={() => { setActiveView('about-me'); setShowUserDropdown(false); }}>
                    <i className="fa-solid fa-user-gear" style={{ color: 'var(--gold)' }}></i> My Profile
                  </div>
                  
                  <div className="user-dropdown-item logout" onClick={() => { handleLogout(); setShowUserDropdown(false); }}>
                    <i className="fa-solid fa-power-off"></i> Logout
                  </div>
                </div>
              )}
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
              <button className={activeView === 'about-me' ? 'active' : ''} onClick={() => handleNavClick('about-me')}><i className="fa-solid fa-user-gear" style={{ color: 'var(--gold)' }}></i> My Profile & Settings</button>
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
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (activeView !== 'jobs') setActiveView('jobs');
                      }}
                    />
                    <div 
                      id="voiceSearchBtn" 
                      onClick={() => {
                        handleVoiceSearch();
                        if (activeView !== 'jobs') setActiveView('jobs');
                      }} 
                      className={isListening ? 'listening' : ''} 
                      title="Search using your voice (Simulated)"
                    >
                      <i className="fa-solid fa-microphone"></i>
                    </div>
                  </div>
                  <select id="searchCategory" value={searchCategory} onChange={(e) => {
                    setSearchCategory(e.target.value);
                    if (activeView !== 'jobs') setActiveView('jobs');
                  }}>
                    <option value="">✨ All Categories</option>
                    {cats.map(c => <option key={c} value={c}>{catConfig[c].emoji} {c}</option>)}
                  </select>
                  <select id="searchSalaryRange" value={searchSalaryRange} onChange={(e) => {
                    setSearchSalaryRange(e.target.value);
                    if (activeView !== 'jobs') setActiveView('jobs');
                  }}>
                    <option value="">Salary Range</option>
                    <option value="0-10000">0 - 10K</option>
                    <option value="10000-20000">10K - 20K</option>
                    <option value="20000-30000">20K - 30K</option>
                    <option value="30000-50000">30K - 50K</option>
                    <option value="50000-999999">50K+</option>
                  </select>
                  <button className="btn cta" id="searchBtn" style={{ borderRadius: '8px' }} onClick={() => { loadData(); setActiveView('jobs'); }}>Find Elite Match</button>
                  
                  {(searchQuery || searchCategory || searchSalaryRange) && (
                    <button 
                      className="btn" 
                      style={{ borderRadius: '8px', borderColor: 'var(--red)', color: 'var(--red)', background: 'rgba(255,68,68,0.05)' }} 
                      onClick={() => {
                        setSearchQuery('');
                        setSearchCategory('');
                        setSearchSalaryRange('');
                        showToast('Search filters cleared.', 'info');
                      }}
                    >
                      <i className="fa-solid fa-xmark"></i> Clear
                    </button>
                  )}
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
                {/* 4 Stat Cards in Stats Grid */}
                <div className="stats-grid">
                  {/* Card 1: Active Job Posts */}
                  <div className="card stat-card" onClick={() => setActiveView('jobs')} style={{ cursor: 'pointer', margin: 0 }}>
                    <div className="stat-icon"><i className="fa-solid fa-briefcase"></i></div>
                    <div>
                      <div className="stat-value" id="statJobs">{jobs.length}</div>
                      <div className="stat-label">Active Jobs</div>
                    </div>
                  </div>
                  
                  {/* Card 2: Verified Candidates */}
                  <div className="card stat-card" onClick={() => setActiveView('profiles')} style={{ cursor: 'pointer', margin: 0, borderLeftColor: '#4caf50' }}>
                    <div className="stat-icon" style={{ color: '#4caf50', boxShadow: '0 0 15px rgba(76, 175, 80, 0.2)' }}><i className="fa-solid fa-user-check"></i></div>
                    <div>
                      <div className="stat-value" style={{ color: 'var(--text-main)' }}>{profiles.filter(p => p.status === 'Verified').length}</div>
                      <div className="stat-label">Verified Talent</div>
                    </div>
                  </div>
                  
                  {/* Card 3: Pending Applications */}
                  <div className="card stat-card" onClick={() => setActiveView(session?.user?.role === 'jobseeker' ? 'jobseeker-apps' : (session?.user?.role === 'employer' || session?.user?.role === 'admin' ? 'employer-apps' : 'dashboard'))} style={{ cursor: 'pointer', margin: 0, borderLeftColor: '#00d4ff' }}>
                    <div className="stat-icon" style={{ color: '#00d4ff', boxShadow: '0 0 15px rgba(0, 212, 255, 0.2)' }}><i className="fa-solid fa-file-invoice"></i></div>
                    <div>
                      <div className="stat-value" style={{ background: 'linear-gradient(90deg, var(--text-main), #00d4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {session ? (
                          session.user.role === 'admin' ? applications.length :
                          session.user.role === 'employer' ? applications.filter(a => jobs.filter(j => j.creatorId === session.user.id).map(j => j.id).includes(a.jobId)).length :
                          applications.filter(a => a.email && session?.user?.email && a.email.toLowerCase() === session.user.email.toLowerCase()).length
                        ) : '0'}
                      </div>
                      <div className="stat-label">
                        {session ? (
                          session.user.role === 'admin' ? 'Total Applications' :
                          session.user.role === 'employer' ? 'Applications Received' :
                          'My Applications'
                        ) : 'Applications (Guest)'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Card 4: Successful Matches */}
                  <div className="card stat-card" style={{ margin: 0, borderLeftColor: 'var(--gold-light)' }}>
                    <div className="stat-icon" style={{ color: 'var(--gold-light)', boxShadow: '0 0 15px var(--gold-glow)' }}><i className="fa-solid fa-handshake"></i></div>
                    <div>
                      <div className="stat-value" style={{ color: 'var(--gold-light)' }}>
                        {appStatusList.filter(s => s.status === 'Accepted').length + 8}
                      </div>
                      <div className="stat-label">Success Matches</div>
                    </div>
                  </div>
                </div>

                <div className="dashboard-layout" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', marginBottom: '24px' }}>
                  {/* Left Column: Quick Actions & Analyzer & Tracker */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Quick Actions Card */}
                    <div className="card" style={{ margin: 0, textAlign: 'left' }}>
                      <h3 style={{ fontSize: '20px', color: 'var(--gold-light)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-bolt"></i> Elite Quick Actions
                      </h3>
                      <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>
                        Accelerate your workflow with primary shortcuts tailored to you.
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '12px' }}>
                        {!session ? (
                          <>
                            <button className="btn cta" onClick={() => { setIsAuthModalOpen(true); setIsAuthWrapperToggled(false); }}>
                              <i className="fa-solid fa-arrow-right-to-bracket"></i> Login / Enter
                            </button>
                            <button className="btn" onClick={() => { setIsAuthModalOpen(true); setIsAuthWrapperToggled(true); }}>
                              <i className="fa-solid fa-user-plus"></i> Register
                            </button>
                            <button className="btn" onClick={() => handleNavClick('jobs')}>
                              <i className="fa-solid fa-briefcase"></i> Browse Jobs
                            </button>
                          </>
                        ) : session.user.role === 'employer' ? (
                          <>
                            <button className="btn cta" onClick={() => handleNavClick('add')}>
                              <i className="fa-solid fa-circle-plus"></i> Post Job
                            </button>
                            <button className="btn" onClick={() => handleNavClick('employer-apps')}>
                              <i className="fa-solid fa-envelope-open-text"></i> Applications
                            </button>
                            <button className="btn" onClick={() => handleNavClick('profiles')}>
                              <i className="fa-solid fa-user-tie"></i> Search Talent
                            </button>
                          </>
                        ) : session.user.role === 'jobseeker' ? (
                          <>
                            <button className="btn cta" onClick={() => handleNavClick('submit-history')}>
                              <i className="fa-solid fa-clock-rotate-left"></i> Share History
                            </button>
                            <button className="btn" onClick={() => handleNavClick('jobs')}>
                              <i className="fa-solid fa-briefcase"></i> Find Jobs
                            </button>
                            <button className="btn" onClick={() => handleNavClick('saved-jobs')}>
                              <i className="fa-solid fa-heart"></i> Saved Jobs
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="btn cta" onClick={() => handleNavClick('add')}>
                              <i className="fa-solid fa-plus"></i> Post Job
                            </button>
                            <button className="btn" onClick={() => handleNavClick('employer-apps')}>
                              <i className="fa-solid fa-list"></i> Applications
                            </button>
                            <button className="btn" onClick={() => handleNavClick('about-me')}>
                              <i className="fa-solid fa-gears"></i> Admin Settings
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Live Market Insights Hub */}
                    <div className="card match-analyzer-card" style={{ margin: 0 }}>
                      <h3 style={{ fontSize: '20px', color: '#00d4ff', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-chart-pie"></i> ⚡ Live Regional Market Insights
                      </h3>
                      <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>
                        Real-time stats on active recruitment trends in Jodhpur, Rajasthan.
                      </p>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                        <div style={{ background: 'var(--panel)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border)', textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Top Hiring Sector</div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--gold)', marginTop: '6px' }}>Tech & Operations</div>
                        </div>
                        <div style={{ background: 'var(--panel)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border)', textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Avg Hiring Time</div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#4caf50', marginTop: '6px' }}>24 Hours</div>
                        </div>
                        <div style={{ background: 'var(--panel)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border)', textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Talent Demand</div>
                        </div>
                      </div>
                    </div>

                    {/* Application Status Tracker */}
                    {session && session.user.role === 'jobseeker' && (
                      <div className="card" style={{ margin: 0, textAlign: 'left' }}>
                        <h3 style={{ fontSize: '20px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <i className="fa-solid fa-signal" style={{ color: 'var(--gold)' }}></i> Live Job Application Tracker
                        </h3>
                        <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Monitor the real-time progress of your applications.</p>
                        {applications.filter(a => a.email && session?.user?.email && a.email.toLowerCase() === session.user.email.toLowerCase()).length > 0 ? (
                          (() => {
                            const myApps = applications.filter(a => a.email && session?.user?.email && a.email.toLowerCase() === session.user.email.toLowerCase());
                            const latestApp = myApps[myApps.length - 1];
                            const statuses = appStatusList.filter(s => s.appId === latestApp.id).sort((x, y) => new Date(y.date) - new Date(x.date));
                            const status = statuses[0] ? statuses[0].status : 'Submitted';
                            
                            return (
                              <div style={{ marginTop: '20px' }}>
                                <div style={{ fontSize: '14px', color: 'var(--text-main)', marginBottom: '15px' }}>
                                  Latest Application: <strong>{latestApp.jobTitle}</strong>
                                </div>
                                <div className="tracker-timeline">
                                  <div className="tracker-node completed">
                                    <div className="tracker-circle"><i className="fa-solid fa-check"></i></div>
                                    <div className="tracker-label">Submitted</div>
                                  </div>
                                  <div className={`tracker-node ${status === 'Pending' || status === 'Accepted' || status === 'Rejected' ? 'completed' : 'active'}`}>
                                    <div className="tracker-circle">
                                      {status === 'Pending' || status === 'Accepted' || status === 'Rejected' ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-spinner fa-spin"></i>}
                                    </div>
                                    <div className="tracker-label">Under Review</div>
                                  </div>
                                  <div className={`tracker-node ${status === 'Accepted' || status === 'Rejected' ? 'completed' : status === 'Pending' ? 'active' : ''}`}>
                                    <div className="tracker-circle">
                                      {status === 'Accepted' || status === 'Rejected' ? <i className="fa-solid fa-check"></i> : '3'}
                                    </div>
                                    <div className="tracker-label">Hiring Decision</div>
                                  </div>
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '10px', textAlign: 'center' }}>
                                  Current Status: <strong style={{ color: status === 'Accepted' ? 'var(--green)' : status === 'Rejected' ? 'var(--red)' : 'var(--gold-light)' }}>{status}</strong>
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          <div style={{ textAlign: 'center', padding: '15px', color: 'var(--muted)', fontSize: '13px' }}>
                            You have no active applications. Apply for jobs to track their status here!
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Trending Sectors */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="card" style={{ margin: 0, height: '100%', textAlign: 'left' }}>
                      <h3 style={{ fontSize: '20px', color: '#00d4ff', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-fire"></i> Trending Sectors
                      </h3>
                      <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>
                        Explore the highest demand job categories in Jodhpur.
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {cats.map(c => {
                          const count = jobs.filter(j => j.category === c).length;
                          return (
                            <div 
                              key={c} 
                              className="category-item-card" 
                              onClick={() => {
                                setSearchCategory(c);
                                setActiveView('jobs');
                              }}
                              style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                padding: '12px 15px', 
                                background: 'rgba(255,255,255,0.02)', 
                                borderRadius: '10px', 
                                border: '1px solid var(--border)',
                                cursor: 'pointer',
                                transition: 'all 0.3s'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '18px' }}>{catConfig[c].emoji}</span>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>{c}</span>
                              </div>
                              <span className="pill" style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '20px' }}>{count} Job(s)</span>
                            </div>
                          );
                        })}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '10px', flexWrap: 'wrap' }}>
                  <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>View available job locations on the map below (Jodhpur, Rajasthan, India).</p>
                  <button className="btn profile-edit-btn" id="locate-me-btn" style={{ fontSize: '12px', padding: '6px 12px' }}>
                    <i className="fa-solid fa-location-crosshairs" style={{ color: 'var(--gold)' }}></i> Center on My Location
                  </button>
                </div>
                <div id="map-container" className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div id="map" style={{ width: '100%', height: '100%', borderRadius: '12px' }}></div>
                </div>
              </div>
            )}

            {/* 3. Personalized User Profile & Control Hub */}
            {activeView === 'about-me' && (
              <div id="view-about-me" className="view">
                {!session ? (
                  <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
                    <i className="fa-solid fa-user-lock" style={{ fontSize: '48px', color: 'var(--gold)', marginBottom: '20px' }}></i>
                    <h2 style={{ color: 'var(--text-main)', margin: '0 0 10px 0' }}>Executive Account Portal</h2>
                    <p style={{ color: 'var(--muted)', fontSize: '14px', maxWidth: '450px', margin: '0 auto 25px auto' }}>
                      Please log in or create a JobGold account to access your personal control hub, track applications, and manage verified credentials.
                    </p>
                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                      <button className="btn cta" onClick={() => { setIsAuthModalOpen(true); setIsAuthWrapperToggled(false); }}>
                        <i className="fa-solid fa-arrow-right-to-bracket"></i> Login Now
                      </button>
                      <button className="btn" onClick={() => { setIsAuthModalOpen(true); setIsAuthWrapperToggled(true); }}>
                        <i className="fa-solid fa-user-plus"></i> Register Account
                      </button>
                    </div>
                  </div>
                ) : (
                  (() => {
                    const myApps = applications.filter(a => a.email && session?.user?.email && a.email.toLowerCase() === session.user.email.toLowerCase());
                    const myProf = profiles.find(p => p.userId === session.user.id || p.email?.toLowerCase() === session.user.email?.toLowerCase());
                    
                    // Dynamic calculation of completeness score
                    let score = 30; // Base registration
                    const tasks = [
                      { id: 't_reg', title: 'Account Registration Active', done: true, points: 30, action: null },
                      { id: 't_photo', title: 'Upload Profile Avatar Photo', done: !!(myProf?.photoUrl && !myProf.photoUrl.includes('placeholder') && !myProf.photoUrl.includes('dicebear')), points: 15, action: 'photo' },
                      { id: 't_role', title: 'Specify Target Role & Salary', done: !!(myProf?.currentRole || userProfRole), points: 15, action: 'role' },
                      { id: 't_skills', title: 'Add Key Skills & Professional Bio', done: !!(myProf?.experience && myProf.experience.length > 20), points: 20, action: 'bio' },
                      { id: 't_verify', title: 'Submit Job History for Verification', done: !!(myProf && myProf.status === 'Verified'), points: 20, action: 'history' }
                    ];

                    const totalDone = tasks.filter(t => t.done).reduce((acc, t) => acc + t.points, 0);

                    const handleSaveUserProfile = () => {
                      if (userProfName.trim()) {
                        setSession(prev => prev ? { ...prev, user: { ...prev.user, name: userProfName.trim() } } : prev);
                      }
                      
                      // Update or create in profiles list
                      setProfiles(prev => {
                        const idx = prev.findIndex(p => p.userId === session.user.id || p.email?.toLowerCase() === session.user.email?.toLowerCase());
                        const updatedObj = {
                          id: idx >= 0 ? prev[idx].id : `p_user_${Date.now()}`,
                          userId: session.user.id,
                          name: userProfName.trim() || session.user.name,
                          email: session.user.email,
                          phone: userProfPhone || '9829012345',
                          currentRole: userProfRole || (session.user.role === 'jobseeker' ? 'Executive Applicant' : 'Hiring Manager'),
                          experience: userProfBio || 'Experienced professional looking for elite opportunities in Jodhpur.',
                          photoUrl: userProfPhotoUrl || '',
                          status: idx >= 0 ? prev[idx].status : 'Pending Verification'
                        };
                        if (idx >= 0) {
                          const copy = [...prev];
                          copy[idx] = updatedObj;
                          return copy;
                        }
                        return [...prev, updatedObj];
                      });

                      setIsEditingUserProfile(false);
                      showToast('Personal Profile updated successfully! ✨', 'success');
                    };

                    return (
                      <>
                        {/* Executive Passport Header Card */}
                        <div className="card" style={{ marginBottom: '25px', padding: '0', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
                          <div style={{ height: '100px', background: 'linear-gradient(135deg, #0b0c10, #1f2937)', position: 'relative', borderBottom: '2px solid var(--gold)' }}>
                            <div style={{ position: 'absolute', top: '15px', right: '20px', display: 'flex', gap: '10px' }}>
                              <span className="pill" style={{ background: 'rgba(212,175,55,0.2)', color: 'var(--gold)', border: '1px solid var(--gold)', padding: '4px 12px', fontSize: '11px', fontWeight: 800 }}>
                                <i className="fa-solid fa-crown"></i> {session.user.role.toUpperCase()}
                              </span>
                            </div>
                          </div>

                          <div style={{ padding: '0 30px 30px 30px', marginTop: '-40px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px' }}>
                                <div style={{ position: 'relative' }}>
                                  {myProf?.photoUrl && !myProf.photoUrl.includes('placeholder') && !myProf.photoUrl.includes('dicebear') ? (
                                    <img 
                                      src={myProf.photoUrl} 
                                      alt={session.user.name} 
                                      style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--card-bg)', boxShadow: '0 8px 25px rgba(0,0,0,0.3)' }}
                                    />
                                  ) : (
                                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold), #00d4ff)', color: '#000', fontSize: '42px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid var(--card-bg)', boxShadow: '0 8px 25px rgba(0,0,0,0.3)' }}>
                                      {session.user.name.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <span style={{ position: 'absolute', bottom: '6px', right: '6px', width: '16px', height: '16px', background: '#4caf50', borderRadius: '50%', border: '2px solid var(--card-bg)' }} title="Online"></span>
                                </div>
                                <div style={{ marginBottom: '5px' }}>
                                  <h2 style={{ margin: 0, fontSize: '28px', color: 'var(--text-main)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {session.user.name}
                                    <i className="fa-solid fa-circle-check" style={{ color: '#00d4ff', fontSize: '18px' }} title="Verified Candidate"></i>
                                  </h2>
                                  <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--muted)', fontWeight: 600 }}>
                                    <i className="fa-solid fa-briefcase" style={{ color: 'var(--gold)' }}></i> {myProf?.currentRole || (session.user.role === 'jobseeker' ? 'Executive Job Seeker' : 'Hiring Manager')} • <i className="fa-solid fa-location-dot" style={{ color: '#00d4ff' }}></i> Jodhpur, Rajasthan
                                  </p>
                                </div>
                              </div>

                              <button 
                                className="btn cta" 
                                style={{ borderRadius: '25px', padding: '10px 22px' }}
                                onClick={() => {
                                  setUserProfName(session.user.name);
                                  setUserProfPhone(myProf?.phone || '');
                                  setUserProfRole(myProf?.currentRole || '');
                                  setUserProfBio(myProf?.experience || '');
                                  setUserProfPhotoUrl(myProf?.photoUrl || '');
                                  setIsEditingUserProfile(!isEditingUserProfile);
                                }}
                              >
                                <i className="fa-solid fa-user-pen"></i> {isEditingUserProfile ? 'Close Editor' : 'Edit Executive Profile'}
                              </button>
                            </div>

                            {/* Completeness Gauge & Checklist */}
                            <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <i className="fa-solid fa-chart-line" style={{ color: 'var(--gold)' }}></i> Executive Onboarding Score
                                </span>
                                <span style={{ fontSize: '15px', fontWeight: 900, color: totalDone === 100 ? '#4caf50' : 'var(--gold)' }}>
                                  {totalDone}% Verified {totalDone === 100 ? '✨ (Master Gold Candidate)' : '🎯'}
                                </span>
                              </div>
                              <div style={{ width: '100%', height: '8px', background: 'var(--panel)', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px' }}>
                                <div style={{ width: `${totalDone}%`, height: '100%', background: totalDone === 100 ? '#4caf50' : 'linear-gradient(90deg, var(--gold), #00d4ff)', borderRadius: '4px', transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                              </div>

                              {/* Action Checklist */}
                              <div style={{ background: 'var(--panel)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <i className="fa-solid fa-list-check"></i> Onboarding Action Checklist:
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                                  {tasks.map(t => (
                                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--card-bg)', padding: '12px 16px', borderRadius: '10px', border: t.done ? '1px solid rgba(76,175,80,0.4)' : '1px solid var(--border)' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-main)', fontWeight: 600 }}>
                                        <i className={`fa-solid ${t.done ? 'fa-circle-check' : 'fa-circle-dot'}`} style={{ color: t.done ? '#4caf50' : 'var(--gold)', fontSize: '16px' }}></i>
                                        <span style={{ textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.7 : 1 }}>{t.title}</span>
                                      </div>
                                      {!t.done && t.action && (
                                        <button 
                                          className="btn cta" 
                                          style={{ padding: '4px 10px', fontSize: '11px', height: 'auto', borderRadius: '15px' }}
                                          onClick={() => {
                                            if (t.action === 'history') setActiveView('submit-history');
                                            else {
                                              setIsEditingUserProfile(true);
                                              window.scrollTo({ top: 400, behavior: 'smooth' });
                                            }
                                          }}
                                        >
                                          Complete
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Inline Edit Profile Editor Form */}
                        {isEditingUserProfile && (
                          <div className="card" style={{ marginBottom: '25px', border: '2px solid var(--gold)', boxShadow: '0 0 30px rgba(212,175,55,0.2)' }}>
                            <h3 style={{ color: 'var(--gold)', marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <i className="fa-solid fa-user-gear"></i> Edit Executive Profile Details
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '20px' }}>
                              <div>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>Full Name</label>
                                <input value={userProfName} onChange={(e) => setUserProfName(e.target.value)} placeholder="Your Name" />
                              </div>
                              <div>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>Contact Phone</label>
                                <input value={userProfPhone} onChange={(e) => setUserProfPhone(e.target.value)} placeholder="e.g. 9829012345" />
                              </div>
                              <div>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>Current or Desired Role</label>
                                <input value={userProfRole} onChange={(e) => setUserProfRole(e.target.value)} placeholder="e.g. Senior Manager / Technician" />
                              </div>
                              <div>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>Avatar Photo URL</label>
                                <input value={userProfPhotoUrl} onChange={(e) => setUserProfPhotoUrl(e.target.value)} placeholder="https://..." />
                              </div>
                            </div>
                            <div style={{ marginTop: '16px' }}>
                              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>Professional Bio & Key Skills Overview</label>
                              <textarea value={userProfBio} onChange={(e) => setUserProfBio(e.target.value)} placeholder="Describe your experience, achievements, and technical expertise..." style={{ height: '90px' }}></textarea>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                              <button className="btn" onClick={() => setIsEditingUserProfile(false)}>Cancel</button>
                              <button className="btn cta" onClick={handleSaveUserProfile}><i className="fa-solid fa-floppy-disk"></i> Save Changes</button>
                            </div>
                          </div>
                        )}

                        {/* Candidate Credentials Overview */}
                        <div className="card" style={{ padding: '30px' }}>
                          <h3 style={{ color: 'var(--text-main)', marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px' }}>
                            <i className="fa-solid fa-id-card" style={{ color: 'var(--gold)' }}></i> Verified Credentials & Experience Bio
                          </h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '20px' }}>
                            <div style={{ background: 'var(--panel)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border)', borderLeft: '4px solid var(--gold)' }}>
                              <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 800 }}>Registered Email</div>
                              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>{session.user.email}</div>
                            </div>
                            <div style={{ background: 'var(--panel)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border)', borderLeft: '4px solid #00d4ff' }}>
                              <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 800 }}>Phone Contact</div>
                              <div style={{ fontSize: '15px', fontWeight: 800, color: '#00d4ff' }}>{myProf?.phone || 'Not Specified'}</div>
                            </div>
                            <div style={{ background: 'var(--panel)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border)', borderLeft: '4px solid #4caf50' }}>
                              <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 800 }}>Target Sector</div>
                              <div style={{ fontSize: '15px', fontWeight: 800, color: '#4caf50' }}>{myProf?.currentRole || 'General Member'}</div>
                            </div>
                          </div>

                          <div style={{ marginTop: '25px' }}>
                            <h4 style={{ color: 'var(--gold)', marginBottom: '12px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <i className="fa-solid fa-feather-pointed"></i> Professional Experience Summary
                            </h4>
                            <div style={{ background: 'var(--panel)', padding: '22px', borderRadius: '12px', border: '1px solid var(--border)', borderLeft: '4px solid var(--gold)', fontSize: '14px', lineHeight: '1.8', color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
                              {myProf?.experience || 'No personal bio added yet. Click "Edit Executive Profile" above to add your professional summary and showcase your key skills!'}
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()
                )}

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
                    {histId ? 'Admin/Owner: Update the candidate\'s profile information.' : 'Provide your previous employment history. This verified information significantly increases your profile\'s trust and hiring match rate.'}
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
                      <textarea placeholder="Describe your previous work responsibilities in detail (e.g., daily tasks, tools used, duration, achievements)..." value={histDescription} onChange={(e) => setHistDescription(e.target.value)} style={{ height: '120px' }} required></textarea>
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
          <div className="card" style={{ width: '540px', border: '1px solid var(--gold)', boxShadow: '0 0 50px rgba(212,175,55,0.25)' }}>
            <h3 id="applyJobTitle" style={{ color: 'var(--gold)', fontSize: '22px', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <i className="fa-solid fa-paper-plane"></i> Apply for: {jobs.find(j => j.id === applyJobId)?.title || 'Job'}
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '12px', margin: '6px 0 20px 0' }}>
              Fields marked with (<span style={{ color: 'var(--red)', fontWeight: 'bold' }}>*</span>) are mandatory.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Full Name <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <input placeholder="Enter your full name" value={appName} onChange={(e) => setAppName(e.target.value)} required />
              </div>

              <div className="row" style={{ gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Email Address
                  </label>
                  <input value={appEmail} readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Phone Number <span style={{ color: 'var(--red)' }}>*</span>
                  </label>
                  <input placeholder="Mobile Number" value={appPhone} onChange={(e) => setAppPhone(e.target.value)} required />
                </div>
              </div>
              
              <div className="row" style={{ gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Experience <span style={{ color: 'var(--red)' }}>*</span>
                  </label>
                  <select value={appExperience} onChange={(e) => setAppExperience(e.target.value)} required>
                    <option value="" disabled>Select Experience</option>
                    <option value="Fresher">Freshers / No Exp</option>
                    <option value="1-2 Years">1-2 Years Exp</option>
                    <option value="3-5 Years">3-5 Years Exp</option>
                    <option value="5+ Years">5+ Years Exp</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Qualification <span style={{ color: 'var(--red)' }}>*</span>
                  </label>
                  <select value={appQualification} onChange={(e) => setAppQualification(e.target.value)} required>
                    <option value="" disabled>Select Qualification</option>
                    <option value="10th Pass">10th Pass</option>
                    <option value="12th Pass">12th Pass</option>
                    <option value="Graduate">Graduate</option>
                    <option value="Post Graduate">Post Graduate</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Expected Monthly Salary (₹) <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <input type="number" placeholder="e.g. 25000" value={appExpectedSalary} onChange={(e) => setAppExpectedSalary(e.target.value)} required />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Upload Resume / CV <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(Optional)</span>
                </label>
                <input 
                  type="file" 
                  accept=".pdf,.doc,.docx,image/*" 
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setAppResumeUrl(`[File Attached: ${file.name}]`);
                      showToast(`Resume file attached: ${file.name}`, 'info');
                    }
                  }} 
                  style={{ padding: '8px' }}
                />
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                  Or paste URL: <input type="url" placeholder="https://drive.google.com/..." value={appResumeUrl} onChange={(e) => setAppResumeUrl(e.target.value)} style={{ marginTop: '4px' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Key Skills & Cover Note
                </label>
                <textarea placeholder="List your key skills, availability or daily tasks..." value={appSkills} onChange={(e) => setAppSkills(e.target.value)} style={{ height: '80px' }}></textarea>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button className="btn" onClick={() => setApplyJobId(null)}>Cancel</button>
                <button className="btn cta" onClick={handleApplyJob}>Submit Application <i className="fa-solid fa-paper-plane"></i></button>
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
      {/* Mobile Drawer Overlay */}
      <div className={`mobile-drawer-overlay ${isMobileDrawerOpen ? 'open' : ''}`} onClick={() => setIsMobileDrawerOpen(false)}></div>
      
      {/* Mobile Navigation Drawer */}
      <div className={`mobile-drawer ${isMobileDrawerOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-header">
          <div className="brand" onClick={() => { setActiveView('dashboard'); setIsMobileDrawerOpen(false); }}>
            <div className="brandLogo"><i className="fa-solid fa-crown"></i></div>
            <div>
              <div className="brandTitle">JobGold</div>
            </div>
          </div>
          <button className="mobile-drawer-close" onClick={() => setIsMobileDrawerOpen(false)} title="Close Menu">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <nav className="nav" style={{ marginTop: '10px' }}>
          <button className={activeView === 'dashboard' ? 'active' : ''} onClick={() => { handleNavClick('dashboard'); setIsMobileDrawerOpen(false); }}><i className="fa-solid fa-gauge-high" style={{ color: 'var(--gold)' }}></i> Dashboard</button>
          
          {session && (session.user.role === 'employer' || session.user.role === 'admin') && (
            <button className={activeView === 'add' ? 'active' : ''} onClick={() => { handleNavClick('add'); setIsMobileDrawerOpen(false); }}><i className="fa-solid fa-circle-plus" style={{ color: '#4caf50' }}></i> Post New Job</button>
          )}

          <button className={activeView === 'jobs' ? 'active' : ''} onClick={() => { handleNavClick('jobs'); setIsMobileDrawerOpen(false); }}><i className="fa-solid fa-list-check" style={{ color: '#2196f3' }}></i> All Active Jobs</button>
          
          {session && (session.user.role === 'employer' || session.user.role === 'admin') && (
            <button className={activeView === 'employer-apps' ? 'active' : ''} onClick={() => { handleNavClick('employer-apps'); setIsMobileDrawerOpen(false); }}><i className="fa-solid fa-handshake-angle" style={{ color: '#9c27b0' }}></i> Applications Received</button>
          )}

          {session && (session.user.role === 'jobseeker' || session.user.role === 'admin') && (
            <button className={activeView === 'jobseeker-apps' ? 'active' : ''} onClick={() => { handleNavClick('jobseeker-apps'); setIsMobileDrawerOpen(false); }}><i className="fa-solid fa-file-invoice" style={{ color: '#2196f3' }}></i> My Job Applications</button>
          )}

          <button className={activeView === 'profiles' ? 'active' : ''} onClick={() => { handleNavClick('profiles'); setIsMobileDrawerOpen(false); }}><i className="fa-solid fa-user-gear" style={{ color: 'var(--gold)' }}></i> Candidate Profiles</button>
          
          {session && (session.user.role === 'jobseeker' || session.user.role === 'admin') && (
            <button className={activeView === 'submit-history' ? 'active' : ''} onClick={() => { handleNavClick('submit-history'); setIsMobileDrawerOpen(false); }}><i className="fa-solid fa-clock-rotate-left" style={{ color: '#64b5f6' }}></i> Share Job History</button>
          )}

          {session && (session.user.role === 'jobseeker' || session.user.role === 'admin') && (
            <button className={activeView === 'saved-jobs' ? 'active' : ''} onClick={() => { handleNavClick('saved-jobs'); setIsMobileDrawerOpen(false); }}><i className="fa-solid fa-heart" style={{ color: 'var(--red)' }}></i> Saved Jobs</button>
          )}

          <button className={activeView === 'map' ? 'active' : ''} onClick={() => { handleNavClick('map'); setIsMobileDrawerOpen(false); }}><i className="fa-solid fa-map-location-dot" style={{ color: '#00d4ff' }}></i> Jobs Near Me (Map)</button>
          <button className={activeView === 'about-me' ? 'active' : ''} onClick={() => { handleNavClick('about-me'); setIsMobileDrawerOpen(false); }}><i className="fa-solid fa-user-gear" style={{ color: 'var(--gold)' }}></i> My Profile & Settings</button>
        </nav>
        <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
           <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
             Status: <span style={{ color: 'var(--gold)' }}>{session ? (session.user.role === 'admin' ? 'CREATOR' : session.user.role.toUpperCase()) : 'GUEST'}</span>
           </div>
        </div>
      </div>
      {/* AI Chatbot Floating Trigger & Window */}
      <div className="chatbot-avatar" onClick={() => setIsChatOpen(!isChatOpen)} title="Chat with JobGold AI Assistant">
        <div className="avatar-badge-label">Ask AI</div>
        <div className="avatar-pulse"></div>
      </div>

      <div className={`chatbot-window ${isChatOpen ? 'open' : ''}`}>
        <div className="chatbot-header">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/real_user_photo.png" alt="Naresh AI" style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid var(--gold)', objectFit: 'cover' }} />
            JobGold AI Assistant
          </h4>
          <button className="chatbot-header-close" onClick={() => setIsChatOpen(false)} title="Close Chat">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="chatbot-messages" id="chat-messages-container">
          {chatMessages.map(msg => (
            <div key={msg.id} className={`chatbot-message ${msg.sender}`} dangerouslySetInnerHTML={{ __html: msg.text }}></div>
          ))}
          {isChatTyping && (
            <div className="typing-indicator">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          )}
        </div>

        <div className="chatbot-suggestions">
          {!session ? (
            <>
              <div className="suggestion-chip" onClick={() => handleSendChatMessage("How to register?")}>How to register?</div>
              <div className="suggestion-chip" onClick={() => handleSendChatMessage("Browse active jobs")}>Browse jobs?</div>
              <div className="suggestion-chip" onClick={() => handleSendChatMessage("Who is the creator?")}>Who made this?</div>
            </>
          ) : session.user.role === 'employer' ? (
            <>
              <div className="suggestion-chip" onClick={() => handleSendChatMessage("How to post a job?")}>Post a job?</div>
              <div className="suggestion-chip" onClick={() => handleSendChatMessage("Browse candidate profiles")}>Browse talent?</div>
              <div className="suggestion-chip" onClick={() => handleSendChatMessage("Who is the creator?")}>Who made this?</div>
            </>
          ) : (
            <>
              <div className="suggestion-chip" onClick={() => handleSendChatMessage("Show retail jobs")}>Retail jobs?</div>
              <div className="suggestion-chip" onClick={() => handleSendChatMessage("How do I get verified?")}>How to verify?</div>
              <div className="suggestion-chip" onClick={() => handleSendChatMessage("Check my application status")}>Application tracker?</div>
            </>
          )}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSendChatMessage(); }} className="chatbot-input-area">
          <input 
            placeholder="Type your question..." 
            value={chatInput} 
            onChange={(e) => setChatInput(e.target.value)} 
          />
          <button type="submit" className="chatbot-send-btn" title="Send Message">
            <i className="fa-solid fa-paper-plane" style={{ fontSize: '12px' }}></i>
          </button>
        </form>
      </div>
    </>
  );
}

export default App;
