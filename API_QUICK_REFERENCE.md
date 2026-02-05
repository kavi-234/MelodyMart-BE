# Google OAuth Role Selection - Quick Reference

## 🚀 Quick Start

### 1. Run Database Migration (for existing users)
```bash
npm run migrate-users
```

### 2. Start the Server
```bash
npm run dev
```

---

## 📡 API Endpoints

### Authentication

#### 1. Google Login
```http
POST /api/auth/google-login
Content-Type: application/json

{
  "credential": "google_id_token"
}
```

**Response (New User):**
```json
{
  "token": "jwt_token",
  "user": {
    "role": "PENDING",
    "profileCompleted": false
  },
  "isNewUser": true,
  "requiresProfileCompletion": true
}
```

**Response (Existing User):**
```json
{
  "token": "jwt_token",
  "user": {
    "role": "customer",
    "profileCompleted": true,
    "isVerified": true
  },
  "isNewUser": false,
  "requiresProfileCompletion": false
}
```

---

#### 2. Complete Profile
```http
POST /api/auth/complete-profile
Authorization: Bearer <token>
Content-Type: multipart/form-data

# For Customer
role=customer

# For Tutor
role=tutor
specialization=Piano
experience=5
hourlyRate=50
bio=Professional piano teacher...
documents=<file1>
documents=<file2>

# For Repair Specialist
role=repair_specialist
serviceTypes=["String Instruments", "Wind Instruments"]
bio=Certified repair specialist...
documents=<file1>
documents=<file2>
```

**Response:**
```json
{
  "message": "Profile completed successfully",
  "user": {
    "role": "tutor",
    "verificationStatus": "PENDING_APPROVAL",
    "requiresApproval": true
  }
}
```

---

#### 3. Get Profile Status
```http
GET /api/auth/profile-status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "role": "tutor",
    "profileCompleted": true,
    "verificationStatus": "PENDING_APPROVAL",
    "isVerified": false
  }
}
```

---

### Admin Endpoints

#### 4. Get Pending Users
```http
GET /api/admin/pending-users
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "count": 2,
  "users": [
    {
      "_id": "user_id",
      "name": "Jane Smith",
      "role": "tutor",
      "verificationStatus": "PENDING_APPROVAL",
      "verificationDocuments": [
        {
          "fileUrl": "/uploads/documents/document-123.pdf",
          "fileName": "certification.pdf"
        }
      ]
    }
  ]
}
```

---

#### 5. Approve/Reject User
```http
PATCH /api/admin/verify-user/:userId
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "APPROVED",  // or "REJECTED"
  "adminNotes": "Documents verified"
}
```

**Response:**
```json
{
  "message": "User approved successfully",
  "user": {
    "role": "tutor",
    "verificationStatus": "APPROVED",
    "isVerified": true
  }
}
```

---

## 🔐 User Role States

| Role | Initial State | After Profile Completion | Access Level |
|------|---------------|-------------------------|--------------|
| PENDING | Auto-assigned | N/A | No dashboard access |
| customer | After role selection | Auto-approved | Immediate dashboard access |
| tutor | After role selection | PENDING_APPROVAL | Blocked until admin approval |
| repair_specialist | After role selection | PENDING_APPROVAL | Blocked until admin approval |
| admin | Manually created | APPROVED | Full access |

---

## 🔒 Verification Status Flow

```
NEW USER
  ↓
PENDING (role selection required)
  ↓
┌─────────────┬──────────────┬──────────────────────┐
│   CUSTOMER  │    TUTOR     │  REPAIR_SPECIALIST   │
│   ↓         │    ↓         │    ↓                 │
│ APPROVED    │ PENDING_     │ PENDING_APPROVAL     │
│ (instant)   │ APPROVAL     │                      │
│   ↓         │    ↓         │    ↓                 │
│ Dashboard   │ Waiting      │ Waiting Page         │
│ Access      │ Page         │                      │
│             │    ↓         │    ↓                 │
│             │ Admin Review │ Admin Review         │
│             │    ↓         │    ↓                 │
│             │ APPROVED/    │ APPROVED/REJECTED    │
│             │ REJECTED     │                      │
│             │    ↓         │    ↓                 │
│             │ Dashboard    │ Dashboard Access     │
│             │ Access       │                      │
└─────────────┴──────────────┴──────────────────────┘
```

---

## 🛡️ Middleware Usage

### Protect Routes (JWT Validation)
```javascript
import { protect } from '../middleware/auth.middleware.js';

router.get('/protected-route', protect, controller);
```

