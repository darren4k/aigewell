# SafeAging Platform API Documentation

## Base URL
```
Production: https://safeaging.yourdomain.com/api
Development: http://localhost:8000/api
```

## Authentication
Currently using demo authentication. Production deployment should implement proper JWT tokens with healthcare provider credentials.

## Core API Endpoints

### Health Check
```http
GET /api/health
```
**Response:**
```json
{
  "status": "healthy",
  "service": "SafeAging Home API"
}
```

### Room Analysis & Hazard Detection

#### Analyze Room Photo
```http
POST /api/analyze-room
Content-Type: multipart/form-data
```

**Parameters:**
- `image` (File): Room photograph for analysis
- `roomType` (String): Type of room (bathroom, bedroom, stairs, kitchen, living_room)  
- `userId` (String): User identifier (optional, defaults to '1')

**Response:**
```json
{
  "assessmentId": 123,
  "roomType": "bathroom",
  "hazards": [
    {
      "type": "slippery_surface",
      "location": "floor", 
      "severity": "high",
      "confidence": 0.85
    }
  ],
  "riskScore": 8,
  "recommendations": [
    {
      "hazard": "slippery_surface",
      "recommendation": "Install non-slip mats or apply anti-slip coating",
      "priority": "high"
    }
  ],
  "imageUrl": "assessments/1/1694123456789-bathroom.jpg"
}
```

### Assessment Management

#### Get User Assessments
```http
GET /api/assessments/{userId}
```

**Response:**
```json
{
  "assessments": [
    {
      "id": 1,
      "user_id": "1",
      "room_type": "bathroom",
      "image_url": "assessments/1/1694123456789-bathroom.jpg",
      "hazards_detected": "[{...}]",
      "risk_score": 8,
      "ai_analysis": "{...}",
      "status": "analyzed",
      "created_at": "2024-09-07T10:30:00Z"
    }
  ]
}
```

### Safety Plan Generation

#### Generate Safety Plan
```http
POST /api/generate-plan
Content-Type: application/json
```

**Request:**
```json
{
  "userId": "1",
  "assessmentIds": [1, 2, 3]
}
```

**Response:**
```json
{
  "plans": [
    {
      "phase": 1,
      "title": "Essential Safety Modifications",
      "tasks": [
        {
          "task": "Install grab bars in bathroom",
          "completed": false,
          "priority": "high"
        }
      ]
    }
  ]
}
```

#### Get User Safety Plans
```http
GET /api/plans/{userId}
```

#### Update Plan Progress
```http
PATCH /api/plans/{planId}/progress
Content-Type: application/json
```

**Request:**
```json
{
  "progress": 75
}
```

### Equipment Recommendations

#### Get Equipment for Plan
```http
GET /api/equipment/{planId}
```

**Response:**
```json
{
  "equipment": [
    {
      "name": "Adjustable Grab Bar Set",
      "category": "grab_bar",
      "description": "Suction-cup grab bars for bathroom safety",
      "price": 49.99,
      "link": "https://example.com/grab-bars",
      "priority": "essential"
    }
  ]
}
```

### Clinical Assessment APIs

#### PT/OT Evaluation Endpoints
```http
GET /api/ptot/templates
GET /api/ptot/evaluations/{evaluationId}
POST /api/ptot/evaluations
PUT /api/ptot/evaluations/{evaluationId}
```

#### Standardized Assessment Tools
```http
GET /api/assessments/standardized/home-fast
POST /api/assessments/standardized/home-fast/score
GET /api/assessments/standardized/berg-balance
POST /api/assessments/standardized/berg-balance/score
GET /api/assessments/standardized/tug-test
POST /api/assessments/standardized/tug-test/score
```

#### Clinical Assessment Workflow
```http
GET /api/clinical/assessments
POST /api/clinical/assessments
PUT /api/clinical/assessments/{id}
GET /api/clinical/assessments/{id}/report
```

### Appointment Management

#### Schedule PT/OT Appointment
```http
POST /api/appointments
Content-Type: application/json
```

**Request:**
```json
{
  "userId": "1",
  "assessmentId": 123,
  "scheduledAt": "2024-09-15T14:00:00Z",
  "type": "video",
  "notes": "Initial assessment for fall risk evaluation"
}
```

