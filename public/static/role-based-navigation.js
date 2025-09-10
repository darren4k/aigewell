/**
 * Role-Based Navigation System for SafeAging
 * Provides role-specific workflows and navigation for Patient/Caregiver vs PT/OT Provider roles
 */

// Role definitions and permissions
const USER_ROLES = {
  PATIENT: 'patient',
  CAREGIVER: 'caregiver', 
  PROVIDER: 'provider'
};

const ROLE_PERMISSIONS = {
  [USER_ROLES.PATIENT]: {
    canScheduleAppointments: true,
    canViewOwnAssessments: true,
    canUpdateProfile: true,
    canAccessEquipment: true,
    canViewSafetyPlans: true,
    canTakePhotos: true,
    canViewReports: true,
    dashboardSections: ['assessments', 'appointments', 'safety-plans', 'equipment']
  },
  [USER_ROLES.CAREGIVER]: {
    canScheduleAppointments: true,
    canViewPatientAssessments: true,
    canUpdateProfile: true,
    canAccessEquipment: true,
    canViewSafetyPlans: true,
    canTakePhotos: true,
    canViewReports: true,
    canReceiveAlerts: true,
    dashboardSections: ['patient-overview', 'assessments', 'appointments', 'alerts', 'equipment']
  },
  [USER_ROLES.PROVIDER]: {
    canConductAssessments: true,
    canViewAllPatients: true,
    canCreateSafetyPlans: true,
    canManageSchedule: true,
    canAccessClinicalData: true,
    canGenerateReports: true,
    canPrescribeEquipment: true,
    dashboardSections: ['patient-list', 'schedule', 'clinical-assessments', 'analytics', 'reports']
  }
};

