// SafeAging Home - Frontend Application
const API_BASE = '/api';

// State management
let currentUser = { id: 1, name: 'Demo User', email: 'user@example.com' };
let currentView = 'dashboard';
let assessments = [];
let safetyPlans = [];
let alerts = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    renderApp();
    loadUserData();
});

// Utility functions for role-based navigation
function getRoleDisplayName(role) {
    const roleNames = {
        'patient': 'Patient',
        'caregiver': 'Caregiver',
        'provider': 'Provider'
    };
    return roleNames[role] || role;
}

function showUnauthorized() {
    document.getElementById('mainContent').innerHTML = `
        <div class="text-center py-16">
            <i class="fas fa-lock text-6xl text-gray-300 mb-4"></i>
            <h2 class="text-2xl font-bold text-gray-800 mb-2">Access Restricted</h2>
            <p class="text-gray-600">You don't have permission to view this page.</p>
            <button onclick="showView('dashboard')" class="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                Return to Dashboard
            </button>
        </div>
    `;
}

function showAppointments() {
    const userRole = RoleBasedNavigation.getCurrentUserRole();
    const content = document.getElementById('mainContent');
    
    if (userRole === RoleBasedNavigation.USER_ROLES.PROVIDER) {
        content.innerHTML = renderProviderAppointments();
    } else {
        content.innerHTML = renderPatientAppointments();
    }
}

