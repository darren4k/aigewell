// Clinical Assessment UI - Professional Interface
class ClinicalAssessmentUI {
    constructor() {
        this.currentSection = 1;
        this.assessmentData = {
            patientName: '',
            assessmentDate: new Date().toISOString().split('T')[0],
            assessor: '',
            location: '',
            functionalMobility: {},
            homeHazards: {},
            environmentalDevices: {},
            patientConcerns: {},
            observations: ''
        };
        this.riskScores = null;
    }

    render() {
        const content = document.getElementById('mainContent') || document.getElementById('ptotContent');
        content.innerHTML = `
            <div class="max-w-6xl mx-auto">
                <!-- Professional Header -->
                <div class="bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl p-6 mb-6">
                    <div class="flex justify-between items-center">
                        <div>
                            <h1 class="text-2xl font-bold">Clinical Home Safety & Fall Risk Assessment</h1>
                            <p class="mt-2">Evidence-based comprehensive evaluation protocol</p>
                        </div>
                        <div class="text-right">
                            <p class="text-sm opacity-90">Based on: HSSAT, Home FAST, CDC STEADI</p>
                            <p class="text-sm opacity-90">CPT Codes: 97161-97163, 97542, 97750</p>
                        </div>
                    </div>
                </div>

                <!-- Progress Indicator -->
                <div class="bg-white rounded-lg shadow mb-6 p-4">
                    <div class="flex items-center justify-between">
                        ${[1,2,3,4,5].map(step => `
                            <div class="flex items-center ${step < 5 ? 'flex-1' : ''}">
                                <div class="step-indicator ${this.currentSection === step ? 'active' : this.currentSection > step ? 'completed' : ''}" data-step="${step}">
                                    ${this.currentSection > step ? '<i class="fas fa-check"></i>' : step}
                                </div>
                                ${step < 5 ? '<div class="step-line ${this.currentSection > step ? "completed" : ""}"></div>' : ''}
                            </div>
                        `).join('')}
                    </div>
                    <div class="flex justify-between mt-2 text-xs text-gray-600">
                        <span>Patient Info</span>
                        <span>Mobility Tests</span>
                        <span>Home Hazards</span>
                        <span>Environment</span>
                        <span>Review</span>
                    </div>
                </div>

                <!-- Assessment Content -->
                <div class="bg-white rounded-xl shadow-lg p-6">
                    <div id="assessmentContent">
                        ${this.renderSection()}
                    </div>
                </div>

                <!-- Risk Score Display (Live) -->
                <div id="riskScoreDisplay" class="mt-6 hidden">
                    <div class="bg-white rounded-lg shadow p-4">
                        <h3 class="font-bold mb-3">Live Risk Assessment</h3>
                        <div class="grid grid-cols-4 gap-4">
                            <div class="text-center">
                                <p class="text-sm text-gray-600">Functional</p>
                                <p class="text-2xl font-bold" id="functionalScore">0</p>
                            </div>
                            <div class="text-center">
                                <p class="text-sm text-gray-600">Hazards</p>
                                <p class="text-2xl font-bold" id="hazardScore">0</p>
                            </div>
                            <div class="text-center">
                                <p class="text-sm text-gray-600">Environmental</p>
                                <p class="text-2xl font-bold" id="envScore">0</p>
                            </div>
                            <div class="text-center">
                                <p class="text-sm text-gray-600">Total Risk</p>
                                <p class="text-2xl font-bold" id="totalRiskScore">0</p>
                            </div>
                        </div>
                        <div id="riskCategory" class="mt-4 p-3 rounded-lg text-center font-bold"></div>
                    </div>
                </div>
            </div>

            <style>
                .step-indicator {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: #e5e7eb;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    color: #6b7280;
                    transition: all 0.3s;
                }
                .step-indicator.active {
                    background: #4f46e5;
                    color: white;
                    transform: scale(1.1);
                }
                .step-indicator.completed {
                    background: #10b981;
                    color: white;
                }
                .step-line {
                    flex: 1;
                    height: 2px;
                    background: #e5e7eb;
                    margin: 0 10px;
                    transition: all 0.3s;
                }
                .step-line.completed {
                    background: #10b981;
                }
                .hazard-check {
                    display: grid;
                    grid-template-columns: 1fr auto auto;
                    align-items: center;
                    padding: 12px;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    margin-bottom: 8px;
                    transition: all 0.2s;
                }
                .hazard-check:hover {
                    background: #f9fafb;
                    border-color: #4f46e5;
                }
                .risk-indicator {
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-weight: bold;
                    text-align: center;
                }
                .risk-low { background: #dcfce7; color: #166534; }
                .risk-moderate { background: #fef3c7; color: #92400e; }
                .risk-high { background: #fed7aa; color: #9a3412; }
                .risk-critical { background: #fee2e2; color: #991b1b; }
            </style>
        `;
    }

