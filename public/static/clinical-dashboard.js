// Clinical Assessment Dashboard for PT/OT Providers
const CLINICAL_API = '/api/clinical';

// Initialize clinical dashboard
function initClinicalDashboard() {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;

    mainContent.innerHTML = `
        <div class="clinical-dashboard">
            <!-- Header -->
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h1 class="text-3xl font-bold text-gray-900">Clinical Assessment Dashboard</h1>
                    <p class="text-gray-600">Evidence-based home safety evaluations for PT/OT providers</p>
                </div>
                <button onclick="startNewAssessment()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold">
                    <i class="fas fa-plus mr-2"></i>New Assessment
                </button>
            </div>

            <!-- Quick Stats -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <div class="flex items-center">
                        <div class="p-3 bg-blue-100 rounded-full">
                            <i class="fas fa-clipboard-list text-blue-600 text-xl"></i>
                        </div>
                        <div class="ml-4">
                            <h3 class="text-lg font-semibold text-gray-900">Total Assessments</h3>
                            <p class="text-2xl font-bold text-blue-600" id="totalAssessments">0</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <div class="flex items-center">
                        <div class="p-3 bg-red-100 rounded-full">
                            <i class="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                        </div>
                        <div class="ml-4">
                            <h3 class="text-lg font-semibold text-gray-900">High Risk Patients</h3>
                            <p class="text-2xl font-bold text-red-600" id="highRiskCount">0</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <div class="flex items-center">
                        <div class="p-3 bg-green-100 rounded-full">
                            <i class="fas fa-dollar-sign text-green-600 text-xl"></i>
                        </div>
                        <div class="ml-4">
                            <h3 class="text-lg font-semibold text-gray-900">Monthly Revenue</h3>
                            <p class="text-2xl font-bold text-green-600" id="monthlyRevenue">$0</p>
                        </div>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <div class="flex items-center">
                        <div class="p-3 bg-purple-100 rounded-full">
                            <i class="fas fa-clock text-purple-600 text-xl"></i>
                        </div>
                        <div class="ml-4">
                            <h3 class="text-lg font-semibold text-gray-900">Avg Assessment Time</h3>
                            <p class="text-2xl font-bold text-purple-600">35min</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Assessment Templates -->
            <div class="bg-white rounded-lg shadow-md mb-8">
                <div class="p-6 border-b">
                    <h2 class="text-xl font-semibold text-gray-900">Standardized Assessment Tools</h2>
                    <p class="text-gray-600">Evidence-based assessments with CPT code mapping</p>
                </div>
                <div id="assessmentTemplates" class="p-6">
                    Loading assessment templates...
                </div>
            </div>

            <!-- Recent Assessments -->
            <div class="bg-white rounded-lg shadow-md">
                <div class="p-6 border-b">
                    <h2 class="text-xl font-semibold text-gray-900">Recent Assessments</h2>
                </div>
                <div id="recentAssessments" class="p-6">
                    No assessments yet. Start your first assessment above.
                </div>
            </div>
        </div>

        <!-- Assessment Modal -->
        <div id="assessmentModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-xl max-w-4xl w-full max-h-full overflow-y-auto">
                <div id="assessmentContent"></div>
            </div>
        </div>
    `;

    // Load assessment templates
    loadAssessmentTemplates();
}

// Load assessment templates
async function loadAssessmentTemplates() {
    try {
        const response = await axios.get(`${CLINICAL_API}/templates`);
        const templates = response.data.templates || [];
        
        const templatesDiv = document.getElementById('assessmentTemplates');
        if (!templatesDiv) return;

        templatesDiv.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${templates.map(template => `
                    <div class="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onclick="selectTemplate('${template.name}')">
                        <h3 class="font-semibold text-lg text-gray-900">${template.name}</h3>
                        <p class="text-sm text-gray-600 mb-2">${template.description}</p>
                        <div class="flex justify-between items-center">
                            <span class="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">${template.time_estimate}min</span>
                            <div class="text-right">
                                ${JSON.parse(template.cpt_codes || '[]').map(code => 
                                    `<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded mr-1">${code}</span>`
                                ).join('')}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Failed to load templates:', error);
    }
}

// Start new assessment
function startNewAssessment() {
    const modal = document.getElementById('assessmentModal');
    const content = document.getElementById('assessmentContent');
    
    if (!modal || !content) return;

    content.innerHTML = `
        <div class="p-6 border-b">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-semibold text-gray-900">New Clinical Assessment</h2>
                <button onclick="closeAssessmentModal()" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            <div class="mt-4 flex space-x-2">
                <span class="step-indicator active">1. Patient Info</span>
                <span class="step-indicator">2. Functional Tests</span>
                <span class="step-indicator">3. Home Hazards</span>
                <span class="step-indicator">4. Environmental</span>
                <span class="step-indicator">5. Review</span>
            </div>
        </div>
        
        <form id="assessmentForm" class="p-6">
            <div id="step1" class="assessment-step">
                <h3 class="text-lg font-semibold mb-4">Patient Information</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Patient Name *</label>
                        <input type="text" name="patient_name" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                        <input type="date" name="patient_dob" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Assessor Name *</label>
                        <input type="text" name="assessor_name" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                        <input type="text" name="assessor_license" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <input type="text" name="location" placeholder="Patient's home address or facility" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Initial Notes</label>
                        <textarea name="notes" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                    </div>
                </div>
            </div>
            
            <div class="mt-6 flex justify-between">
                <button type="button" onclick="closeAssessmentModal()" class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                    Cancel
                </button>
                <button type="button" onclick="nextStep()" class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Next: Functional Tests
                </button>
            </div>
        </form>
    `;
    
    modal.classList.remove('hidden');
}

// Close assessment modal
function closeAssessmentModal() {
    const modal = document.getElementById('assessmentModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Next step in assessment
function nextStep() {
    // Save current step data
    // Move to next step
    // This would be expanded with full multi-step functionality
    alert('Assessment system ready for full implementation');
}

// Add styles for the clinical dashboard
const clinicalStyles = document.createElement('style');
clinicalStyles.textContent = `
    .step-indicator {
        padding: 8px 16px;
        background: #f3f4f6;
        color: #6b7280;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
    }
    .step-indicator.active {
        background: #3b82f6;
        color: white;
    }
    .assessment-step {
        min-height: 400px;
    }
`;
document.head.appendChild(clinicalStyles);

// Export for global access
window.initClinicalDashboard = initClinicalDashboard;