// PT/OT Professional Dashboard
const PTOT_API = '/api/ptot';

// State for current evaluation
let currentEvaluation = null;
let currentPatient = null;
let assessmentTemplates = [];

// Initialize PT/OT Dashboard
function initPTOTDashboard() {
    loadAssessmentTemplates();
    renderPTOTInterface();
}

// Load assessment templates
async function loadAssessmentTemplates() {
    try {
        const response = await axios.get(`${PTOT_API}/templates`);
        assessmentTemplates = response.data.templates;
    } catch (error) {
        console.error('Failed to load templates:', error);
    }
}

// Main PT/OT interface
function renderPTOTInterface() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
        <div class="max-w-7xl mx-auto">
            <!-- Provider Header -->
            <div class="bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl p-6 mb-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-2xl font-bold">PT/OT Professional Evaluation System</h1>
                        <p class="mt-2">Evidence-based assessments for fall risk and functional capacity</p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm opacity-90">Provider: Dr. Smith, PT, DPT</p>
                        <p class="text-sm opacity-90">License: PT-12345</p>
                    </div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <button onclick="startNewEvaluation()" class="p-4 bg-white rounded-lg shadow hover:shadow-lg transition">
                    <i class="fas fa-plus-circle text-3xl text-blue-600 mb-2"></i>
                    <p class="font-semibold">New Evaluation</p>
                </button>
                <button onclick="showMyEvaluations()" class="p-4 bg-white rounded-lg shadow hover:shadow-lg transition">
                    <i class="fas fa-clipboard-list text-3xl text-green-600 mb-2"></i>
                    <p class="font-semibold">My Evaluations</p>
                </button>
                <button onclick="showAssessmentTools()" class="p-4 bg-white rounded-lg shadow hover:shadow-lg transition">
                    <i class="fas fa-tools text-3xl text-purple-600 mb-2"></i>
                    <p class="font-semibold">Assessment Tools</p>
                </button>
                <button onclick="showReportGenerator()" class="p-4 bg-white rounded-lg shadow hover:shadow-lg transition">
                    <i class="fas fa-file-medical text-3xl text-orange-600 mb-2"></i>
                    <p class="font-semibold">Generate Reports</p>
                </button>
            </div>

            <!-- Main Content Area -->
            <div id="ptotContent" class="bg-white rounded-xl shadow-lg p-6">
                ${renderEvaluationWizard()}
            </div>
        </div>
    `;
}

// Evaluation wizard
function renderEvaluationWizard() {
    return `
        <div class="evaluation-wizard">
            <!-- Progress Steps -->
            <div class="flex items-center justify-between mb-8">
                <div class="flex-1">
                    <div class="flex items-center">
                        <div class="step-circle active">1</div>
                        <div class="step-line"></div>
                        <div class="step-circle">2</div>
                        <div class="step-line"></div>
                        <div class="step-circle">3</div>
                        <div class="step-line"></div>
                        <div class="step-circle">4</div>
                        <div class="step-line"></div>
                        <div class="step-circle">5</div>
                    </div>
                    <div class="flex justify-between mt-2 text-sm">
                        <span>Patient Info</span>
                        <span>Assessments</span>
                        <span>Home Safety</span>
                        <span>Recommendations</span>
                        <span>Report</span>
                    </div>
                </div>
            </div>

            <!-- Step 1: Patient Information -->
            <div id="step1" class="step-content">
                <h2 class="text-xl font-bold mb-4">Patient Information</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-1">Patient Name</label>
                        <input type="text" id="patientName" class="w-full px-3 py-2 border rounded-lg" placeholder="John Doe">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Date of Birth</label>
                        <input type="date" id="patientDOB" class="w-full px-3 py-2 border rounded-lg">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Chief Complaint</label>
                        <input type="text" id="chiefComplaint" class="w-full px-3 py-2 border rounded-lg" placeholder="e.g., Recent fall, balance issues">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Living Situation</label>
                        <select id="livingSituation" class="w-full px-3 py-2 border rounded-lg">
                            <option value="alone">Lives Alone</option>
                            <option value="with_spouse">With Spouse</option>
                            <option value="with_family">With Family</option>
                            <option value="assisted_living">Assisted Living</option>
                        </select>
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium mb-1">Medical History</label>
                        <textarea id="medicalHistory" class="w-full px-3 py-2 border rounded-lg" rows="3" placeholder="Relevant medical conditions, surgeries, medications..."></textarea>
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium mb-1">Current Medications</label>
                        <textarea id="medications" class="w-full px-3 py-2 border rounded-lg" rows="2" placeholder="List all current medications"></textarea>
                    </div>
                </div>
                <div class="mt-6 flex justify-end">
                    <button onclick="proceedToAssessments()" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Next: Assessments <i class="fas fa-arrow-right ml-2"></i>
                    </button>
                </div>
            </div>
        </div>

        <style>
            .step-circle {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: #e5e7eb;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                color: #6b7280;
            }
            .step-circle.active {
                background: #3b82f6;
                color: white;
            }
            .step-circle.completed {
                background: #10b981;
                color: white;
            }
            .step-line {
                flex: 1;
                height: 2px;
                background: #e5e7eb;
                margin: 0 10px;
            }
        </style>
    `;
}

// Berg Balance Scale Assessment Form
function renderBergBalanceScale() {
    const items = [
        { id: 'sittingToStanding', label: 'Sitting to Standing', description: 'Ability to stand up from sitting' },
        { id: 'standingUnsupported', label: 'Standing Unsupported', description: 'Stand for 2 minutes without support' },
        { id: 'sittingUnsupported', label: 'Sitting Unsupported', description: 'Sit with back unsupported, feet on floor' },
        { id: 'standingToSitting', label: 'Standing to Sitting', description: 'Controlled sitting down' },
        { id: 'transfers', label: 'Transfers', description: 'Move from chair to chair' },
        { id: 'standingEyesClosed', label: 'Standing Eyes Closed', description: 'Stand with eyes closed for 10 seconds' },
        { id: 'standingFeetTogether', label: 'Standing Feet Together', description: 'Stand with feet together for 1 minute' },
        { id: 'reachingForward', label: 'Reaching Forward', description: 'Reach forward with outstretched arm' },
        { id: 'pickingUpObject', label: 'Picking Up Object', description: 'Pick up object from floor' },
        { id: 'turningLookBehind', label: 'Turning to Look Behind', description: 'Turn to look over shoulders' },
        { id: 'turning360', label: 'Turning 360 Degrees', description: 'Complete full turn in each direction' },
        { id: 'placingFootOnStool', label: 'Placing Foot on Stool', description: 'Alternately place foot on stool' },
        { id: 'standingOneFootFront', label: 'Tandem Standing', description: 'Stand with one foot in front' },
        { id: 'standingOnOneLeg', label: 'Standing on One Leg', description: 'Stand on one leg as long as possible' }
    ];

    return `
        <div class="berg-balance-form">
            <h3 class="text-lg font-bold mb-4">Berg Balance Scale Assessment</h3>
            <p class="text-gray-600 mb-6">Rate each item from 0 (unable) to 4 (independent)</p>
            
            <div class="space-y-4">
                ${items.map(item => `
                    <div class="border rounded-lg p-4">
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex-1">
                                <p class="font-semibold">${item.label}</p>
                                <p class="text-sm text-gray-600">${item.description}</p>
                            </div>
                            <div class="flex space-x-2 ml-4">
                                ${[0,1,2,3,4].map(score => `
                                    <button onclick="setBergScore('${item.id}', ${score})" 
                                            class="berg-score-btn w-10 h-10 border rounded hover:bg-blue-100" 
                                            data-item="${item.id}" data-score="${score}">
                                        ${score}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="mt-6 p-4 bg-blue-50 rounded-lg">
                <div class="flex justify-between items-center">
                    <div>
                        <p class="font-semibold">Total Score: <span id="bergTotalScore" class="text-2xl">0</span>/56</p>
                        <p class="text-sm text-gray-600 mt-1">Fall Risk: <span id="bergFallRisk" class="font-semibold">Not Assessed</span></p>
                    </div>
                    <button onclick="submitBergBalance()" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Submit Berg Balance
                    </button>
                </div>
            </div>
        </div>
    `;
}

// TUG Test Form
function renderTUGTest() {
    return `
        <div class="tug-test-form">
            <h3 class="text-lg font-bold mb-4">Timed Up and Go (TUG) Test</h3>
            <p class="text-gray-600 mb-6">Patient rises from chair, walks 3 meters, turns, walks back, and sits down</p>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                    <label class="block text-sm font-medium mb-1">Trial 1 (seconds)</label>
                    <input type="number" step="0.1" id="tugTrial1" class="w-full px-3 py-2 border rounded-lg" placeholder="0.0">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Trial 2 (seconds)</label>
                    <input type="number" step="0.1" id="tugTrial2" class="w-full px-3 py-2 border rounded-lg" placeholder="0.0">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Trial 3 (seconds)</label>
                    <input type="number" step="0.1" id="tugTrial3" class="w-full px-3 py-2 border rounded-lg" placeholder="0.0">
                </div>
            </div>
            
            <div class="mb-4">
                <label class="block text-sm font-medium mb-1">Assistive Device Used</label>
                <select id="tugDevice" class="w-full px-3 py-2 border rounded-lg">
                    <option value="none">None</option>
                    <option value="cane">Cane</option>
                    <option value="walker">Walker</option>
                    <option value="rollator">Rollator</option>
                </select>
            </div>
            
            <div class="mb-4">
                <label class="block text-sm font-medium mb-1">Notes</label>
                <textarea id="tugNotes" class="w-full px-3 py-2 border rounded-lg" rows="2" placeholder="Any observations or concerns"></textarea>
            </div>
            
            <div class="p-4 bg-yellow-50 rounded-lg">
                <h4 class="font-semibold mb-2">Interpretation Guidelines:</h4>
                <ul class="text-sm space-y-1">
                    <li><span class="font-medium text-green-600">&lt; 10 seconds:</span> Low fall risk, independent</li>
                    <li><span class="font-medium text-yellow-600">10-14 seconds:</span> Moderate fall risk, may need assistance</li>
                    <li><span class="font-medium text-red-600">&gt; 14 seconds:</span> High fall risk, requires intervention</li>
                </ul>
            </div>
            
            <div class="mt-6 flex justify-end">
                <button onclick="submitTUGTest()" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Submit TUG Test
                </button>
            </div>
        </div>
    `;
}

// Home Safety Checklist
function renderHomeSafetyChecklist() {
    const categories = [
        {
            name: 'Entrance/Exit',
            items: [
                { id: 'entranceLighting', label: 'Adequate lighting at entrance' },
                { id: 'entranceSteps', label: 'Steps in good condition' },
                { id: 'entranceHandrails', label: 'Handrails present and secure' }
            ]
        },
        {
            name: 'Bathroom',
            items: [
                { id: 'grabBarsToilet', label: 'Grab bars near toilet' },
                { id: 'grabBarsShower', label: 'Grab bars in shower/tub' },
                { id: 'nonSlipSurfaces', label: 'Non-slip surfaces in tub/shower' },
                { id: 'bathroomLighting', label: 'Adequate bathroom lighting' }
            ]
        },
        {
            name: 'Bedroom',
            items: [
                { id: 'bedHeight', label: 'Appropriate bed height' },
                { id: 'nightlight', label: 'Nightlight or bedside lamp' },
                { id: 'pathToBathroom', label: 'Clear path to bathroom' }
            ]
        },
        {
            name: 'Stairs',
            items: [
                { id: 'stairLighting', label: 'Good lighting on stairs' },
                { id: 'handrailsBothSides', label: 'Handrails on both sides' },
                { id: 'stepMarking', label: 'Step edges clearly marked' }
            ]
        },
        {
            name: 'Living Areas',
            items: [
                { id: 'pathwayClearance', label: 'Clear pathways' },
                { id: 'rugSecurity', label: 'Rugs secured or removed' },
                { id: 'furnitureArrangement', label: 'Stable furniture arrangement' }
            ]
        }
    ];

    return `
        <div class="home-safety-checklist">
            <h3 class="text-lg font-bold mb-4">Home Safety Evaluation Checklist</h3>
            <p class="text-gray-600 mb-6">Assess each area for safety hazards</p>
            
            <div class="space-y-6">
                ${categories.map(category => `
                    <div class="border rounded-lg p-4">
                        <h4 class="font-semibold mb-3 text-blue-600">${category.name}</h4>
                        <div class="space-y-3">
                            ${category.items.map(item => `
                                <div class="flex items-center justify-between">
                                    <label class="flex-1">${item.label}</label>
                                    <div class="flex space-x-2">
                                        <button onclick="setHomeSafety('${item.id}', 'adequate')" 
                                                class="safety-btn px-3 py-1 border rounded text-sm hover:bg-green-100"
                                                data-item="${item.id}" data-value="adequate">
                                            <i class="fas fa-check"></i> Adequate
                                        </button>
                                        <button onclick="setHomeSafety('${item.id}', 'needs_improvement')" 
                                                class="safety-btn px-3 py-1 border rounded text-sm hover:bg-yellow-100"
                                                data-item="${item.id}" data-value="needs_improvement">
                                            <i class="fas fa-exclamation"></i> Needs Work
                                        </button>
                                        <button onclick="setHomeSafety('${item.id}', 'inadequate')" 
                                                class="safety-btn px-3 py-1 border rounded text-sm hover:bg-red-100"
                                                data-item="${item.id}" data-value="inadequate">
                                            <i class="fas fa-times"></i> Inadequate
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="mt-6 p-4 bg-orange-50 rounded-lg">
                <h4 class="font-semibold mb-2">Priority Modifications:</h4>
                <div id="priorityMods" class="text-sm space-y-1">
                    <p class="text-gray-600">Complete assessment to see recommendations</p>
                </div>
            </div>
            
            <div class="mt-6 flex justify-end">
                <button onclick="submitHomeSafety()" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Submit Home Safety Assessment
                </button>
            </div>
        </div>
    `;
}

// Show assessment tools selection
function showAssessmentTools() {
    const content = document.getElementById('ptotContent');
    content.innerHTML = `
        <h2 class="text-xl font-bold mb-6">Select Assessment Tools</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Berg Balance Scale -->
            <div class="border rounded-lg p-6 hover:shadow-lg transition cursor-pointer" onclick="showBergBalance()">
                <div class="flex items-start">
                    <i class="fas fa-balance-scale text-3xl text-blue-600 mr-4"></i>
                    <div>
                        <h3 class="font-bold text-lg">Berg Balance Scale</h3>
                        <p class="text-gray-600 text-sm mt-1">14-item scale for balance assessment</p>
                        <p class="text-sm mt-2"><strong>Time:</strong> 15-20 minutes</p>
                        <p class="text-sm"><strong>CPT Codes:</strong> 97161, 97162, 97163</p>
                    </div>
                </div>
            </div>
            
            <!-- TUG Test -->
            <div class="border rounded-lg p-6 hover:shadow-lg transition cursor-pointer" onclick="showTUGTest()">
                <div class="flex items-start">
                    <i class="fas fa-stopwatch text-3xl text-green-600 mr-4"></i>
                    <div>
                        <h3 class="font-bold text-lg">Timed Up and Go (TUG)</h3>
                        <p class="text-gray-600 text-sm mt-1">Quick mobility and balance screen</p>
                        <p class="text-sm mt-2"><strong>Time:</strong> 5-10 minutes</p>
                        <p class="text-sm"><strong>CPT Codes:</strong> 97161, 97162</p>
                    </div>
                </div>
            </div>
            
            <!-- Tinetti Assessment -->
            <div class="border rounded-lg p-6 hover:shadow-lg transition cursor-pointer" onclick="showTinetti()">
                <div class="flex items-start">
                    <i class="fas fa-walking text-3xl text-purple-600 mr-4"></i>
                    <div>
                        <h3 class="font-bold text-lg">Tinetti Assessment</h3>
                        <p class="text-gray-600 text-sm mt-1">Gait and balance evaluation</p>
                        <p class="text-sm mt-2"><strong>Time:</strong> 20-25 minutes</p>
                        <p class="text-sm"><strong>CPT Codes:</strong> 97162, 97163</p>
                    </div>
                </div>
            </div>
            
            <!-- ADL Assessment -->
            <div class="border rounded-lg p-6 hover:shadow-lg transition cursor-pointer" onclick="showADL()">
                <div class="flex items-start">
                    <i class="fas fa-tasks text-3xl text-orange-600 mr-4"></i>
                    <div>
                        <h3 class="font-bold text-lg">Activities of Daily Living</h3>
                        <p class="text-gray-600 text-sm mt-1">Functional independence assessment</p>
                        <p class="text-sm mt-2"><strong>Time:</strong> 25-30 minutes</p>
                        <p class="text-sm"><strong>CPT Codes:</strong> 97165, 97166</p>
                    </div>
                </div>
            </div>
            
            <!-- Home Safety -->
            <div class="border rounded-lg p-6 hover:shadow-lg transition cursor-pointer" onclick="showHomeSafety()">
                <div class="flex items-start">
                    <i class="fas fa-home text-3xl text-red-600 mr-4"></i>
                    <div>
                        <h3 class="font-bold text-lg">Home Safety Evaluation</h3>
                        <p class="text-gray-600 text-sm mt-1">Environmental hazard assessment</p>
                        <p class="text-sm mt-2"><strong>Time:</strong> 30-45 minutes</p>
                        <p class="text-sm"><strong>CPT Codes:</strong> 97542, 97750</p>
                    </div>
                </div>
            </div>
            
            <!-- 30-Second Chair Stand -->
            <div class="border rounded-lg p-6 hover:shadow-lg transition cursor-pointer" onclick="showChairStand()">
                <div class="flex items-start">
                    <i class="fas fa-chair text-3xl text-teal-600 mr-4"></i>
                    <div>
                        <h3 class="font-bold text-lg">30-Second Chair Stand</h3>
                        <p class="text-gray-600 text-sm mt-1">Lower body strength test</p>
                        <p class="text-sm mt-2"><strong>Time:</strong> 5 minutes</p>
                        <p class="text-sm"><strong>CPT Code:</strong> 97161</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 class="font-semibold mb-2">Selected Assessments Summary:</h3>
            <div id="selectedAssessments" class="text-sm">
                <p class="text-gray-600">No assessments selected yet</p>
            </div>
            <div class="mt-4 flex justify-between items-center">
                <p class="text-sm"><strong>Estimated Total Time:</strong> <span id="totalTime">0 minutes</span></p>
                <button onclick="generateComprehensiveReport()" class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    Generate Comprehensive Report
                </button>
            </div>
        </div>
    `;
}

// Assessment interaction functions
function showBergBalance() {
    document.getElementById('ptotContent').innerHTML = renderBergBalanceScale();
}

function showTUGTest() {
    document.getElementById('ptotContent').innerHTML = renderTUGTest();
}

function showHomeSafety() {
    document.getElementById('ptotContent').innerHTML = renderHomeSafetyChecklist();
}

// Berg Balance scoring
const bergScores = {};
function setBergScore(itemId, score) {
    bergScores[itemId] = score;
    
    // Update button styles
    document.querySelectorAll(`[data-item="${itemId}"]`).forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white');
    });
    document.querySelector(`[data-item="${itemId}"][data-score="${score}"]`).classList.add('bg-blue-600', 'text-white');
    
    // Calculate total
    const total = Object.values(bergScores).reduce((sum, s) => sum + s, 0);
    document.getElementById('bergTotalScore').textContent = total;
    
    // Determine fall risk
    let risk = 'Low Risk';
    if (total <= 20) risk = 'High Risk';
    else if (total <= 40) risk = 'Medium Risk';
    
    const riskElement = document.getElementById('bergFallRisk');
    riskElement.textContent = risk;
    riskElement.className = `font-semibold ${
        risk === 'High Risk' ? 'text-red-600' : 
        risk === 'Medium Risk' ? 'text-yellow-600' : 
        'text-green-600'
    }`;
}

// Home Safety scoring
const homeSafetyItems = {};
function setHomeSafety(itemId, value) {
    homeSafetyItems[itemId] = value;
    
    // Update button styles
    document.querySelectorAll(`[data-item="${itemId}"]`).forEach(btn => {
        btn.classList.remove('bg-green-100', 'bg-yellow-100', 'bg-red-100');
    });
    
    const selectedBtn = document.querySelector(`[data-item="${itemId}"][data-value="${value}"]`);
    if (value === 'adequate') selectedBtn.classList.add('bg-green-100');
    else if (value === 'needs_improvement') selectedBtn.classList.add('bg-yellow-100');
    else selectedBtn.classList.add('bg-red-100');
    
    // Update priority modifications
    updatePriorityMods();
}

function updatePriorityMods() {
    const priorities = [];
    
    if (homeSafetyItems.grabBarsToilet === 'inadequate') {
        priorities.push('<span class="text-red-600">• Critical: Install toilet grab bars ($150)</span>');
    }
    if (homeSafetyItems.nonSlipSurfaces === 'inadequate') {
        priorities.push('<span class="text-red-600">• Critical: Add non-slip surfaces ($30)</span>');
    }
    if (homeSafetyItems.stairLighting === 'inadequate') {
        priorities.push('<span class="text-orange-600">• High: Improve stair lighting ($200)</span>');
    }
    
    const modsDiv = document.getElementById('priorityMods');
    if (priorities.length > 0) {
        modsDiv.innerHTML = priorities.join('<br>');
    }
}

// Add to main app.js to integrate PT/OT dashboard
window.showPTOTDashboard = initPTOTDashboard;