**Response:**
```json
{
  "appointmentId": 456,
  "success": true
}
```

### Alert System

#### Get User Alerts
```http
GET /api/alerts/{userId}
```

**Response:**
```json
{
  "alerts": [
    {
      "id": 1,
      "user_id": "1",
      "type": "appointment",
      "severity": "medium",
      "title": "PT/OT Assessment Scheduled",
      "message": "Your video assessment is scheduled for 2024-09-15T14:00:00Z",
      "is_read": false,
      "created_at": "2024-09-07T10:30:00Z"
    }
  ]
}
```

#### Mark Alert as Read
```http
PATCH /api/alerts/{alertId}/read
```

### Caregiver Management

#### Add Caregiver
```http
POST /api/caregivers
Content-Type: application/json
```

**Request:**
```json
{
  "seniorId": "1",
  "caregiverEmail": "daughter@example.com",
  "relationship": "daughter",
  "alertPreferences": {
    "highPriorityHazards": true,
    "appointments": true,
    "dailySummary": false
  }
}
```

## Clinical Assessment Scoring

### Home FAST Assessment
Fall risk assessment tool with evidence-based scoring.

**Scoring Range**: 0-25 points
**Risk Thresholds**:
- 0-3: Low risk
- 4-7: Moderate risk  
- 8+: High risk

### Berg Balance Scale
14-item balance assessment for older adults.

**Scoring Range**: 0-56 points
**Risk Thresholds**:
- ≤20: High fall risk
- 21-40: Moderate fall risk
- 41+: Low fall risk

### Timed Up and Go (TUG) Test
Mobility assessment measuring time to rise, walk, turn, and sit.

**Scoring**: Time in seconds
**Risk Thresholds**:
- <10s: Normal mobility
- 10-13.5s: Mild mobility impairment
- ≥13.5s: High fall risk

## Error Handling

All API endpoints return standardized error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional error details"
}
```

**Common HTTP Status Codes:**
- 200: Success
- 400: Bad Request (validation errors)
- 401: Unauthorized  
- 404: Not Found
- 500: Internal Server Error

## Rate Limiting

- **Assessment Analysis**: 10 requests per minute per user
- **Standard APIs**: 100 requests per minute per user
- **Clinical APIs**: 50 requests per minute per provider

## HIPAA Compliance Notes

### Protected Health Information (PHI)
- All patient data is encrypted at rest and in transit
- Access is logged with comprehensive audit trails
- Data retention follows HIPAA minimum necessary requirements

### Business Associate Agreements
- Cloudflare: HIPAA BAA in place for infrastructure
- OpenAI: Review required if using AI analysis features
- All third-party integrations evaluated for PHI handling

### Audit Logging
Every API call involving PHI is logged with:
- User identification
- Timestamp
- Action performed
- Resource accessed
- IP address (for security monitoring)

## CPT Code Integration

The platform supports Medicare billing through validated CPT codes:

- **97161**: PT evaluation, low complexity ($125)
- **97162**: PT evaluation, moderate complexity ($150)  
- **97163**: PT evaluation, high complexity ($175)
- **97542**: Home management evaluation ($90)
- **97750**: Performance tests ($45)

Total potential reimbursement per comprehensive assessment: $285

## Clinical Evidence Base

All assessment tools and scoring algorithms are based on peer-reviewed research:

- Home FAST: Validated fall risk screening tool
- Berg Balance Scale: Gold standard balance assessment
- TUG Test: Widely validated mobility assessment
- CDC STEADI: Official CDC fall prevention initiative

## Development Notes

### Database Schema
The platform uses Cloudflare D1 (SQLite) with the following key tables:
- `assessments`: Room analysis and hazard data
- `clinical_assessments`: Healthcare provider evaluations
- `safety_plans`: Phased improvement plans
- `appointments`: PT/OT scheduling
- `caregivers`: Family/caregiver relationships

### SuperClaude Integration
Healthcare-focused AI assistant commands:
```bash
npm run superclaude:audit        # HIPAA compliance audit
npm run superclaude:test         # Clinical workflow testing  
npm run superclaude:validate     # CPT code verification
npm run superclaude:security     # Security vulnerability scan
```

This API documentation covers all current endpoints and provides the foundation for healthcare provider integration and patient safety improvements.