function renderPatientAppointments() {
    return `
        <div class="patient-appointments">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-3xl font-bold text-gray-800">My Appointments</h1>
                <button onclick="scheduleAppointment()" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                    <i class="fas fa-plus mr-2"></i>Schedule Appointment
                </button>
            </div>

            <!-- Upcoming Appointments -->
            <div class="bg-white rounded-lg shadow mb-6">
                <div class="p-6 border-b border-gray-200">
                    <h2 class="text-xl font-semibold text-gray-800">Upcoming Appointments</h2>
                </div>
                <div class="p-6">
                    <div class="space-y-4">
                        <div class="appointment-card p-4 border border-gray-200 rounded-lg">
                            <div class="flex justify-between items-start">
                                <div class="flex items-center">
                                    <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                                        <i class="fas fa-user-md text-blue-600"></i>
                                    </div>
                                    <div>
                                        <h3 class="font-semibold text-gray-800">PT Session with Sarah Johnson</h3>
                                        <p class="text-gray-600 text-sm">Physical Therapy Assessment</p>
                                        <p class="text-gray-500 text-sm mt-1">
                                            <i class="fas fa-calendar mr-1"></i>Tomorrow, 2:00 PM - 3:00 PM
                                        </p>
                                    </div>
                                </div>
                                <div class="flex space-x-2">
                                    <button class="text-blue-600 hover:text-blue-800 text-sm">Reschedule</button>
                                    <button class="text-red-600 hover:text-red-800 text-sm">Cancel</button>
                                </div>
                            </div>
                        </div>

                        <div class="appointment-card p-4 border border-gray-200 rounded-lg">
                            <div class="flex justify-between items-start">
                                <div class="flex items-center">
                                    <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                                        <i class="fas fa-home text-green-600"></i>
                                    </div>
                                    <div>
                                        <h3 class="font-semibold text-gray-800">Home Safety Follow-up</h3>
                                        <p class="text-gray-600 text-sm">Review safety improvements</p>
                                        <p class="text-gray-500 text-sm mt-1">
                                            <i class="fas fa-calendar mr-1"></i>Friday, 10:00 AM - 11:00 AM
                                        </p>
                                    </div>
                                </div>
                                <div class="flex space-x-2">
                                    <button class="text-blue-600 hover:text-blue-800 text-sm">Reschedule</button>
                                    <button class="text-red-600 hover:text-red-800 text-sm">Cancel</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Past Appointments -->
            <div class="bg-white rounded-lg shadow">
                <div class="p-6 border-b border-gray-200">
                    <h2 class="text-xl font-semibold text-gray-800">Past Appointments</h2>
                </div>
                <div class="p-6">
                    <div class="space-y-4">
                        <div class="appointment-card p-4 border border-gray-100 rounded-lg bg-gray-50">
                            <div class="flex justify-between items-start">
                                <div class="flex items-center">
                                    <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                                        <i class="fas fa-check text-gray-600"></i>
                                    </div>
                                    <div>
                                        <h3 class="font-semibold text-gray-800">Initial Assessment</h3>
                                        <p class="text-gray-600 text-sm">Home safety evaluation</p>
                                        <p class="text-gray-500 text-sm mt-1">
                                            <i class="fas fa-calendar mr-1"></i>Last week, completed
                                        </p>
                                    </div>
                                </div>
                                <button class="text-blue-600 hover:text-blue-800 text-sm">View Report</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderProviderAppointments() {
    return `
        <div class="provider-appointments">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-3xl font-bold text-gray-800">Patient Schedule</h1>
                <div class="flex space-x-3">
                    <button onclick="manageSchedule()" class="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600">
                        <i class="fas fa-cog mr-2"></i>Manage Schedule
                    </button>
                    <button onclick="addAppointment()" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                        <i class="fas fa-plus mr-2"></i>Add Appointment
                    </button>
                </div>
            </div>

            <!-- Today's Schedule -->
            <div class="bg-white rounded-lg shadow mb-6">
                <div class="p-6 border-b border-gray-200">
                    <h2 class="text-xl font-semibold text-gray-800">Today's Schedule</h2>
                    <p class="text-gray-600">6 appointments scheduled</p>
                </div>
                <div class="p-6">
                    <div class="space-y-4">
                        ${renderProviderTodaySchedule()}
                    </div>
                </div>
            </div>

            <!-- This Week -->
            <div class="bg-white rounded-lg shadow">
                <div class="p-6 border-b border-gray-200">
                    <h2 class="text-xl font-semibold text-gray-800">This Week</h2>
                </div>
                <div class="p-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${renderWeeklySchedule()}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderProviderTodaySchedule() {
    const appointments = [
        { time: '9:00 AM', patient: 'Mary Johnson', type: 'Initial Assessment', status: 'confirmed' },
        { time: '10:30 AM', patient: 'Robert Smith', type: 'Follow-up', status: 'in-progress' },
        { time: '12:00 PM', patient: 'Lunch Break', type: '', status: 'break' },
        { time: '2:00 PM', patient: 'Alice Brown', type: 'PT Session', status: 'confirmed' },
        { time: '3:30 PM', patient: 'David Wilson', type: 'Home Safety Review', status: 'confirmed' }
    ];

    return appointments.map(apt => {
        const statusColors = {
            'confirmed': 'bg-blue-100 text-blue-800',
            'in-progress': 'bg-green-100 text-green-800',
            'break': 'bg-gray-100 text-gray-600'
        };

        return `
            <div class="appointment-item p-4 border border-gray-200 rounded-lg">
                <div class="flex justify-between items-center">
                    <div class="flex items-center">
                        <div class="text-sm font-semibold text-gray-800 w-20">${apt.time}</div>
                        <div class="ml-4">
                            <h3 class="font-semibold text-gray-800">${apt.patient}</h3>
                            ${apt.type ? `<p class="text-gray-600 text-sm">${apt.type}</p>` : ''}
                        </div>
                    </div>
                    <span class="text-xs px-2 py-1 rounded-full ${statusColors[apt.status]}">${apt.status}</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderWeeklySchedule() {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    return days.map(day => `
        <div class="day-schedule p-4 border border-gray-200 rounded-lg">
            <h3 class="font-semibold text-gray-800 mb-2">${day}</h3>
            <div class="text-sm text-gray-600">
                <div>4 appointments</div>
                <div>9:00 AM - 4:00 PM</div>
            </div>
        </div>
    `).join('');
}

function showPatientList() {
    document.getElementById('mainContent').innerHTML = `
        <div class="patient-list">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-3xl font-bold text-gray-800">My Patients</h1>
                <button onclick="addPatient()" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                    <i class="fas fa-plus mr-2"></i>Add Patient
                </button>
            </div>

            <!-- Patient Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${renderPatientCards()}
            </div>
        </div>
    `;
}

function renderPatientCards() {
    const patients = [
        { name: 'Mary Johnson', age: 78, risk: 'High', lastVisit: '2 days ago', avatar: 'MJ' },
        { name: 'Robert Smith', age: 82, risk: 'Moderate', lastVisit: '1 week ago', avatar: 'RS' },
        { name: 'Alice Brown', age: 75, risk: 'Low', lastVisit: '3 days ago', avatar: 'AB' },
        { name: 'David Wilson', age: 79, risk: 'Moderate', lastVisit: '1 day ago', avatar: 'DW' }
    ];

    const riskColors = {
        'High': 'bg-red-100 text-red-800 border-red-200',
        'Moderate': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'Low': 'bg-green-100 text-green-800 border-green-200'
    };

    return patients.map(patient => `
        <div class="patient-card bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div class="flex items-center mb-4">
                <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <span class="font-semibold text-blue-600">${patient.avatar}</span>
                </div>
                <div>
                    <h3 class="font-semibold text-gray-800">${patient.name}</h3>
                    <p class="text-gray-600 text-sm">Age ${patient.age}</p>
                </div>
            </div>
            
            <div class="mb-4">
                <span class="text-xs px-2 py-1 rounded-full ${riskColors[patient.risk]}">${patient.risk} Risk</span>
            </div>
            
            <div class="text-sm text-gray-600 mb-4">
                Last visit: ${patient.lastVisit}
            </div>
            
            <div class="flex space-x-2">
                <button onclick="viewPatientDetails('${patient.name}')" class="flex-1 bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600">
                    View Details
                </button>
                <button onclick="schedulePatientVisit('${patient.name}')" class="bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-300">
                    Schedule
                </button>
            </div>
        </div>
    `).join('');
}

function showProviderSchedule() {
    showAppointments(); // Use the same appointments view for now
}

// Main app renderer
function renderApp() {
    const app = document.getElementById('app');
    const isMobile = window.innerWidth <= 768;
    const userRole = RoleBasedNavigation.getCurrentUserRole();
    
    // Check if user needs to select a role
    if (currentUser && !userRole) {
        app.innerHTML = RoleBasedNavigation.renderRoleSelection();
        return;
    }
    
    app.innerHTML = `
        <!-- Header -->
        <div class="gradient-bg text-white shadow-lg">
            <div class="max-w-7xl mx-auto px-4 py-4 md:py-6">
                <div class="flex justify-between items-center">
                    <div class="flex items-center space-x-2 md:space-x-3">
                        <i class="fas fa-home text-2xl md:text-3xl"></i>
                        <div>
                            <h1 class="text-lg md:text-2xl font-bold">SafeAging</h1>
                            <p class="text-xs md:text-sm opacity-90 hidden md:block">Your AI-Powered Safety Partner</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2 md:space-x-4">
                        ${userRole ? `
                            <div class="role-indicator">
                                <span class="text-xs bg-white/20 px-2 py-1 rounded-full">
                                    ${getRoleDisplayName(userRole)}
                                </span>
                            </div>
                        ` : ''}
                        <div class="text-right hidden md:block">
                            <p class="text-sm opacity-90">Welcome back,</p>
                            <p class="font-semibold">${currentUser ? currentUser.first_name || currentUser.name : 'Guest'}</p>
                        </div>
                        <button onclick="showAlerts()" class="relative p-2 bg-white/20 rounded-lg hover:bg-white/30 transition">
                            <i class="fas fa-bell text-lg md:text-xl"></i>
                            <span id="alertBadge" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center hidden">0</span>
                        </button>
                        <button onclick="RoleBasedNavigation.showRoleSelector()" class="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition" title="Change Role">
                            <i class="fas fa-user-cog text-lg md:text-xl"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Navigation -->
        <div class="${isMobile ? 'nav-container' : 'bg-white shadow-sm border-b sticky top-0 z-10'}">
            <div class="${isMobile ? '' : 'max-w-7xl mx-auto px-4'}">
                ${userRole ? RoleBasedNavigation.renderRoleNavigation(userRole, isMobile) : `
                    <div class="flex justify-center py-4">
                        <button onclick="RoleBasedNavigation.showRoleSelector()" class="bg-blue-500 text-white px-4 py-2 rounded-lg">
                            Select Your Role
                        </button>
                    </div>
                `}
            </div>
        </div>

        <!-- Main Content Area -->
        <div class="max-w-7xl mx-auto px-4 py-8">
            <div id="mainContent"></div>
        </div>

        <!-- Alerts Modal -->
        <div id="alertsModal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-xl max-w-md w-full max-h-96 overflow-y-auto">
                <div class="p-4 border-b flex justify-between items-center">
                    <h3 class="text-lg font-semibold">Notifications</h3>
                    <button onclick="closeAlerts()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div id="alertsList" class="p-4"></div>
            </div>
        </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .nav-btn {
            padding: 12px 20px;
            font-weight: 500;
            color: #6b7280;
            border-bottom: 3px solid transparent;
            transition: all 0.2s;
        }
        .nav-btn:hover {
            color: #4b5563;
            background: #f9fafb;
        }
        .nav-btn.active {
            color: #7c3aed;
            border-bottom-color: #7c3aed;
        }
    `;
    document.head.appendChild(style);

    showView(currentView);
}

// View controllers
function showView(view) {
    currentView = view;
    const content = document.getElementById('mainContent');
    const userRole = RoleBasedNavigation.getCurrentUserRole();
    
    // Update navigation active state
    document.querySelectorAll('.nav-btn, .nav-btn-mobile').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[onclick="showView('${view}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    switch(view) {
        case 'dashboard':
            if (userRole) {
                content.innerHTML = RoleBasedNavigation.renderRoleDashboard(userRole, currentUser);
            } else {
                showDashboard();
            }
            break;
        case 'assess':
            showAssessment();
            break;
        case 'plans':
            showSafetyPlans();
            break;
        case 'equipment':
            showEquipment();
            break;
        case 'appointments':
            showAppointments();
            break;
        case 'patients':
            if (userRole === RoleBasedNavigation.USER_ROLES.PROVIDER) {
                showPatientList();
            } else {
                showUnauthorized();
            }
            break;
        case 'schedule':
            if (userRole === RoleBasedNavigation.USER_ROLES.PROVIDER) {
                showProviderSchedule();
            } else {
                showAppointments();
            }
            break;
        case 'caregiver':
            showCaregiverPortal();
            break;
        case 'clinical':
            if (typeof initClinicalDashboard === 'function') {
                initClinicalDashboard();
            }
            break;
        case 'ptot':
            showPTOTDashboard();
            break;
    }
    
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.onclick && btn.onclick.toString().includes(`showView('${view}')`)) {
            btn.classList.add('active');
        }
    });
}

// Dashboard view
function showDashboard() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
        <!-- Quick Stats -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="bg-white rounded-xl shadow-md p-6 card-hover transition-all">
                <div class="flex items-center justify-between mb-2">
                    <i class="fas fa-shield-alt text-3xl text-green-500"></i>
                    <span class="text-2xl font-bold">${assessments.length}</span>
                </div>
                <h3 class="text-gray-600">Rooms Assessed</h3>
            </div>
            
            <div class="bg-white rounded-xl shadow-md p-6 card-hover transition-all">
                <div class="flex items-center justify-between mb-2">
                    <i class="fas fa-exclamation-triangle text-3xl text-yellow-500"></i>
                    <span class="text-2xl font-bold">${calculateTotalHazards()}</span>
                </div>
                <h3 class="text-gray-600">Hazards Found</h3>
            </div>
            
            <div class="bg-white rounded-xl shadow-md p-6 card-hover transition-all">
                <div class="flex items-center justify-between mb-2">
                    <i class="fas fa-tasks text-3xl text-blue-500"></i>
                    <span class="text-2xl font-bold">${calculateProgress()}%</span>
                </div>
                <h3 class="text-gray-600">Plan Progress</h3>
            </div>
            
            <div class="bg-white rounded-xl shadow-md p-6 card-hover transition-all">
                <div class="flex items-center justify-between mb-2">
                    <i class="fas fa-bell text-3xl text-purple-500"></i>
                    <span class="text-2xl font-bold">${alerts.length}</span>
                </div>
                <h3 class="text-gray-600">Active Alerts</h3>
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="bg-white rounded-xl shadow-md p-6 mb-8">
            <h2 class="text-xl font-bold mb-4">Quick Actions</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onclick="showView('assess')" class="p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition">
                    <i class="fas fa-camera text-2xl mb-2"></i>
                    <p class="font-semibold">Assess a Room</p>
                </button>
                <button onclick="scheduleAppointment()" class="p-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition">
                    <i class="fas fa-calendar-plus text-2xl mb-2"></i>
                    <p class="font-semibold">Schedule PT/OT</p>
                </button>
                <button onclick="showView('equipment')" class="p-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:shadow-lg transition">
                    <i class="fas fa-shopping-cart text-2xl mb-2"></i>
                    <p class="font-semibold">Browse Equipment</p>
                </button>
            </div>
        </div>

        <!-- Recent Assessments -->
        <div class="bg-white rounded-xl shadow-md p-6">
            <h2 class="text-xl font-bold mb-4">Recent Assessments</h2>
            <div id="recentAssessments" class="space-y-4">
                ${assessments.slice(0, 3).map(a => `
                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div class="flex items-center space-x-4">
                            <i class="fas fa-door-open text-2xl text-gray-600"></i>
                            <div>
                                <p class="font-semibold capitalize">${a.room_type}</p>
                                <p class="text-sm text-gray-500">Risk Score: ${a.risk_score}/10</p>
                            </div>
                        </div>
                        <button onclick="viewAssessmentDetails(${a.id})" class="text-purple-600 hover:text-purple-800">
                            View Details <i class="fas fa-arrow-right ml-1"></i>
                        </button>
                    </div>
                `).join('') || '<p class="text-gray-500">No assessments yet. Start by assessing a room!</p>'}
            </div>
        </div>
    `;
}

// Assessment view
function showAssessment() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
        <div class="max-w-4xl mx-auto">
            <div class="bg-white rounded-xl shadow-md p-8">
                <h2 class="text-2xl font-bold mb-6">Room Safety Assessment</h2>
                
                <!-- Room Selection -->
                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Select Room Type</label>
                    <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <button onclick="selectRoom('bathroom')" class="room-btn" data-room="bathroom">
                            <i class="fas fa-bath text-2xl mb-1"></i>
                            <p>Bathroom</p>
                        </button>
                        <button onclick="selectRoom('bedroom')" class="room-btn" data-room="bedroom">
                            <i class="fas fa-bed text-2xl mb-1"></i>
                            <p>Bedroom</p>
                        </button>
                        <button onclick="selectRoom('kitchen')" class="room-btn" data-room="kitchen">
                            <i class="fas fa-utensils text-2xl mb-1"></i>
                            <p>Kitchen</p>
                        </button>
                        <button onclick="selectRoom('stairs')" class="room-btn" data-room="stairs">
                            <i class="fas fa-stairs text-2xl mb-1"></i>
                            <p>Stairs</p>
                        </button>
                        <button onclick="selectRoom('living_room')" class="room-btn" data-room="living_room">
                            <i class="fas fa-couch text-2xl mb-1"></i>
                            <p>Living Room</p>
                        </button>
                    </div>
                </div>

                <!-- Photo Upload -->
                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Upload Room Photo</label>
                    <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition">
                        <input type="file" id="photoInput" accept="image/*" class="hidden" onchange="handlePhotoUpload(event)">
                        <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>
                        <p class="text-gray-600 mb-2">Click to upload or drag and drop</p>
                        <p class="text-sm text-gray-500">PNG, JPG up to 10MB</p>
                        <button onclick="document.getElementById('photoInput').click()" class="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                            Choose Photo
                        </button>
                    </div>
                    <div id="photoPreview" class="mt-4 hidden">
                        <img id="previewImage" class="w-full rounded-lg shadow-md" alt="Room preview">
                    </div>
                </div>

                <!-- Analysis Button -->
                <button id="analyzeBtn" onclick="analyzeRoom()" disabled class="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed">
                    <i class="fas fa-magic mr-2"></i>Analyze Room for Hazards
                </button>

                <!-- Results Section -->
                <div id="analysisResults" class="mt-8 hidden">
                    <h3 class="text-xl font-bold mb-4">Analysis Results</h3>
                    <div id="resultsContent"></div>
                </div>
            </div>
        </div>

        <style>
            .room-btn {
                padding: 16px;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                text-align: center;
                transition: all 0.2s;
                background: white;
            }
            .room-btn:hover {
                border-color: #a78bfa;
                background: #f3f4f6;
            }
            .room-btn.selected {
                border-color: #7c3aed;
                background: #ede9fe;
                color: #7c3aed;
            }
        </style>
    `;
}

// Safety Plans view
function showSafetyPlans() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
        <div class="max-w-5xl mx-auto">
            <div class="mb-6 flex justify-between items-center">
                <h2 class="text-2xl font-bold">Your Safety Plan</h2>
                <button onclick="generateNewPlan()" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                    <i class="fas fa-plus mr-2"></i>Generate New Plan
                </button>
            </div>

            <!-- Phase Tabs -->
            <div class="bg-white rounded-xl shadow-md">
                <div class="border-b">
                    <div class="flex">
                        <button onclick="showPhase(1)" class="phase-tab active" data-phase="1">
                            <i class="fas fa-exclamation-triangle mr-2"></i>Phase 1: Essentials
                        </button>
                        <button onclick="showPhase(2)" class="phase-tab" data-phase="2">
                            <i class="fas fa-microchip mr-2"></i>Phase 2: Smart Tech
                        </button>
                        <button onclick="showPhase(3)" class="phase-tab" data-phase="3">
                            <i class="fas fa-infinity mr-2"></i>Phase 3: Ongoing
                        </button>
                    </div>
                </div>

                <div id="phaseContent" class="p-6">
                    <!-- Phase content will be loaded here -->
                </div>
            </div>
        </div>

        <style>
            .phase-tab {
                padding: 16px 24px;
                font-weight: 500;
                border-bottom: 3px solid transparent;
                background: white;
                transition: all 0.2s;
            }
            .phase-tab:hover {
                background: #f9fafb;
            }
            .phase-tab.active {
                color: #7c3aed;
                border-bottom-color: #7c3aed;
            }
        </style>
    `;
    
    // Load phase 1 by default
    showPhase(1);
}

// Equipment view
function showEquipment() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
        <div class="max-w-6xl mx-auto">
            <h2 class="text-2xl font-bold mb-6">Recommended Safety Equipment</h2>
            
            <!-- Categories -->
            <div class="mb-6 flex flex-wrap gap-2">
                <button class="px-4 py-2 bg-purple-600 text-white rounded-lg">All Items</button>
                <button class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Bathroom Safety</button>
                <button class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Lighting</button>
                <button class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Medical Alerts</button>
                <button class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Mobility Aids</button>
            </div>

            <!-- Equipment Grid -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                ${getEquipmentList().map(item => `
                    <div class="bg-white rounded-xl shadow-md overflow-hidden card-hover transition-all">
                        <div class="h-48 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                            <i class="${item.icon} text-5xl text-purple-600"></i>
                        </div>
                        <div class="p-6">
                            <h3 class="font-bold text-lg mb-2">${item.name}</h3>
                            <p class="text-gray-600 text-sm mb-4">${item.description}</p>
                            <div class="flex items-center justify-between mb-4">
                                <span class="text-2xl font-bold text-purple-600">$${item.price}</span>
                                <span class="px-3 py-1 bg-${item.priority === 'essential' ? 'red' : 'yellow'}-100 text-${item.priority === 'essential' ? 'red' : 'yellow'}-800 rounded-full text-sm">
                                    ${item.priority}
                                </span>
                            </div>
                            <button class="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                                <i class="fas fa-cart-plus mr-2"></i>Add to Plan
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Caregiver Portal view
function showCaregiverPortal() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
        <div class="max-w-4xl mx-auto">
            <div class="bg-white rounded-xl shadow-md p-8">
                <h2 class="text-2xl font-bold mb-6">Caregiver Portal</h2>
                
                <!-- Add Caregiver Form -->
                <div class="mb-8 p-6 bg-purple-50 rounded-lg">
                    <h3 class="text-lg font-semibold mb-4">Add a Caregiver</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <input id="caregiverEmail" type="email" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500" placeholder="caregiver@example.com">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                            <select id="caregiverRelation" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
                                <option value="spouse">Spouse</option>
                                <option value="child">Child</option>
                                <option value="friend">Friend</option>
                                <option value="professional">Professional</option>
                            </select>
                        </div>
                    </div>
                    <div class="mt-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Alert Preferences</label>
                        <div class="space-y-2">
                            <label class="flex items-center">
                                <input type="checkbox" class="mr-2" checked> High-priority hazards
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" class="mr-2" checked> Appointment reminders
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" class="mr-2"> Daily activity summaries
                            </label>
                        </div>
                    </div>
                    <button onclick="addCaregiver()" class="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                        <i class="fas fa-user-plus mr-2"></i>Add Caregiver
                    </button>
                </div>

                <!-- Current Caregivers -->
                <div>
                    <h3 class="text-lg font-semibold mb-4">Current Caregivers</h3>
                    <div class="space-y-3">
                        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div class="flex items-center space-x-3">
                                <div class="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center">
                                    <i class="fas fa-user text-purple-600"></i>
                                </div>
                                <div>
                                    <p class="font-semibold">Jane Doe</p>
                                    <p class="text-sm text-gray-500">Daughter • Full Access</p>
                                </div>
                            </div>
                            <button class="text-red-600 hover:text-red-800">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Helper functions
let selectedRoom = null;
let selectedImage = null;

function selectRoom(room) {
    selectedRoom = room;
    document.querySelectorAll('.room-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.querySelector(`[data-room="${room}"]`).classList.add('selected');
    checkAnalyzeButton();
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        selectedImage = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('photoPreview').classList.remove('hidden');
            document.getElementById('previewImage').src = e.target.result;
        };
        reader.readAsDataURL(file);
        checkAnalyzeButton();
    }
}

function checkAnalyzeButton() {
    const btn = document.getElementById('analyzeBtn');
    if (selectedRoom && selectedImage) {
        btn.disabled = false;
    }
}

async function analyzeRoom() {
    if (!selectedRoom || !selectedImage) return;

    const btn = document.getElementById('analyzeBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Analyzing...';

    const formData = new FormData();
    formData.append('image', selectedImage);
    formData.append('roomType', selectedRoom);
    formData.append('userId', currentUser.id);

    try {
        const response = await axios.post(`${API_BASE}/analyze-room`, formData);
        const data = response.data;
        
        // Show results
        document.getElementById('analysisResults').classList.remove('hidden');
        document.getElementById('resultsContent').innerHTML = `
            <div class="space-y-4">
                <!-- Risk Score -->
                <div class="p-4 bg-${data.riskScore > 7 ? 'red' : data.riskScore > 4 ? 'yellow' : 'green'}-50 rounded-lg">
                    <div class="flex items-center justify-between">
                        <h4 class="font-semibold">Risk Score</h4>
                        <span class="text-2xl font-bold">${data.riskScore}/10</span>
                    </div>
                    <div class="mt-2 bg-gray-200 rounded-full h-2">
                        <div class="bg-${data.riskScore > 7 ? 'red' : data.riskScore > 4 ? 'yellow' : 'green'}-500 h-2 rounded-full" style="width: ${data.riskScore * 10}%"></div>
                    </div>
                </div>

                <!-- Hazards Found -->
                <div>
                    <h4 class="font-semibold mb-3">Hazards Detected (${data.hazards.length})</h4>
                    ${data.hazards.map(h => `
                        <div class="mb-3 p-3 bg-white border rounded-lg">
                            <div class="flex items-start justify-between">
                                <div>
                                    <p class="font-medium">${h.type.replace(/_/g, ' ').toUpperCase()}</p>
                                    <p class="text-sm text-gray-500">Location: ${h.location}</p>
                                </div>
                                <span class="px-2 py-1 bg-${h.severity === 'critical' ? 'red' : h.severity === 'high' ? 'orange' : h.severity === 'medium' ? 'yellow' : 'blue'}-100 text-${h.severity === 'critical' ? 'red' : h.severity === 'high' ? 'orange' : h.severity === 'medium' ? 'yellow' : 'blue'}-800 rounded text-sm">
                                    ${h.severity}
                                </span>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- Recommendations -->
                <div>
                    <h4 class="font-semibold mb-3">Recommendations</h4>
                    ${data.recommendations.map(r => `
                        <div class="mb-2 p-3 bg-purple-50 rounded-lg">
                            <p class="text-sm">${r.recommendation}</p>
                        </div>
                    `).join('')}
                </div>

                <!-- Action Buttons -->
                <div class="flex space-x-3">
                    <button onclick="scheduleAppointment()" class="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                        <i class="fas fa-calendar mr-2"></i>Schedule PT/OT Review
                    </button>
                    <button onclick="generatePlanFromAssessment(${data.assessmentId})" class="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                        <i class="fas fa-clipboard-check mr-2"></i>Generate Safety Plan
                    </button>
                </div>
            </div>
        `;
        
        // Reload assessments
        loadUserData();
        
    } catch (error) {
        console.error('Analysis error:', error);
        alert('Failed to analyze image. Please try again.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-magic mr-2"></i>Analyze Room for Hazards';
    }
}

function showPhase(phase) {
    // Update tabs
    document.querySelectorAll('.phase-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-phase="${phase}"]`).classList.add('active');
    
    // Get plan for this phase
    const plan = safetyPlans.find(p => p.phase === phase) || getDefaultPlan(phase);
    const tasks = JSON.parse(plan.tasks || '[]');
    
    document.getElementById('phaseContent').innerHTML = `
        <div class="mb-4">
            <div class="flex items-center justify-between mb-2">
                <h3 class="text-lg font-semibold">${plan.title}</h3>
                <span class="text-2xl font-bold text-purple-600">${plan.progress || 0}%</span>
            </div>
            <div class="bg-gray-200 rounded-full h-3">
                <div class="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all" style="width: ${plan.progress || 0}%"></div>
            </div>
        </div>

        <div class="space-y-3">
            ${tasks.map((task, i) => `
                <div class="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="updateTaskStatus(${plan.id}, ${i})" class="mr-3 w-5 h-5 text-purple-600">
                    <div class="flex-1">
                        <p class="${task.completed ? 'line-through text-gray-500' : ''}">${task.task}</p>
                    </div>
                    <span class="px-2 py-1 bg-${task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'yellow' : 'green'}-100 text-${task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'yellow' : 'green'}-800 rounded text-xs">
                        ${task.priority}
                    </span>
                </div>
            `).join('')}
        </div>
    `;
}

function getDefaultPlan(phase) {
    const plans = {
        1: {
            phase: 1,
            title: 'Essential Safety Modifications',
            tasks: JSON.stringify([
                { task: 'Install grab bars in bathroom', completed: false, priority: 'high' },
                { task: 'Add non-slip mats', completed: false, priority: 'high' },
                { task: 'Improve lighting', completed: false, priority: 'medium' }
            ]),
            progress: 0
        },
        2: {
            phase: 2,
            title: 'Smart Technology Setup',
            tasks: JSON.stringify([
                { task: 'Install motion sensors', completed: false, priority: 'medium' },
                { task: 'Set up medical alert', completed: false, priority: 'high' }
            ]),
            progress: 0
        },
        3: {
            phase: 3,
            title: 'Ongoing Support',
            tasks: JSON.stringify([
                { task: 'Schedule regular check-ins', completed: false, priority: 'medium' }
            ]),
            progress: 0
        }
    };
    return plans[phase];
}

function getEquipmentList() {
    return [
        {
            name: 'Adjustable Grab Bar Set',
            description: 'Suction-cup grab bars for bathroom safety',
            price: 49.99,
            icon: 'fas fa-grip-lines',
            priority: 'essential'
        },
        {
            name: 'Motion Sensor Night Lights',
            description: 'Automatic LED lights for hallways',
            price: 29.99,
            icon: 'fas fa-lightbulb',
            priority: 'recommended'
        },
        {
            name: 'Medical Alert System',
            description: '24/7 monitoring with fall detection',
            price: 39.99,
            icon: 'fas fa-heart',
            priority: 'essential'
        },
        {
            name: 'Non-Slip Bath Mat',
            description: 'Extra-long anti-slip mat',
            price: 24.99,
            icon: 'fas fa-bath',
            priority: 'essential'
        },
        {
            name: 'Bed Rail Support',
            description: 'Adjustable bed rail for safe transfers',
            price: 79.99,
            icon: 'fas fa-bed',
            priority: 'recommended'
        },
        {
            name: 'Smart Door Sensor',
            description: 'Alerts when doors open unexpectedly',
            price: 34.99,
            icon: 'fas fa-door-open',
            priority: 'optional'
        }
    ];
}

// Data loading functions
async function loadUserData() {
    try {
        // Load assessments
        const assessResponse = await axios.get(`${API_BASE}/assessments/${currentUser.id}`);
        assessments = assessResponse.data.assessments || [];
        
        // Load safety plans
        const plansResponse = await axios.get(`${API_BASE}/plans/${currentUser.id}`);
        safetyPlans = plansResponse.data.plans || [];
        
        // Load alerts
        const alertsResponse = await axios.get(`${API_BASE}/alerts/${currentUser.id}`);
        alerts = alertsResponse.data.alerts || [];
        
        // Update alert badge
        const badge = document.getElementById('alertBadge');
        if (alerts.length > 0) {
            badge.classList.remove('hidden');
            badge.textContent = alerts.length;
        }
        
    } catch (error) {
        console.error('Failed to load user data:', error);
    }
}

// Utility functions
function calculateTotalHazards() {
    return assessments.reduce((sum, a) => {
        const hazards = JSON.parse(a.hazards_detected || '[]');
        return sum + hazards.length;
    }, 0);
}

function calculateProgress() {
    if (safetyPlans.length === 0) return 0;
    const totalProgress = safetyPlans.reduce((sum, p) => sum + (p.progress || 0), 0);
    return Math.round(totalProgress / safetyPlans.length);
}

function showAlerts() {
    document.getElementById('alertsModal').classList.remove('hidden');
    document.getElementById('alertsList').innerHTML = alerts.length > 0 ? alerts.map(a => `
        <div class="mb-3 p-3 border rounded-lg">
            <div class="flex items-start justify-between">
                <div>
                    <p class="font-semibold">${a.title}</p>
                    <p class="text-sm text-gray-600">${a.message}</p>
                </div>
                <button onclick="markAlertRead(${a.id})" class="text-purple-600 hover:text-purple-800">
                    <i class="fas fa-check"></i>
                </button>
            </div>
        </div>
    `).join('') : '<p class="text-gray-500">No new alerts</p>';
}

function closeAlerts() {
    document.getElementById('alertsModal').classList.add('hidden');
}

async function markAlertRead(alertId) {
    try {
        await axios.patch(`${API_BASE}/alerts/${alertId}/read`);
        loadUserData();
        showAlerts();
    } catch (error) {
        console.error('Failed to mark alert as read:', error);
    }
}

function scheduleAppointment() {
    showAppointmentModal();
}

function showAppointmentModal() {
    const modalHTML = `
        <div id="appointmentModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-screen overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-gray-800">
                            <i class="fas fa-calendar-plus mr-2 text-blue-500"></i>
                            Schedule Appointment
                        </h2>
                        <button onclick="closeAppointmentModal()" class="text-gray-400 hover:text-gray-600 text-2xl">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <form id="appointmentForm" onsubmit="submitAppointment(event)">
                        <!-- Date Selection -->
                        <div class="mb-6">
                            <label class="block text-sm font-semibold text-gray-700 mb-2">
                                <i class="fas fa-calendar mr-1"></i>
                                Select Date
                            </label>
                            <input 
                                type="date" 
                                id="appointmentDate" 
                                class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                                min="${new Date().toISOString().split('T')[0]}"
                                required
                            />
                        </div>
                        
                        <!-- Time Selection -->
                        <div class="mb-6">
                            <label class="block text-sm font-semibold text-gray-700 mb-2">
                                <i class="fas fa-clock mr-1"></i>
                                Select Time
                            </label>
                            <div class="grid grid-cols-3 gap-2" id="timeSlots">
                                <!-- Time slots will be populated by JavaScript -->
                            </div>
                        </div>
                        
                        <!-- Appointment Type -->
                        <div class="mb-6">
                            <label class="block text-sm font-semibold text-gray-700 mb-2">
                                <i class="fas fa-video mr-1"></i>
                                Appointment Type
                            </label>
                            <select id="appointmentType" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg">
                                <option value="video">Video Consultation</option>
                                <option value="phone">Phone Call</option>
                                <option value="in_person">In-Person Visit</option>
                            </select>
                        </div>
                        
                        <!-- Notes -->
                        <div class="mb-6">
                            <label class="block text-sm font-semibold text-gray-700 mb-2">
                                <i class="fas fa-notes-medical mr-1"></i>
                                Notes (Optional)
                            </label>
                            <textarea 
                                id="appointmentNotes" 
                                rows="3" 
                                class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                                placeholder="Describe what you'd like to discuss during the appointment..."
                            ></textarea>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="flex gap-3">
                            <button 
                                type="button" 
                                onclick="closeAppointmentModal()" 
                                class="flex-1 py-3 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                class="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                id="scheduleBtn"
                            >
                                <i class="fas fa-check mr-2"></i>
                                Schedule
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    populateTimeSlots();
    
    // Focus management for accessibility
    document.getElementById('appointmentDate').focus();
}

function populateTimeSlots() {
    const timeSlots = document.getElementById('timeSlots');
    const slots = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
        '16:00', '16:30', '17:00'
    ];
    
    timeSlots.innerHTML = slots.map(time => `
        <button 
            type="button" 
            class="time-slot p-2 border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-300 focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
            data-time="${time}"
            onclick="selectTimeSlot(this, '${time}')"
        >
            ${time}
        </button>
    `).join('');
}

function selectTimeSlot(button, time) {
    // Remove selection from all time slots
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('bg-blue-500', 'text-white', 'border-blue-500');
        slot.classList.add('border-gray-300');
    });
    
    // Add selection to clicked slot
    button.classList.add('bg-blue-500', 'text-white', 'border-blue-500');
    button.classList.remove('border-gray-300');
    
    // Store selected time
    button.closest('form').setAttribute('data-selected-time', time);
}

function closeAppointmentModal() {
    const modal = document.getElementById('appointmentModal');
    if (modal) {
        modal.remove();
    }
}

function submitAppointment(event) {
    event.preventDefault();
    
    const form = event.target;
    const date = document.getElementById('appointmentDate').value;
    const selectedTime = form.getAttribute('data-selected-time');
    const type = document.getElementById('appointmentType').value;
    const notes = document.getElementById('appointmentNotes').value || 'Safety assessment review';
    
    if (!date) {
        alert('Please select a date for your appointment.');
        return;
    }
    
    if (!selectedTime) {
        alert('Please select a time slot for your appointment.');
        return;
    }
    
    // Combine date and time
    const scheduledAt = `${date} ${selectedTime}:00`;
    const scheduleBtn = document.getElementById('scheduleBtn');
    
    // Show loading state
    scheduleBtn.disabled = true;
    scheduleBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Scheduling...';
    
    axios.post(`${API_BASE}/appointments`, {
        user_id: currentUser.id,
        provider_id: 3, // Default provider for demo
        scheduled_at: scheduledAt,
        appointment_type: type,
        notes: notes
    }).then(() => {
        // Show success message
        showSuccessMessage('Appointment scheduled successfully!');
        
        // Close modal
        closeAppointmentModal();
        
        // Refresh user data to show new appointment
        loadUserData();
        
    }).catch(error => {
        console.error('Failed to schedule appointment:', error);
        
        // Reset button state
        scheduleBtn.disabled = false;
        scheduleBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Schedule';
        
        // Show error message
        alert('Failed to schedule appointment. Please try again.');
    });
}

function showSuccessMessage(message) {
    const successHTML = `
        <div id="successToast" class="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center">
            <i class="fas fa-check-circle mr-2"></i>
            ${message}
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', successHTML);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        const toast = document.getElementById('successToast');
        if (toast) {
            toast.remove();
        }
    }, 3000);
}

async function generateNewPlan() {
    if (assessments.length === 0) {
        alert('Please complete at least one room assessment first.');
        return;
    }
    
    try {
        const assessmentIds = assessments.map(a => a.id);
        await axios.post(`${API_BASE}/generate-plan`, {
            userId: currentUser.id,
            assessmentIds
        });
        alert('Safety plan generated successfully!');
        loadUserData();
        showView('plans');
    } catch (error) {
        console.error('Failed to generate plan:', error);
    }
}

// PT/OT Dashboard integration
function showPTOTDashboard() {
    if (typeof initPTOTDashboard === 'function') {
        initPTOTDashboard();
    } else {
        console.error('PT/OT Dashboard not loaded');
        alert('PT/OT Dashboard is loading, please try again.');
    }
}

async function addCaregiver() {
    const email = document.getElementById('caregiverEmail').value;
    const relationship = document.getElementById('caregiverRelation').value;
    
    if (!email) {
        alert('Please enter caregiver email');
        return;
    }
    
    try {
        await axios.post(`${API_BASE}/caregivers`, {
            seniorId: currentUser.id,
            caregiverEmail: email,
            relationship,
            alertPreferences: {
                highPriorityHazards: true,
                appointments: true,
                dailySummary: false
            }
        });
        alert('Caregiver added successfully!');
        showCaregiverPortal();
    } catch (error) {
        console.error('Failed to add caregiver');
    }
}