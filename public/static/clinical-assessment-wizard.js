// Clinical Assessment Multi-Step Wizard
const CLINICAL_API = '/api/clinical';

class ClinicalAssessmentWizard {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 5;
        this.assessmentData = {
            patient_info: {},
            functional_tests: [],
            home_hazards: [],
            environmental: [],
            recommendations: []
        };
        this.evaluationId = null;
    }

    start() {
        this.currentStep = 1;
        this.assessmentData = {
            patient_info: {},
            functional_tests: [],
            home_hazards: [],
            environmental: [],
            recommendations: []
        };
        this.showModal();
        this.renderStep();
    }

    showModal() {
        const modal = document.getElementById('assessmentModal');
        if (!modal) {
            const modalHTML = `
                <div id="assessmentModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div class="bg-white rounded-xl max-w-4xl w-full max-h-full overflow-y-auto">
                        <div id="assessmentContent"></div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
        document.getElementById('assessmentModal').classList.remove('hidden');
    }

    closeModal() {
        const modal = document.getElementById('assessmentModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    renderStep() {
        const content = document.getElementById('assessmentContent');
        if (!content) return;

        // Render header
        content.innerHTML = `
            <div class="p-6 border-b">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-semibold text-gray-900">Clinical Assessment</h2>
                    <button onclick="clinicalWizard.closeModal()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                <div class="mt-4 flex space-x-2">
                    ${[1,2,3,4,5].map(step => `
                        <span class="step-indicator ${step === this.currentStep ? 'active' : step < this.currentStep ? 'completed' : ''}">
                            ${step}. ${this.getStepName(step)}
                        </span>
                    `).join('')}
                </div>
            </div>
            <div class="p-6">
                <div id="stepContent">${this.getStepContent()}</div>
                <div class="mt-6 flex justify-between">
                    ${this.currentStep > 1 ? `
                        <button onclick="clinicalWizard.previousStep()" class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                            <i class="fas fa-arrow-left mr-2"></i>Previous
                        </button>
                    ` : '<div></div>'}
                    <div class="flex space-x-2">
                        <button onclick="clinicalWizard.closeModal()" class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                            Cancel
                        </button>
                        ${this.currentStep < this.totalSteps ? `
                            <button onclick="clinicalWizard.nextStep()" class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                Next<i class="fas fa-arrow-right ml-2"></i>
                            </button>
                        ` : `
                            <button onclick="clinicalWizard.submitAssessment()" class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                                <i class="fas fa-check mr-2"></i>Submit Assessment
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    getStepName(step) {
        const names = {
            1: 'Patient Info',
            2: 'Functional Tests',
            3: 'Home Hazards',
            4: 'Environmental',
            5: 'Review'
        };
        return names[step] || '';
    }

    getStepContent() {
        switch(this.currentStep) {
            case 1:
                return this.getPatientInfoForm();
            case 2:
                return this.getFunctionalTestsForm();
            case 3:
                return this.getHomeHazardsForm();
            case 4:
                return this.getEnvironmentalForm();
            case 5:
                return this.getReviewForm();
            default:
                return '';
        }
    }

    getPatientInfoForm() {
        const data = this.assessmentData.patient_info;
        return `
            <h3 class="text-lg font-semibold mb-4">Patient Information</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Patient Name *</label>
                    <input type="text" id="patient_name" value="${data.patient_name || ''}" required 
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input type="date" id="patient_dob" value="${data.patient_dob || ''}" 
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Assessor Name *</label>
                    <input type="text" id="assessor_name" value="${data.assessor_name || ''}" required 
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                    <input type="text" id="assessor_license" value="${data.assessor_license || ''}" 
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input type="text" id="location" value="${data.location || ''}" placeholder="Patient's home address or facility" 
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Initial Notes</label>
                    <textarea id="notes" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">${data.notes || ''}</textarea>
                </div>
            </div>
        `;
    }

    getFunctionalTestsForm() {
        return `
            <h3 class="text-lg font-semibold mb-4">Functional Mobility Tests</h3>
            <div class="space-y-6">
                <!-- TUG Test -->
                <div class="border rounded-lg p-4">
                    <h4 class="font-semibold mb-2">Timed Up and Go (TUG)</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Time (seconds)</label>
                            <input type="number" id="tug_time" step="0.1" 
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onchange="clinicalWizard.calculateTUGRisk(this.value)">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
                            <div id="tug_risk" class="px-3 py-2 rounded-md bg-gray-100 text-gray-700">-</div>
                        </div>
                    </div>
                </div>

                <!-- Berg Balance Scale -->
                <div class="border rounded-lg p-4">
                    <h4 class="font-semibold mb-2">Berg Balance Scale</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Score (0-56)</label>
                            <input type="number" id="berg_score" min="0" max="56" 
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onchange="clinicalWizard.calculateBergRisk(this.value)">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
                            <div id="berg_risk" class="px-3 py-2 rounded-md bg-gray-100 text-gray-700">-</div>
                        </div>
                    </div>
                </div>

                <!-- Gait Speed -->
                <div class="border rounded-lg p-4">
                    <h4 class="font-semibold mb-2">Gait Speed (6-meter walk)</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Speed (m/s)</label>
                            <input type="number" id="gait_speed" step="0.01" 
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onchange="clinicalWizard.calculateGaitRisk(this.value)">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
                            <div id="gait_risk" class="px-3 py-2 rounded-md bg-gray-100 text-gray-700">-</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getHomeHazardsForm() {
        const hazards = [
            'Loose rugs/carpets',
            'Poor lighting',
            'Clutter on floors',
            'No grab bars (bathroom)',
            'Slippery bathtub/shower',
            'Electrical cords across path',
            'Steps/stairs without rails',
            'Unstable furniture',
            'No smoke/CO detectors',
            'Unsecured medications'
        ];

        return `
            <h3 class="text-lg font-semibold mb-4">Home Hazards Checklist</h3>
            <p class="text-sm text-gray-600 mb-4">Check all hazards present in the home:</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${hazards.map((hazard, index) => `
                    <label class="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input type="checkbox" id="hazard_${index}" value="${hazard}" 
                            class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            onchange="clinicalWizard.updateHazardCount()">
                        <span class="text-gray-700">${hazard}</span>
                    </label>
                `).join('')}
            </div>
            <div class="mt-4 p-4 bg-blue-50 rounded-lg">
                <div class="flex justify-between items-center">
                    <span class="font-semibold">Total Hazards Identified:</span>
                    <span id="hazardCount" class="text-2xl font-bold text-blue-600">0</span>
                </div>
                <div id="hazardRisk" class="mt-2 text-sm text-gray-600"></div>
            </div>
        `;
    }

    getEnvironmentalForm() {
        const devices = [
            { category: 'Bathroom', items: ['Grab bars', 'Raised toilet seat', 'Shower chair'] },
            { category: 'Bedroom', items: ['Adequate lighting', 'Clear pathways', 'Accessible phone'] },
            { category: 'Stairs', items: ['Handrails both sides', 'Non-slip treads', 'Adequate lighting'] },
            { category: 'General', items: ['Ramps/no thresholds', 'Wide doorways', 'Emergency response system'] }
        ];

        return `
            <h3 class="text-lg font-semibold mb-4">Environmental & Assistive Devices</h3>
            <div class="space-y-4">
                ${devices.map(category => `
                    <div class="border rounded-lg p-4">
                        <h4 class="font-semibold mb-3">${category.category}</h4>
                        <div class="space-y-2">
                            ${category.items.map((item, index) => `
                                <div class="flex items-center space-x-4">
                                    <span class="flex-1">${item}</span>
                                    <div class="flex space-x-2">
                                        <label class="cursor-pointer">
                                            <input type="radio" name="env_${category.category}_${index}" value="safe" 
                                                class="mr-1" onchange="clinicalWizard.updateEnvironmentalScore()">
                                            <span class="text-green-600">Safe</span>
                                        </label>
                                        <label class="cursor-pointer">
                                            <input type="radio" name="env_${category.category}_${index}" value="needs_mod" 
                                                class="mr-1" onchange="clinicalWizard.updateEnvironmentalScore()">
                                            <span class="text-yellow-600">Needs Modification</span>
                                        </label>
                                        <label class="cursor-pointer">
                                            <input type="radio" name="env_${category.category}_${index}" value="na" 
                                                class="mr-1" checked onchange="clinicalWizard.updateEnvironmentalScore()">
                                            <span class="text-gray-500">N/A</span>
                                        </label>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="mt-4 p-4 bg-yellow-50 rounded-lg">
                <div class="flex justify-between items-center">
                    <span class="font-semibold">Items Needing Modification:</span>
                    <span id="envCount" class="text-2xl font-bold text-yellow-600">0</span>
                </div>
            </div>
        `;
    }

    getReviewForm() {
        const riskScore = this.calculateOverallRisk();
        const riskCategory = this.getRiskCategory(riskScore);
        const recommendations = this.generateRecommendations();

        return `
            <h3 class="text-lg font-semibold mb-4">Assessment Review</h3>
            
            <!-- Patient Summary -->
            <div class="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 class="font-semibold mb-2">Patient Information</h4>
                <p><strong>Name:</strong> ${this.assessmentData.patient_info.patient_name || 'Not provided'}</p>
                <p><strong>Assessor:</strong> ${this.assessmentData.patient_info.assessor_name || 'Not provided'}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>

            <!-- Risk Assessment -->
            <div class="bg-white border-2 ${riskCategory.color} rounded-lg p-4 mb-4">
                <h4 class="font-semibold mb-2">Overall Risk Assessment</h4>
                <div class="flex justify-between items-center">
                    <div>
                        <p class="text-3xl font-bold ${riskCategory.textColor}">${riskCategory.label}</p>
                        <p class="text-sm text-gray-600">Risk Score: ${riskScore}/30</p>
                    </div>
                    <i class="fas fa-${riskCategory.icon} text-5xl ${riskCategory.textColor}"></i>
                </div>
            </div>

            <!-- Recommendations -->
            <div class="bg-blue-50 rounded-lg p-4 mb-4">
                <h4 class="font-semibold mb-2">Priority Recommendations</h4>
                <ol class="list-decimal list-inside space-y-1">
                    ${recommendations.slice(0, 5).map(rec => `
                        <li class="text-sm">${rec}</li>
                    `).join('')}
                </ol>
            </div>

            <!-- CPT Codes -->
            <div class="bg-green-50 rounded-lg p-4">
                <h4 class="font-semibold mb-2">Billing Information</h4>
                <div class="grid grid-cols-2 gap-2 text-sm">
                    <p><strong>CPT Codes:</strong></p>
                    <p>97161 (PT Evaluation), 97542 (Home Management)</p>
                    <p><strong>Estimated Reimbursement:</strong></p>
                    <p class="text-green-600 font-bold">$285</p>
                </div>
            </div>
        `;
    }

    // Risk Calculation Methods
    calculateTUGRisk(time) {
        let risk = 'Normal';
        let color = 'bg-green-100 text-green-700';
        
        if (time >= 13.5) {
            risk = 'High Risk';
            color = 'bg-red-100 text-red-700';
        } else if (time >= 10) {
            risk = 'Mild Risk';
            color = 'bg-yellow-100 text-yellow-700';
        }
        
        const element = document.getElementById('tug_risk');
        if (element) {
            element.textContent = risk;
            element.className = `px-3 py-2 rounded-md ${color}`;
        }
    }

    calculateBergRisk(score) {
        let risk = 'Low Risk';
        let color = 'bg-green-100 text-green-700';
        
        if (score <= 20) {
            risk = 'High Risk';
            color = 'bg-red-100 text-red-700';
        } else if (score <= 40) {
            risk = 'Moderate Risk';
            color = 'bg-yellow-100 text-yellow-700';
        }
        
        const element = document.getElementById('berg_risk');
        if (element) {
            element.textContent = risk;
            element.className = `px-3 py-2 rounded-md ${color}`;
        }
    }

    calculateGaitRisk(speed) {
        let risk = 'Normal';
        let color = 'bg-green-100 text-green-700';
        
        if (speed < 0.6) {
            risk = 'High Risk';
            color = 'bg-red-100 text-red-700';
        } else if (speed < 1.0) {
            risk = 'At Risk';
            color = 'bg-yellow-100 text-yellow-700';
        }
        
        const element = document.getElementById('gait_risk');
        if (element) {
            element.textContent = risk;
            element.className = `px-3 py-2 rounded-md ${color}`;
        }
    }

    updateHazardCount() {
        const checkboxes = document.querySelectorAll('input[id^="hazard_"]:checked');
        const count = checkboxes.length;
        
        document.getElementById('hazardCount').textContent = count;
        
        let risk = '';
        if (count >= 6) {
            risk = 'High risk - Urgent intervention needed';
        } else if (count >= 3) {
            risk = 'Moderate risk - Interventions recommended';
        } else {
            risk = 'Low risk - Continue monitoring';
        }
        
        document.getElementById('hazardRisk').textContent = risk;
    }

    updateEnvironmentalScore() {
        const needsMod = document.querySelectorAll('input[value="needs_mod"]:checked').length;
        document.getElementById('envCount').textContent = needsMod;
    }

    calculateOverallRisk() {
        // Simple scoring algorithm
        let score = 0;
        
        // Add points for functional tests
        const tugTime = document.getElementById('tug_time')?.value || 0;
        if (tugTime >= 13.5) score += 5;
        else if (tugTime >= 10) score += 3;
        
        const bergScore = document.getElementById('berg_score')?.value || 56;
        if (bergScore <= 20) score += 5;
        else if (bergScore <= 40) score += 3;
        
        // Add points for hazards
        const hazardCount = document.querySelectorAll('input[id^="hazard_"]:checked').length;
        score += Math.min(hazardCount, 10);
        
        // Add points for environmental needs
        const envNeeds = document.querySelectorAll('input[value="needs_mod"]:checked').length;
        score += Math.min(envNeeds * 2, 10);
        
        return Math.min(score, 30);
    }

    getRiskCategory(score) {
        if (score >= 20) {
            return {
                label: 'CRITICAL RISK',
                color: 'border-red-500',
                textColor: 'text-red-600',
                icon: 'exclamation-triangle'
            };
        } else if (score >= 12) {
            return {
                label: 'HIGH RISK',
                color: 'border-orange-500',
                textColor: 'text-orange-600',
                icon: 'exclamation-circle'
            };
        } else if (score >= 6) {
            return {
                label: 'MODERATE RISK',
                color: 'border-yellow-500',
                textColor: 'text-yellow-600',
                icon: 'info-circle'
            };
        } else {
            return {
                label: 'LOW RISK',
                color: 'border-green-500',
                textColor: 'text-green-600',
                icon: 'check-circle'
            };
        }
    }

    generateRecommendations() {
        const recommendations = [];
        
        // Check functional tests
        const tugTime = document.getElementById('tug_time')?.value || 0;
        if (tugTime >= 13.5) {
            recommendations.push('Immediate PT referral for gait and balance training');
        }
        
        // Check hazards
        const hazards = document.querySelectorAll('input[id^="hazard_"]:checked');
        hazards.forEach(hazard => {
            if (hazard.value.includes('grab bars')) {
                recommendations.push('Install grab bars in bathroom near toilet and shower');
            }
            if (hazard.value.includes('lighting')) {
                recommendations.push('Improve lighting with LED bulbs and motion sensors');
            }
            if (hazard.value.includes('rugs')) {
                recommendations.push('Remove or secure all loose rugs with non-slip backing');
            }
        });
        
        // Add general recommendations
        recommendations.push('Schedule follow-up assessment in 30 days');
        recommendations.push('Provide family education on fall prevention');
        
        return recommendations;
    }

    // Navigation Methods
    nextStep() {
        if (this.validateCurrentStep()) {
            this.saveCurrentStep();
            if (this.currentStep < this.totalSteps) {
                this.currentStep++;
                this.renderStep();
            }
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.saveCurrentStep();
            this.currentStep--;
            this.renderStep();
        }
    }

    validateCurrentStep() {
        if (this.currentStep === 1) {
            const patientName = document.getElementById('patient_name')?.value;
            const assessorName = document.getElementById('assessor_name')?.value;
            
            if (!patientName || !assessorName) {
                alert('Please fill in required fields (Patient Name and Assessor Name)');
                return false;
            }
        }
        return true;
    }

    saveCurrentStep() {
        switch(this.currentStep) {
            case 1:
                this.assessmentData.patient_info = {
                    patient_name: document.getElementById('patient_name')?.value,
                    patient_dob: document.getElementById('patient_dob')?.value,
                    assessor_name: document.getElementById('assessor_name')?.value,
                    assessor_license: document.getElementById('assessor_license')?.value,
                    location: document.getElementById('location')?.value,
                    notes: document.getElementById('notes')?.value
                };
                break;
            case 2:
                this.assessmentData.functional_tests = [
                    { test: 'TUG', value: document.getElementById('tug_time')?.value },
                    { test: 'Berg', value: document.getElementById('berg_score')?.value },
                    { test: 'Gait', value: document.getElementById('gait_speed')?.value }
                ];
                break;
            case 3:
                const hazards = document.querySelectorAll('input[id^="hazard_"]:checked');
                this.assessmentData.home_hazards = Array.from(hazards).map(h => h.value);
                break;
            case 4:
                const envItems = document.querySelectorAll('input[value="needs_mod"]:checked');
                this.assessmentData.environmental = Array.from(envItems).map(e => e.name);
                break;
        }
    }

    async submitAssessment() {
        this.saveCurrentStep();
        
        try {
            // Show loading state
            const submitBtn = document.querySelector('button[onclick="clinicalWizard.submitAssessment()"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Submitting...';
            }
            
            // In a real app, this would save to the API
            // For now, just show success
            setTimeout(() => {
                alert('Assessment submitted successfully!\n\nCPT Codes: 97161, 97542\nEstimated Reimbursement: $285');
                this.closeModal();
                
                // Refresh the dashboard if it exists
                if (typeof loadAssessmentTemplates === 'function') {
                    loadAssessmentTemplates();
                }
            }, 1500);
            
        } catch (error) {
            console.error('Failed to submit assessment:', error);
            alert('Failed to submit assessment. Please try again.');
        }
    }
}

// Create global instance
const clinicalWizard = new ClinicalAssessmentWizard();

// Override the existing functions
window.startNewAssessment = () => clinicalWizard.start();
window.closeAssessmentModal = () => clinicalWizard.closeModal();
window.nextStep = () => clinicalWizard.nextStep();

// Add styles
const wizardStyles = document.createElement('style');
wizardStyles.textContent = `
    .step-indicator {
        padding: 8px 16px;
        background: #f3f4f6;
        color: #6b7280;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 500;
        white-space: nowrap;
    }
    .step-indicator.active {
        background: #3b82f6;
        color: white;
    }
    .step-indicator.completed {
        background: #10b981;
        color: white;
    }
`;
document.head.appendChild(wizardStyles);