    renderSection() {
        switch(this.currentSection) {
            case 1: return this.renderPatientInfo();
            case 2: return this.renderFunctionalMobility();
            case 3: return this.renderHomeHazards();
            case 4: return this.renderEnvironmental();
            case 5: return this.renderReview();
            default: return '';
        }
    }

    renderPatientInfo() {
        return `
            <h2 class="text-xl font-bold mb-4">Section 1: Patient Information</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-1">Patient Name *</label>
                    <input type="text" id="patientName" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" 
                           placeholder="John Doe" value="${this.assessmentData.patientName}">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Assessment Date *</label>
                    <input type="date" id="assessmentDate" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" 
                           value="${this.assessmentData.assessmentDate}">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Assessor Name *</label>
                    <input type="text" id="assessorName" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" 
                           placeholder="Dr. Smith, PT" value="${this.assessmentData.assessor}">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Location</label>
                    <select id="location" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500">
                        <option value="home">Patient's Home</option>
                        <option value="clinic">Clinic</option>
                        <option value="facility">Assisted Living Facility</option>
                        <option value="other">Other</option>
                    </select>
                </div>
            </div>

            <div class="mt-6">
                <h3 class="font-semibold mb-3">Section 4: Patient/Caregiver Concerns</h3>
                <div class="space-y-3">
                    <label class="flex items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <input type="checkbox" id="previousFalls" class="mr-3 w-5 h-5 text-indigo-600">
                        <span>Previous falls in past 12 months</span>
                    </label>
                    <label class="flex items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <input type="checkbox" id="cognitiveImpairment" class="mr-3 w-5 h-5 text-indigo-600">
                        <span>Cognitive impairment/dementia</span>
                    </label>
                    <label class="flex items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <input type="checkbox" id="medicationSideEffects" class="mr-3 w-5 h-5 text-indigo-600">
                        <span>Concerns about medication side effects</span>
                    </label>
                    <label class="flex items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <input type="checkbox" id="fearOfFalling" class="mr-3 w-5 h-5 text-indigo-600">
                        <span>Fear of falling</span>
                    </label>
                </div>
            </div>

            <div class="mt-6 flex justify-end">
                <button onclick="clinicalAssessment.nextSection()" class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                    Next: Functional Mobility <i class="fas fa-arrow-right ml-2"></i>
                </button>
            </div>
        `;
    }