// Role-specific navigation configurations
const ROLE_NAVIGATION = {
  [USER_ROLES.PATIENT]: {
    primary: [
      { id: 'dashboard', label: 'Home', icon: 'fas fa-home', path: '/dashboard' },
      { id: 'assess', label: 'Safety Check', icon: 'fas fa-camera', path: '/assess' },
      { id: 'appointments', label: 'Appointments', icon: 'fas fa-calendar', path: '/appointments' },
      { id: 'plans', label: 'My Plan', icon: 'fas fa-clipboard-check', path: '/plans' }
    ],
    secondary: [
      { id: 'equipment', label: 'Equipment', icon: 'fas fa-shopping-cart', path: '/equipment' },
      { id: 'profile', label: 'Profile', icon: 'fas fa-user', path: '/profile' }
    ]
  },
  
  [USER_ROLES.CAREGIVER]: {
    primary: [
      { id: 'dashboard', label: 'Overview', icon: 'fas fa-tachometer-alt', path: '/dashboard' },
      { id: 'patient', label: 'My Patient', icon: 'fas fa-user-injured', path: '/patient' },
      { id: 'appointments', label: 'Appointments', icon: 'fas fa-calendar', path: '/appointments' },
      { id: 'alerts', label: 'Alerts', icon: 'fas fa-bell', path: '/alerts' }
    ],
    secondary: [
      { id: 'equipment', label: 'Equipment', icon: 'fas fa-shopping-cart', path: '/equipment' },
      { id: 'reports', label: 'Reports', icon: 'fas fa-chart-line', path: '/reports' }
    ]
  },
  
  [USER_ROLES.PROVIDER]: {
    primary: [
      { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-pie', path: '/dashboard' },
      { id: 'patients', label: 'Patients', icon: 'fas fa-users', path: '/patients' },
      { id: 'schedule', label: 'Schedule', icon: 'fas fa-calendar-alt', path: '/schedule' },
      { id: 'assessments', label: 'Clinical', icon: 'fas fa-stethoscope', path: '/clinical' },
      { id: 'marketplace', label: 'PT Marketplace', icon: 'fas fa-store', path: '/marketplace', badge: 'NEW' }
    ],
    secondary: [
      { id: 'analytics', label: 'Analytics', icon: 'fas fa-analytics', path: '/analytics' },
      { id: 'reports', label: 'Reports', icon: 'fas fa-file-medical', path: '/reports' }
    ]
  }
};

// Role selection component
function renderRoleSelection() {
  return `
    <div class="role-selection-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="role-selection-modal bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div class="text-center mb-6">
          <i class="fas fa-user-circle text-4xl text-blue-500 mb-3"></i>
          <h2 class="text-2xl font-bold text-gray-800">Who Are You?</h2>
          <p class="text-gray-600 mt-2">Select your role to personalize your experience</p>
        </div>
        
        <div class="space-y-3">
          <button onclick="selectRole('${USER_ROLES.PATIENT}')" 
                  class="role-option w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group">
            <div class="flex items-center">
              <div class="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200">
                <i class="fas fa-user text-blue-600"></i>
              </div>
              <div class="ml-4 text-left">
                <h3 class="font-semibold text-gray-800">Patient</h3>
                <p class="text-sm text-gray-600">I need home safety assessment and care</p>
              </div>
            </div>
          </button>
          
          <button onclick="selectRole('${USER_ROLES.CAREGIVER}')" 
                  class="role-option w-full p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group">
            <div class="flex items-center">
              <div class="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200">
                <i class="fas fa-heart text-green-600"></i>
              </div>
              <div class="ml-4 text-left">
                <h3 class="font-semibold text-gray-800">Family Caregiver</h3>
                <p class="text-sm text-gray-600">I care for a family member or loved one</p>
              </div>
            </div>
          </button>
          
          <button onclick="selectRole('${USER_ROLES.PROVIDER}')" 
                  class="role-option w-full p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group">
            <div class="flex items-center">
              <div class="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200">
                <i class="fas fa-user-md text-purple-600"></i>
              </div>
              <div class="ml-4 text-left">
                <h3 class="font-semibold text-gray-800">PT/OT Provider</h3>
                <p class="text-sm text-gray-600">I'm a licensed healthcare professional</p>
              </div>
            </div>
          </button>
        </div>
        
        <div class="mt-6 pt-4 border-t border-gray-200">
          <p class="text-xs text-gray-500 text-center">
            You can change this setting anytime in your profile
          </p>
        </div>
      </div>
    </div>
  `;
}

// Role-specific dashboard content
function renderRoleDashboard(role, user) {
  const permissions = ROLE_PERMISSIONS[role];
  const navigation = ROLE_NAVIGATION[role];
  
  switch (role) {
    case USER_ROLES.PATIENT:
      return renderPatientDashboard(user, permissions);
    case USER_ROLES.CAREGIVER:
      return renderCaregiverDashboard(user, permissions);
    case USER_ROLES.PROVIDER:
      return renderProviderDashboard(user, permissions);
    default:
      return renderRoleSelection();
  }
}

function renderPatientDashboard(user, permissions) {
  return `
    <div class="patient-dashboard">
      <!-- Welcome Header -->
      <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold">Welcome back, ${user.first_name}!</h1>
            <p class="text-blue-100 mt-1">Let's keep your home safe and secure</p>
          </div>
          <div class="text-right">
            <div class="text-3xl font-bold">${getHomeScore()}</div>
            <div class="text-sm text-blue-200">Safety Score</div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <button onclick="showView('assess')" class="quick-action-card bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200">
          <div class="text-center">
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <i class="fas fa-camera text-blue-600 text-xl"></i>
            </div>
            <h3 class="font-semibold text-gray-800">Safety Check</h3>
            <p class="text-sm text-gray-600 mt-1">Take room photos</p>
          </div>
        </button>

        <button onclick="showView('appointments')" class="quick-action-card bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200">
          <div class="text-center">
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <i class="fas fa-calendar text-green-600 text-xl"></i>
            </div>
            <h3 class="font-semibold text-gray-800">Book Visit</h3>
            <p class="text-sm text-gray-600 mt-1">Schedule PT/OT</p>
          </div>
        </button>

        <button onclick="showView('plans')" class="quick-action-card bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200">
          <div class="text-center">
            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <i class="fas fa-clipboard-check text-purple-600 text-xl"></i>
            </div>
            <h3 class="font-semibold text-gray-800">My Plan</h3>
            <p class="text-sm text-gray-600 mt-1">Safety improvements</p>
          </div>
        </button>

        <button onclick="showView('equipment')" class="quick-action-card bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200">
          <div class="text-center">
            <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <i class="fas fa-shopping-cart text-orange-600 text-xl"></i>
            </div>
            <h3 class="font-semibold text-gray-800">Equipment</h3>
            <p class="text-sm text-gray-600 mt-1">Shop safety items</p>
          </div>
        </button>
      </div>

      <!-- Recent Activity -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-800 mb-4">Recent Assessments</h2>
          <div id="recent-assessments">
            ${renderRecentAssessments()}
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-800 mb-4">Upcoming Appointments</h2>
          <div id="upcoming-appointments">
            ${renderUpcomingAppointments()}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderCaregiverDashboard(user, permissions) {
  return `
    <div class="caregiver-dashboard">
      <!-- Caregiver Header -->
      <div class="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold">Caregiver Dashboard</h1>
            <p class="text-green-100 mt-1">Managing care for your loved one</p>
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold">${getPatientCount()}</div>
            <div class="text-sm text-green-200">Patient${getPatientCount() !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>

      <!-- Alert Summary -->
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div class="flex items-center">
          <i class="fas fa-exclamation-triangle text-yellow-600 text-xl mr-3"></i>
          <div>
            <h3 class="font-semibold text-yellow-800">Active Alerts</h3>
            <p class="text-yellow-700 text-sm">2 safety concerns need attention</p>
          </div>
          <button onclick="showView('alerts')" class="ml-auto bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700">
            View All
          </button>
        </div>
      </div>

      <!-- Patient Overview Cards -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="font-semibold text-gray-800 mb-3">Patient Status</h3>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-gray-600">Safety Score</span>
              <span class="font-semibold">${getHomeScore()}/100</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Last Assessment</span>
              <span class="text-sm">3 days ago</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Risk Level</span>
              <span class="text-orange-600 font-semibold">Moderate</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="font-semibold text-gray-800 mb-3">Next Appointments</h3>
          <div class="space-y-2">
            <div class="text-sm">
              <div class="font-semibold">PT Session</div>
              <div class="text-gray-600">Tomorrow, 2:00 PM</div>
            </div>
            <div class="text-sm">
              <div class="font-semibold">Follow-up</div>
              <div class="text-gray-600">Friday, 10:00 AM</div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="font-semibold text-gray-800 mb-3">Safety Plan Progress</h3>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span>Completed</span>
              <span class="font-semibold">7/10</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-green-600 h-2 rounded-full" style="width: 70%"></div>
            </div>
            <div class="text-xs text-gray-500">3 items remaining</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderProviderDashboard(user, permissions) {
  return `
    <div class="provider-dashboard">
      <!-- Provider Header -->
      <div class="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold">Provider Portal</h1>
            <p class="text-purple-100 mt-1">Dr. ${user.first_name} ${user.last_name}, ${user.provider_type?.toUpperCase()}</p>
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold">${getActivePatientCount()}</div>
            <div class="text-sm text-purple-200">Active Patients</div>
          </div>
        </div>
      </div>

      <!-- Today's Schedule -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div class="lg:col-span-2 bg-white rounded-lg shadow">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-800">Today's Schedule</h2>
          </div>
          <div class="p-6">
            ${renderTodaySchedule()}
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-800 mb-4">Quick Stats</h2>
          <div class="space-y-4">
            <div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Today's Visits</span>
                <span class="font-semibold">6</span>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Pending Reports</span>
                <span class="font-semibold text-orange-600">3</span>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">High-Risk Patients</span>
                <span class="font-semibold text-red-600">2</span>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">This Week</span>
                <span class="font-semibold">28 visits</span>
              </div>
            </div>
            <!-- V2 Enhancement: PT Marketplace Earnings -->
            <div class="border-t pt-4 mt-4">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">PT Marketplace Earnings</span>
                <span class="font-semibold text-green-600">$12,750</span>
              </div>
              <div class="flex justify-between text-xs text-gray-500 mt-1">
                <span>This month: $3,825</span>
                <span class="text-green-600">+15%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-800 mb-4">Recent Assessments</h2>
          ${renderProviderAssessments()}
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-800 mb-4">Alerts & Notifications</h2>
          ${renderProviderAlerts()}
        </div>
      </div>
    </div>
  `;
}

// Role-specific navigation renderer
function renderRoleNavigation(role, isMobile = false) {
  const navigation = ROLE_NAVIGATION[role];
  if (!navigation) return '';

  const baseClass = isMobile ? 'nav-btn-mobile' : 'nav-btn';
  const containerClass = isMobile ? 'justify-around' : 'space-x-1';

  return `
    <div class="flex ${containerClass}">
      ${navigation.primary.map(item => `
        <button onclick="showView('${item.id}')" 
                class="${baseClass} ${currentView === item.id ? 'active' : ''} ${item.badge ? 'relative' : ''}"
                data-role-required="${role}">
          <i class="${item.icon} ${isMobile ? 'nav-icon' : 'mr-2'}"></i>
          <span>${item.label}</span>
          ${item.badge ? `<span class="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full px-2 py-0.5 font-semibold">${item.badge}</span>` : ''}
        </button>
      `).join('')}
      
      ${!isMobile && navigation.secondary ? `
        <div class="relative inline-block">
          <button onclick="toggleMoreMenu()" class="nav-btn">
            <i class="fas fa-ellipsis-h mr-2"></i>More
          </button>
          <div id="moreMenu" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
            ${navigation.secondary.map(item => `
              <button onclick="showView('${item.id}'); toggleMoreMenu();" 
                      class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                <i class="${item.icon} mr-2"></i>${item.label}
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// Utility functions
function getHomeScore() {
  return Math.floor(Math.random() * 20 + 80); // Mock score 80-100
}

function getPatientCount() {
  return 1; // Mock patient count
}

function getActivePatientCount() {
  return Math.floor(Math.random() * 10 + 15); // Mock count 15-25
}

function renderRecentAssessments() {
  return `
    <div class="space-y-3">
      <div class="flex items-center justify-between py-2 border-b border-gray-100">
        <div>
          <div class="font-medium text-sm">Living Room Assessment</div>
          <div class="text-xs text-gray-500">3 days ago</div>
        </div>
        <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Low Risk</span>
      </div>
      <div class="flex items-center justify-between py-2 border-b border-gray-100">
        <div>
          <div class="font-medium text-sm">Bathroom Safety Check</div>
          <div class="text-xs text-gray-500">1 week ago</div>
        </div>
        <span class="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">Moderate Risk</span>
      </div>
    </div>
  `;
}

function renderUpcomingAppointments() {
  return `
    <div class="space-y-3">
      <div class="py-2 border-b border-gray-100">
        <div class="font-medium text-sm">PT Session with Sarah Johnson</div>
        <div class="text-xs text-gray-500">Tomorrow, 2:00 PM</div>
      </div>
      <div class="py-2 border-b border-gray-100">
        <div class="font-medium text-sm">Home Safety Follow-up</div>
        <div class="text-xs text-gray-500">Friday, 10:00 AM</div>
      </div>
    </div>
  `;
}

function renderTodaySchedule() {
  const appointments = [
    { time: '9:00 AM', patient: 'Mary Johnson', type: 'Initial Assessment' },
    { time: '10:30 AM', patient: 'Robert Smith', type: 'Follow-up' },
    { time: '2:00 PM', patient: 'Alice Brown', type: 'PT Session' },
    { time: '3:30 PM', patient: 'David Wilson', type: 'Home Safety Review' }
  ];

  return `
    <div class="space-y-3">
      ${appointments.map(apt => `
        <div class="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
          <div class="flex items-center">
            <div class="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
            <div>
              <div class="font-medium text-sm">${apt.patient}</div>
              <div class="text-xs text-gray-500">${apt.type}</div>
            </div>
          </div>
          <div class="text-sm text-gray-600">${apt.time}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderProviderAssessments() {
  return `
    <div class="space-y-3">
      <div class="py-2 border-b border-gray-100">
        <div class="flex justify-between items-start">
          <div>
            <div class="font-medium text-sm">Home FAST - Mary J.</div>
            <div class="text-xs text-gray-500">Completed today</div>
          </div>
          <span class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">High Risk</span>
        </div>
      </div>
      <div class="py-2 border-b border-gray-100">
        <div class="flex justify-between items-start">
          <div>
            <div class="font-medium text-sm">Berg Balance - Robert S.</div>
            <div class="text-xs text-gray-500">Yesterday</div>
          </div>
          <span class="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">Moderate Risk</span>
        </div>
      </div>
    </div>
  `;
}

function renderProviderAlerts() {
  return `
    <div class="space-y-3">
      <div class="p-3 bg-red-50 border border-red-200 rounded-lg">
        <div class="flex items-start">
          <i class="fas fa-exclamation-triangle text-red-500 mt-1 mr-2"></i>
          <div class="flex-1">
            <div class="font-medium text-sm text-red-800">High Fall Risk Alert</div>
            <div class="text-xs text-red-600">Mary Johnson - requires immediate attention</div>
          </div>
        </div>
      </div>
      <div class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div class="flex items-start">
          <i class="fas fa-clock text-yellow-500 mt-1 mr-2"></i>
          <div class="flex-1">
            <div class="font-medium text-sm text-yellow-800">Overdue Documentation</div>
            <div class="text-xs text-yellow-600">3 patient reports pending completion</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Role management functions
function selectRole(role) {
  if (!currentUser) {
    alert('Please log in first');
    return;
  }

  // Store role preference
  localStorage.setItem('selectedRole', role);
  currentUser.selectedRole = role;

  // Update UI
  document.querySelector('.role-selection-overlay').remove();
  
  // Re-render app with role-specific content
  renderApp();
  
  // Show role-specific dashboard
  showView('dashboard');
}

function getCurrentUserRole() {
  if (!currentUser) return null;
  
  // Check if user has selected a role override
  const selectedRole = localStorage.getItem('selectedRole');
  if (selectedRole && Object.values(USER_ROLES).includes(selectedRole)) {
    return selectedRole;
  }
  
  // Use actual user role from database
  return currentUser.role;
}

function hasPermission(permission) {
  const role = getCurrentUserRole();
  if (!role) return false;
  
  const permissions = ROLE_PERMISSIONS[role];
  return permissions && permissions[permission];
}

function showRoleSelector() {
  const overlay = document.createElement('div');
  overlay.innerHTML = renderRoleSelection();
  document.body.appendChild(overlay.firstElementChild);
}

function toggleMoreMenu() {
  const menu = document.getElementById('moreMenu');
  menu.classList.toggle('hidden');
}

// Export functions for use in main app
window.RoleBasedNavigation = {
  USER_ROLES,
  ROLE_PERMISSIONS,
  renderRoleSelection,
  renderRoleDashboard,
  renderRoleNavigation,
  selectRole,
  getCurrentUserRole,
  hasPermission,
  showRoleSelector,
  toggleMoreMenu
};