### Require Completed Profile
```javascript
import { requireCompletedProfile } from '../middleware/verification.middleware.js';

// Blocks PENDING users
router.get('/dashboard', protect, requireCompletedProfile, controller);
```

### Require Verification (Profile + Admin Approval)
```javascript
import { requireVerification } from '../middleware/verification.middleware.js';

// Blocks PENDING users AND unverified tutors/repair specialists
router.get('/tutor/dashboard', protect, requireVerification, controller);
```

### Require Specific Role
```javascript
import { checkRole } from '../middleware/role.middleware.js';

router.get('/admin/panel', protect, checkRole('admin'), controller);
router.get('/tutor/lessons', protect, checkRole('tutor'), controller);
```

---

## 🎯 Frontend Routing Logic

```javascript
// After Google Login Response
if (response.requiresProfileCompletion) {
  // New user → Complete Profile page
  router.push('/complete-profile');
} 
else if (response.user.verificationStatus === 'PENDING_APPROVAL') {
  // Waiting for admin → Pending Approval page
  router.push('/pending-approval');
} 
else {
  // Approved user → Role-based dashboard
  router.push(`/${response.user.role}/dashboard`);
}
```

---

## 📁 File Upload Configuration

**Multer Settings:**
- Location: `uploads/documents/`
- Max files: 3
- Max size: 5MB per file
- Allowed types: PDF, JPG, JPEG, PNG

**Filename Format:**
```
document-[timestamp]-[random].ext
Example: document-1738659600000-123456789.pdf
```

---

## 🧪 Testing Checklist

### New User (Customer)
- [ ] Google OAuth login
- [ ] Redirected to complete-profile
- [ ] Select "customer" role
- [ ] Immediately redirected to customer dashboard
- [ ] No document upload required

### New User (Tutor)
- [ ] Google OAuth login
- [ ] Redirected to complete-profile
- [ ] Select "tutor" role
- [ ] Fill professional details
- [ ] Upload 1-3 documents
- [ ] Redirected to pending-approval page
- [ ] Cannot access tutor dashboard (blocked)

### New User (Repair Specialist)
- [ ] Google OAuth login
- [ ] Redirected to complete-profile
- [ ] Select "repair_specialist" role
- [ ] Fill professional details
- [ ] Upload 1-3 documents
- [ ] Redirected to pending-approval page
- [ ] Cannot access repair specialist dashboard (blocked)

### Admin Approval Flow
- [ ] Admin sees pending users list
- [ ] Admin can view uploaded documents
- [ ] Admin approves user
- [ ] User receives updated status
- [ ] User can now access role-based dashboard

### Existing User
- [ ] Google OAuth login
- [ ] Directly redirected to role-based dashboard
- [ ] No profile completion required

---

## 🔍 Debugging Tips

### Check User State
```bash
# MongoDB query
db.users.find({ email: "user@example.com" })
```

### Verify JWT Token
Use [jwt.io](https://jwt.io) to decode the token

### Check Middleware Execution
Add console.logs in middleware files

### Test File Upload
```bash
curl -X POST http://localhost:5000/api/auth/complete-profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "role=tutor" \
  -F "specialization=Piano" \
  -F "documents=@/path/to/file.pdf"
```

---

## 📝 Common Error Responses

### 400 Bad Request
```json
{
  "message": "Invalid role. Must be customer, tutor, or repair_specialist"
}
```

### 401 Unauthorized
```json
{
  "message": "No token" // or "Invalid token"
}
```

### 403 Forbidden (Profile Incomplete)
```json
{
  "message": "Profile incomplete",
  "requiresProfileCompletion": true
}
```

### 403 Forbidden (Verification Pending)
```json
{
  "message": "Verification pending",
  "verificationStatus": "PENDING_APPROVAL",
  "note": "Your account is awaiting admin approval"
}
```

---

## 🚨 Migration Notes

**Before deploying to production:**

1. Backup your database
2. Run migration script: `npm run migrate-users`
3. Verify migration results
4. Test with existing user accounts
5. Monitor for any issues

**Migration affects:**
- All existing users get `profileCompleted: true`
- Customers get auto-approved status
- Old verification status values updated to new format
- Document URLs migrated to new structure

---

## 📞 Support

For issues or questions:
1. Check the detailed implementation guide: `OAUTH_IMPLEMENTATION_GUIDE.md`
2. Review middleware and controller files
3. Check MongoDB user documents
4. Verify environment variables