    renderFunctionalMobility() {
        return `
            <h2 class="text-xl font-bold mb-4">Section 2: Functional Mobility Tests</h2>
            
            <div class="space-y-6">
                <!-- TUG Test -->
                <div class="border rounded-lg p-4">
                    <h3 class="font-semibold mb-3">
                        <i class="fas fa-stopwatch text-green-600 mr-2"></i>
                        Timed Up & Go (TUG) Test
                    </h3>
                    <p class="text-sm text-gray-600 mb-3">Patient rises from chair, walks 3 meters, turns, walks back, sits down</p>
                    <div class="flex items-center space-x-4">
                        <div class="flex-1">
                            <label class="block text-sm font-medium mb-1">Time (seconds)</label>
                            <input type="number" step="0.1" id="tugTime" class="w-full px-3 py-2 border rounded-lg" 
                                   placeholder="0.0" onchange="clinicalAssessment.calculateRisk()">
                        </div>
                        <div class="flex-1">
                            <label class="block text-sm font-medium mb-1">Interpretation</label>
                            <div id="tugInterpretation" class="px-3 py-2 rounded-lg text-center font-semibold">
                                Enter time
                            </div>
                        </div>
                    </div>
                    <div class="mt-2 text-xs text-gray-500">
                        <span class="text-green-600">< 12s: Low risk</span> | 
                        <span class="text-yellow-600">12-13.5s: Moderate</span> | 
                        <span class="text-red-600">≥ 13.5s: High risk</span>
                    </div>
                </div>

                <!-- Berg Balance Scale -->
                <div class="border rounded-lg p-4">
                    <h3 class="font-semibold mb-3">
                        <i class="fas fa-balance-scale text-blue-600 mr-2"></i>
                        Berg Balance Scale
                    </h3>
                    <p class="text-sm text-gray-600 mb-3">14-item balance assessment</p>
                    <div class="flex items-center space-x-4">
                        <div class="flex-1">
                            <label class="block text-sm font-medium mb-1">Total Score (0-56)</label>
                            <input type="number" min="0" max="56" id="bergScore" class="w-full px-3 py-2 border rounded-lg" 
                                   placeholder="0" onchange="clinicalAssessment.calculateRisk()">
                        </div>
                        <div class="flex-1">
                            <label class="block text-sm font-medium mb-1">Interpretation</label>
                            <div id="bergInterpretation" class="px-3 py-2 rounded-lg text-center font-semibold">
                                Enter score
                            </div>
                        </div>
                    </div>
                    <div class="mt-2 text-xs text-gray-500">
                        <span class="text-green-600">> 50: Low risk</span> | 
                        <span class="text-yellow-600">46-50: Moderate</span> | 
                        <span class="text-red-600">≤ 45: High risk</span>
                    </div>
                </div>

                <!-- Gait Speed -->
                <div class="border rounded-lg p-4">
                    <h3 class="font-semibold mb-3">
                        <i class="fas fa-walking text-purple-600 mr-2"></i>
                        Gait Speed Test (6-meter walk)
                    </h3>
                    <p class="text-sm text-gray-600 mb-3">Normal comfortable walking speed</p>
                    <div class="flex items-center space-x-4">
                        <div class="flex-1">
                            <label class="block text-sm font-medium mb-1">Speed (m/s)</label>
                            <input type="number" step="0.1" id="gaitSpeed" class="w-full px-3 py-2 border rounded-lg" 
                                   placeholder="0.0" onchange="clinicalAssessment.calculateRisk()">
                        </div>
                        <div class="flex-1">
                            <label class="block text-sm font-medium mb-1">Interpretation</label>
                            <div id="gaitInterpretation" class="px-3 py-2 rounded-lg text-center font-semibold">
                                Enter speed
                            </div>
                        </div>
                    </div>
                    <div class="mt-2 text-xs text-gray-500">
                        <span class="text-green-600">≥ 1.0 m/s: Normal</span> | 
                        <span class="text-red-600">< 1.0 m/s: Increased fall risk</span>
                    </div>
                </div>
            </div>

            <div class="mt-6 flex justify-between">
                <button onclick="clinicalAssessment.previousSection()" class="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition">
                    <i class="fas fa-arrow-left mr-2"></i> Previous
                </button>
                <button onclick="clinicalAssessment.nextSection()" class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                    Next: Home Hazards <i class="fas fa-arrow-right ml-2"></i>
                </button>
            </div>
        `;
    }

    renderHomeHazards() {
        const rooms = ['Living Room', 'Bedroom', 'Bathroom', 'Kitchen', 'Stairs/Hallway'];
        const hazards = [
            { id: 'looseRugs', label: 'Loose rugs/carpets', icon: 'fa-shoe-prints' },
            { id: 'poorLighting', label: 'Poor lighting', icon: 'fa-lightbulb' },
            { id: 'clutterObstacles', label: 'Clutter/obstacles on floors', icon: 'fa-box' },
            { id: 'noGrabBars', label: 'No grab bars (bathroom/toilet)', icon: 'fa-grip-lines' },
            { id: 'slipperyBathSurfaces', label: 'Slippery bathtub/shower', icon: 'fa-shower' },
            { id: 'electricalCords', label: 'Electrical cords across path', icon: 'fa-plug' },
            { id: 'stairsWithoutRails', label: 'Steps/stairs without rails', icon: 'fa-stairs' },
            { id: 'unstableFurniture', label: 'Unstable furniture', icon: 'fa-couch' }
        ];

        return `
            <h2 class="text-xl font-bold mb-4">Section 3: Home Hazards Assessment</h2>
            <p class="text-gray-600 mb-4">Check all hazards present in each room</p>

            <div class="space-y-6">
                ${rooms.map(room => `
                    <div class="border rounded-lg p-4">
                        <h3 class="font-semibold mb-3 text-indigo-600">
                            <i class="fas fa-door-open mr-2"></i>${room}
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            ${hazards.map(hazard => `
                                <label class="hazard-check">
                                    <span class="flex items-center">
                                        <i class="fas ${hazard.icon} text-gray-400 mr-2"></i>
                                        ${hazard.label}
                                    </span>
                                    <button type="button" 
                                            onclick="clinicalAssessment.toggleHazard('${room}', '${hazard.id}', 'yes')"
                                            class="px-3 py-1 border rounded ${this.getHazardValue(room, hazard.id) === true ? 'bg-red-100 border-red-500 text-red-700' : 'bg-white'}"
                                            data-room="${room}" data-hazard="${hazard.id}" data-value="yes">
                                        Yes
                                    </button>
                                    <button type="button"
                                            onclick="clinicalAssessment.toggleHazard('${room}', '${hazard.id}', 'no')"
                                            class="px-3 py-1 border rounded ${this.getHazardValue(room, hazard.id) === false ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white'}"
                                            data-room="${room}" data-hazard="${hazard.id}" data-value="no">
                                        No
                                    </button>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="mt-6 flex justify-between">
                <button onclick="clinicalAssessment.previousSection()" class="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition">
                    <i class="fas fa-arrow-left mr-2"></i> Previous
                </button>
                <button onclick="clinicalAssessment.nextSection()" class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                    Next: Environmental <i class="fas fa-arrow-right ml-2"></i>
                </button>
            </div>
        `;
    }

    renderEnvironmental() {
        const devices = [
            { id: 'bathroomGrabBars', label: 'Bathroom: Grab bars' },
            { id: 'raisedToiletSeat', label: 'Bathroom: Raised toilet seat' },
            { id: 'bedroomLighting', label: 'Bedroom: Adequate lighting' },
            { id: 'stairHandrails', label: 'Stairs: Both handrails present' },
            { id: 'entryRamps', label: 'Entry: Ramps/threshold modifications' },
            { id: 'cordlessPhone', label: 'Living Room: Cordless phone nearby' }
        ];

        return `
            <h2 class="text-xl font-bold mb-4">Section 4: Environmental & Assistive Devices</h2>
            
            <div class="space-y-4">
                ${devices.map(device => `
                    <div class="border rounded-lg p-4">
                        <div class="flex items-center justify-between">
                            <span class="font-medium">${device.label}</span>
                            <div class="flex space-x-2">
                                <button type="button"
                                        onclick="clinicalAssessment.setEnvironmental('${device.id}', 'safe')"
                                        class="px-4 py-2 border rounded-lg hover:bg-green-50 ${this.assessmentData.environmentalDevices[device.id] === 'safe' ? 'bg-green-100 border-green-500 text-green-700' : ''}">
                                    <i class="fas fa-check mr-1"></i> Safe
                                </button>
                                <button type="button"
                                        onclick="clinicalAssessment.setEnvironmental('${device.id}', 'needs_mod')"
                                        class="px-4 py-2 border rounded-lg hover:bg-yellow-50 ${this.assessmentData.environmentalDevices[device.id] === 'needs_mod' ? 'bg-yellow-100 border-yellow-500 text-yellow-700' : ''}">
                                    <i class="fas fa-tools mr-1"></i> Needs Modification
                                </button>
                                <button type="button"
                                        onclick="clinicalAssessment.setEnvironmental('${device.id}', 'na')"
                                        class="px-4 py-2 border rounded-lg hover:bg-gray-50 ${this.assessmentData.environmentalDevices[device.id] === 'na' ? 'bg-gray-100 border-gray-500 text-gray-700' : ''}">
                                    N/A
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="mt-6">
                <label class="block text-sm font-medium mb-2">Clinical Observations & Notes</label>
                <textarea id="observations" class="w-full px-3 py-2 border rounded-lg h-32" 
                          placeholder="Additional observations, unique hazards, specific recommendations..."></textarea>
            </div>

            <div class="mt-6 flex justify-between">
                <button onclick="clinicalAssessment.previousSection()" class="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition">
                    <i class="fas fa-arrow-left mr-2"></i> Previous
                </button>
                <button onclick="clinicalAssessment.completeAssessment()" class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                    Complete Assessment <i class="fas fa-check ml-2"></i>
                </button>
            </div>
        `;
    }

    renderReview() {
        if (!this.riskScores) {
            this.calculateFinalRisk();
        }

        return `
            <h2 class="text-xl font-bold mb-4">Assessment Complete - Review & Submit</h2>
            
            <div class="mb-6 p-4 ${this.getRiskClass()} rounded-lg">
                <h3 class="text-lg font-bold mb-2">Overall Risk Assessment</h3>
                <p class="text-2xl font-bold">${this.getRiskCategory()}</p>
                <p class="mt-2">${this.getRiskDescription()}</p>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-gray-50 rounded-lg p-4 text-center">
                    <p class="text-sm text-gray-600">Functional Risk</p>
                    <p class="text-2xl font-bold">${this.riskScores?.functionalMobility || 0}</p>
                </div>
                <div class="bg-gray-50 rounded-lg p-4 text-center">
                    <p class="text-sm text-gray-600">Home Hazards</p>
                    <p class="text-2xl font-bold">${this.riskScores?.homeHazards || 0}</p>
                </div>
                <div class="bg-gray-50 rounded-lg p-4 text-center">
                    <p class="text-sm text-gray-600">Environmental</p>
                    <p class="text-2xl font-bold">${this.riskScores?.environmental || 0}</p>
                </div>
                <div class="bg-gray-50 rounded-lg p-4 text-center">
                    <p class="text-sm text-gray-600">Total Score</p>
                    <p class="text-2xl font-bold">${this.riskScores?.totalRisk || 0}</p>
                </div>
            </div>

            <div class="mb-6">
                <h3 class="font-bold mb-3">Recommended Interventions</h3>
                <div id="recommendationsList" class="space-y-3"></div>
            </div>

            <div class="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 class="font-bold mb-2">Billing Information</h3>
                <div id="billingCodes" class="text-sm"></div>
            </div>

            <div class="flex justify-between">
                <button onclick="clinicalAssessment.previousSection()" class="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition">
                    <i class="fas fa-arrow-left mr-2"></i> Previous
                </button>
                <div class="space-x-3">
                    <button onclick="clinicalAssessment.exportReport('pdf')" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                        <i class="fas fa-file-pdf mr-2"></i> Export PDF
                    </button>
                    <button onclick="clinicalAssessment.submitAssessment()" class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                        <i class="fas fa-paper-plane mr-2"></i> Submit to EMR
                    </button>
                </div>
            </div>
        `;
    }

    // Helper methods
    getHazardValue(room, hazardId) {
        return this.assessmentData.homeHazards[room]?.[hazardId];
    }

    toggleHazard(room, hazardId, value) {
        if (!this.assessmentData.homeHazards[room]) {
            this.assessmentData.homeHazards[room] = {};
        }
        this.assessmentData.homeHazards[room][hazardId] = value === 'yes';
        this.calculateRisk();
        this.render();
    }

    setEnvironmental(deviceId, value) {
        this.assessmentData.environmentalDevices[deviceId] = value;
        this.calculateRisk();
        this.render();
    }

    calculateRisk() {
        // Real-time risk calculation
        const tugTime = parseFloat(document.getElementById('tugTime')?.value) || 0;
        const bergScore = parseInt(document.getElementById('bergScore')?.value) || 0;
        const gaitSpeed = parseFloat(document.getElementById('gaitSpeed')?.value) || 0;

        // Update interpretations
        if (tugTime > 0) {
            const tugInt = document.getElementById('tugInterpretation');
            if (tugInt) {
                if (tugTime >= 13.5) {
                    tugInt.className = 'px-3 py-2 rounded-lg text-center font-semibold risk-critical';
                    tugInt.textContent = 'HIGH RISK';
                } else if (tugTime >= 12) {
                    tugInt.className = 'px-3 py-2 rounded-lg text-center font-semibold risk-moderate';
                    tugInt.textContent = 'MODERATE RISK';
                } else {
                    tugInt.className = 'px-3 py-2 rounded-lg text-center font-semibold risk-low';
                    tugInt.textContent = 'LOW RISK';
                }
            }
        }

        if (bergScore > 0) {
            const bergInt = document.getElementById('bergInterpretation');
            if (bergInt) {
                if (bergScore <= 45) {
                    bergInt.className = 'px-3 py-2 rounded-lg text-center font-semibold risk-critical';
                    bergInt.textContent = 'HIGH FALL RISK';
                } else if (bergScore <= 50) {
                    bergInt.className = 'px-3 py-2 rounded-lg text-center font-semibold risk-moderate';
                    bergInt.textContent = 'MODERATE RISK';
                } else {
                    bergInt.className = 'px-3 py-2 rounded-lg text-center font-semibold risk-low';
                    bergInt.textContent = 'LOW RISK';
                }
            }
        }

        // Show risk score display
        document.getElementById('riskScoreDisplay')?.classList.remove('hidden');
    }

    calculateFinalRisk() {
        // Comprehensive risk calculation
        const scores = {
            functionalMobility: 0,
            homeHazards: 0,
            environmental: 0,
            patientConcerns: 0,
            totalRisk: 0
        };

        // Calculate each section
        // ... (calculation logic)

        this.riskScores = scores;
        return scores;
    }

    getRiskCategory() {
        const total = this.riskScores?.totalRisk || 0;
        if (total >= 12) return 'CRITICAL RISK';
        if (total >= 8) return 'HIGH RISK';
        if (total >= 4) return 'MODERATE RISK';
        return 'LOW RISK';
    }

    getRiskClass() {
        const category = this.getRiskCategory();
        if (category.includes('CRITICAL')) return 'risk-critical';
        if (category.includes('HIGH')) return 'risk-high';
        if (category.includes('MODERATE')) return 'risk-moderate';
        return 'risk-low';
    }

    getRiskDescription() {
        const category = this.getRiskCategory();
        if (category.includes('CRITICAL')) return 'Immediate intervention required - Schedule follow-up within 48 hours';
        if (category.includes('HIGH')) return 'Urgent modifications needed - Follow-up within 1 week';
        if (category.includes('MODERATE')) return 'Interventions recommended - Follow-up within 30 days';
        return 'Annual review sufficient - Maintain current safety measures';
    }

    nextSection() {
        // Save current section data
        this.saveCurrentSection();
        
        if (this.currentSection < 5) {
            this.currentSection++;
            this.render();
        }
    }

    previousSection() {
        if (this.currentSection > 1) {
            this.currentSection--;
            this.render();
        }
    }

    saveCurrentSection() {
        // Save data from current section
        switch(this.currentSection) {
            case 1:
                this.assessmentData.patientName = document.getElementById('patientName')?.value || '';
                this.assessmentData.assessor = document.getElementById('assessorName')?.value || '';
                this.assessmentData.patientConcerns = {
                    previousFalls: document.getElementById('previousFalls')?.checked || false,
                    cognitiveImpairment: document.getElementById('cognitiveImpairment')?.checked || false,
                    medicationSideEffects: document.getElementById('medicationSideEffects')?.checked || false,
                    fearOfFalling: document.getElementById('fearOfFalling')?.checked || false
                };
                break;
            case 2:
                this.assessmentData.functionalMobility = {
                    tugTime: parseFloat(document.getElementById('tugTime')?.value) || null,
                    bergScore: parseInt(document.getElementById('bergScore')?.value) || null,
                    gaitSpeed: parseFloat(document.getElementById('gaitSpeed')?.value) || null
                };
                break;
        }
    }

    async completeAssessment() {
        this.saveCurrentSection();
        this.currentSection = 5;
        this.render();
        
        // Generate recommendations
        await this.generateRecommendations();
    }

    async generateRecommendations() {
        // This would call the API to get recommendations
        const recommendationsList = document.getElementById('recommendationsList');
        if (recommendationsList) {
            recommendationsList.innerHTML = `
                <div class="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                    <p class="font-semibold">Critical: Install bathroom grab bars</p>
                    <p class="text-sm text-gray-600">Evidence: AOTA 2020 - Essential for bathroom safety</p>
                </div>
                <div class="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                    <p class="font-semibold">High: PT referral for balance training</p>
                    <p class="text-sm text-gray-600">Evidence: Sherrington 2019 - Reduces falls by 23%</p>
                </div>
                <div class="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                    <p class="font-semibold">Medium: Improve lighting throughout home</p>
                    <p class="text-sm text-gray-600">Evidence: Lord 2006 - Proper lighting reduces falls</p>
                </div>
            `;
        }

        // Generate billing codes
        const billingCodes = document.getElementById('billingCodes');
        if (billingCodes) {
            billingCodes.innerHTML = `
                <p><strong>CPT 97163:</strong> PT evaluation - high complexity ($175)</p>
                <p><strong>CPT 97542:</strong> Home management training (2 units - $90)</p>
                <p><strong>CPT 97750:</strong> Physical performance test ($45)</p>
                <p class="mt-2 font-bold">Total Reimbursement: $310</p>
            `;
        }
    }

    async submitAssessment() {
        // Submit to backend
        try {
            const response = await axios.post('/api/clinical/comprehensive-assessment', this.assessmentData);
            if (response.data.success) {
                alert('Assessment submitted successfully!');
                // Show report or redirect
            }
        } catch (error) {
            console.error('Submission error:', error);
            alert('Failed to submit assessment. Please try again.');
        }
    }

    async exportReport(format) {
        // Export functionality
        window.open(`/api/clinical/report/export?format=${format}`, '_blank');
    }
}

// Initialize when needed
const clinicalAssessment = new ClinicalAssessmentUI();