# Google OAuth Flow with Role Selection - Implementation Guide

## Overview
This guide documents the complete implementation of Google OAuth authentication with role-based access control, profile completion, and admin approval workflow.

---

## Backend Changes Summary

### 1. User Model Updates ([src/models/user.js](src/models/user.js))

**New Fields Added:**
- `role`: Now includes `'PENDING'` state for new users
- `verificationStatus`: Updated to `'NONE'`, `'PENDING_APPROVAL'`, `'APPROVED'`, `'REJECTED'`
- `verificationDocuments`: Array of uploaded documents with URLs and metadata
- `adminNotes`: Notes from admin during approval/rejection
- `profileCompleted`: Boolean flag to track profile completion

**Role States:**
- `PENDING`: Initial state for new Google OAuth users
- `customer`: Auto-approved, immediate access
- `tutor`: Requires document upload and admin approval
- `repair_specialist`: Requires document upload and admin approval
- `admin`: Full access

### 2. Authentication Controller Updates ([src/controllers/auth.controller.js](src/controllers/auth.controller.js))

#### a) **Google Login Endpoint** - `POST /api/auth/google-login`

**Request Body:**
```json
{
  "token": "google_id_token" // or "credential"
}
```

**Response for New User:**
```json
{
  "token": "jwt_token",
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "https://...",
    "role": "PENDING",
    "profileCompleted": false,
    "verificationStatus": "NONE",
    "isVerified": false
  },
  "isNewUser": true,
  "requiresProfileCompletion": true
}
```

**Response for Existing User:**
```json
{
  "token": "jwt_token",
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "https://...",
    "role": "customer", // or tutor, repair_specialist
    "profileCompleted": true,
    "verificationStatus": "APPROVED",
    "isVerified": true
  },
  "isNewUser": false,
  "requiresProfileCompletion": false
}
```

#### b) **Complete Profile Endpoint** - `POST /api/auth/complete-profile`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body (Customer):**
```json
{
  "role": "customer"
}
```

**Request Body (Tutor):**
```json
{
  "role": "tutor",
  "specialization": "Piano",
  "experience": 5,
  "hourlyRate": 50,
  "bio": "Professional piano teacher..."
}
```

**Request Body (Repair Specialist):**
```json
{
  "role": "repair_specialist",
  "serviceTypes": ["String Instruments", "Wind Instruments"],
  "bio": "Certified instrument repair specialist..."
}
```

**Important:** For `tutor` and `repair_specialist`, include file uploads:
- Use `multipart/form-data` encoding
- Field name: `documents` (can upload up to 3 files)
- Allowed formats: PDF, JPG, JPEG, PNG
- Max file size: 5MB per file

**Example with axios:**
```javascript
const formData = new FormData();
formData.append('role', 'tutor');
formData.append('specialization', 'Piano');
formData.append('experience', 5);
formData.append('hourlyRate', 50);
formData.append('bio', 'Professional piano teacher...');
formData.append('documents', file1);
formData.append('documents', file2);

await axios.post('/api/auth/complete-profile', formData, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'multipart/form-data'
  }
});
```

**Response (Customer):**
```json
{
  "message": "Profile completed successfully",
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "customer",
    "profileCompleted": true,
    "verificationStatus": "APPROVED",
    "isVerified": true,
    "requiresApproval": false
  }
}
```

**Response (Tutor/Repair Specialist):**
```json
{
  "message": "Profile completed successfully",
  "user": {
    "_id": "user_id",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "role": "tutor",
    "profileCompleted": true,
    "verificationStatus": "PENDING_APPROVAL",
    "isVerified": false,
    "requiresApproval": true
  }
}
```

#### c) **Get Profile Status Endpoint** - `GET /api/auth/profile-status`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "user": {
    "_id": "user_id",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "avatar": "https://...",
    "role": "tutor",
    "profileCompleted": true,
    "verificationStatus": "PENDING_APPROVAL",
    "isVerified": false,
    "specialization": "Piano",
    "experience": 5,
    "hourlyRate": 50,
    "bio": "Professional piano teacher..."
  }
}
```

### 3. Middleware Updates

#### a) **Verification Middleware** ([src/middleware/verification.middleware.js](src/middleware/verification.middleware.js))

**`requireVerification`** - Use this middleware to protect routes that require:
- Completed profile (blocks PENDING users)
- Admin approval for tutors/repair specialists

**`requireCompletedProfile`** - Use this to only check if profile is completed (not verification status)

**Error Responses:**

Profile Incomplete:
```json
{
  "message": "Profile incomplete",
  "requiresProfileCompletion": true,
  "note": "Please complete your profile before accessing this resource."
}
```

Verification Pending:
```json
{
  "message": "Verification pending",
  "verificationStatus": "PENDING_APPROVAL",
  "note": "Your account is awaiting admin approval. Please check back later."
}
```

### 4. Admin Endpoints ([src/controllers/admin.controller.js](src/controllers/admin.controller.js))

#### a) **Get Pending Users** - `GET /api/admin/pending-users`

Returns all tutors and repair specialists awaiting approval.

**Response:**
```json
{
  "count": 2,
  "users": [
    {
      "_id": "user_id",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "tutor",
      "verificationStatus": "PENDING_APPROVAL",
      "verificationDocuments": [
        {
          "fileUrl": "/uploads/documents/document-123456.pdf",
          "fileName": "certification.pdf",
          "uploadedAt": "2026-02-04T10:00:00.000Z"
        }
      ],
      "specialization": "Piano",
      "experience": 5,
      "createdAt": "2026-02-04T09:00:00.000Z"
    }
  ]
}
```

#### b) **Approve/Reject User** - `PATCH /api/admin/verify-user/:userId`

**Request Body:**
```json
{
  "status": "APPROVED", // or "REJECTED"
  "adminNotes": "Documents verified successfully" // optional
}
```

**Response:**
```json
{
  "message": "User approved successfully",
  "user": {
    "id": "user_id",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "role": "tutor",
    "verificationStatus": "APPROVED",
    "isVerified": true,
    "adminNotes": "Documents verified successfully"
  }
}
```

---

## Frontend Implementation Guide

### 1. Vue Router Configuration

```javascript
// router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue')
  },
  {
    path: '/complete-profile',
    name: 'CompleteProfile',
    component: () => import('@/views/CompleteProfile.vue'),
    meta: { requiresAuth: true, allowPending: true }
  },
  {
    path: '/pending-approval',
    name: 'PendingApproval',
    component: () => import('@/views/PendingApproval.vue'),
    meta: { requiresAuth: true, requiresPendingApproval: true }
  },
  {
    path: '/customer/dashboard',
    name: 'CustomerDashboard',
    component: () => import('@/views/customer/Dashboard.vue'),
    meta: { requiresAuth: true, role: 'customer', requiresVerification: true }
  },
  {
    path: '/tutor/dashboard',
    name: 'TutorDashboard',
    component: () => import('@/views/tutor/Dashboard.vue'),
    meta: { requiresAuth: true, role: 'tutor', requiresVerification: true }
  },
  {
    path: '/repair-specialist/dashboard',
    name: 'RepairSpecialistDashboard',
    component: () => import('@/views/repair/Dashboard.vue'),
    meta: { requiresAuth: true, role: 'repair_specialist', requiresVerification: true }
  },
  {
    path: '/admin/dashboard',
    name: 'AdminDashboard',
    component: () => import('@/views/admin/Dashboard.vue'),
    meta: { requiresAuth: true, role: 'admin' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Check if route requires authentication
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next('/login')
  }
  
  // Allow access to profile completion page for PENDING users
  if (to.meta.allowPending) {
    return next()
  }
  
  // Block PENDING users from accessing other routes
  if (authStore.isAuthenticated && authStore.user.role === 'PENDING') {
    if (to.name !== 'CompleteProfile') {
      return next('/complete-profile')
    }
  }
  
  // Check if route requires specific role
  if (to.meta.role && authStore.user.role !== to.meta.role) {
    return next('/') // Redirect to home or appropriate page
  }
  
  // Check if route requires verification
  if (to.meta.requiresVerification) {
    if (!authStore.user.isVerified || authStore.user.verificationStatus !== 'APPROVED') {
      if (authStore.user.verificationStatus === 'PENDING_APPROVAL') {
        return next('/pending-approval')
      }
      return next('/') // Or error page
    }
  }
  
  // Handle pending approval access
  if (to.meta.requiresPendingApproval) {
    if (authStore.user.verificationStatus !== 'PENDING_APPROVAL') {
      // If user is already approved, redirect to their dashboard
      return next(`/${authStore.user.role}/dashboard`)
    }
  }
  
  next()
})

export default router
```

### 2. Pinia Auth Store

```javascript
// stores/auth.js
import { defineStore } from 'pinia'
import axios from 'axios'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user')) || null
  }),
  
  getters: {
    isAuthenticated: (state) => !!state.token,
    userRole: (state) => state.user?.role,
    requiresProfileCompletion: (state) => 
      state.user?.role === 'PENDING' || !state.user?.profileCompleted,
    isPendingApproval: (state) => 
      state.user?.verificationStatus === 'PENDING_APPROVAL' && !state.user?.isVerified,
    isVerified: (state) => state.user?.isVerified
  },
  
  actions: {
    async loginWithGoogle(credential) {
      try {
        const response = await axios.post('/api/auth/google-login', {
          credential
        })
        
        this.token = response.data.token
        this.user = response.data.user
        
        // Save to localStorage
        localStorage.setItem('token', this.token)
        localStorage.setItem('user', JSON.stringify(this.user))
        
        // Set axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`
        
        return response.data
      } catch (error) {
        console.error('Login failed:', error)
        throw error
      }
    },
    
    async completeProfile(profileData) {
      try {
        const response = await axios.post('/api/auth/complete-profile', profileData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        
        // Update user data
        this.user = response.data.user
        localStorage.setItem('user', JSON.stringify(this.user))
        
        return response.data
      } catch (error) {
        console.error('Profile completion failed:', error)
        throw error
      }
    },
    
    async fetchProfileStatus() {
      try {
        const response = await axios.get('/api/auth/profile-status')
        this.user = response.data.user
        localStorage.setItem('user', JSON.stringify(this.user))
        return response.data.user
      } catch (error) {
        console.error('Failed to fetch profile status:', error)
        throw error
      }
    },
    
    logout() {
      this.token = null
      this.user = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      delete axios.defaults.headers.common['Authorization']
    }
  }
})
```

### 3. Login Component with Google OAuth

```vue
<!-- views/Login.vue -->
<template>
  <div class="login-container">
    <h1>Sign In to MelodyMart</h1>
    
    <div id="google-signin-button"></div>
    
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const error = ref('')

const handleGoogleCallback = async (response) => {
  try {
    const loginResponse = await authStore.loginWithGoogle(response.credential)
    
    // Route based on user status
    if (loginResponse.requiresProfileCompletion) {
      router.push('/complete-profile')
    } else if (loginResponse.user.verificationStatus === 'PENDING_APPROVAL') {
      router.push('/pending-approval')
    } else {
      // Redirect to role-based dashboard
      router.push(`/${loginResponse.user.role}/dashboard`)
    }
  } catch (err) {
    error.value = 'Login failed. Please try again.'
  }
}

onMounted(() => {
  // Initialize Google Sign-In
  window.google.accounts.id.initialize({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    callback: handleGoogleCallback
  })
  
  window.google.accounts.id.renderButton(
    document.getElementById('google-signin-button'),
    { theme: 'outline', size: 'large' }
  )
})
</script>
```

### 4. Complete Profile Component

```vue
<!-- views/CompleteProfile.vue -->
<template>
  <div class="complete-profile">
    <h1>Complete Your Profile</h1>
    <p>Please select your role to continue</p>
    
    <form @submit.prevent="handleSubmit">
      <!-- Role Selection -->
      <div class="role-selection">
        <label>
          <input type="radio" v-model="role" value="customer" />
          <div class="role-card">
            <h3>Customer</h3>
            <p>Browse and purchase musical instruments</p>
          </div>
        </label>
        
        <label>
          <input type="radio" v-model="role" value="tutor" />
          <div class="role-card">
            <h3>Music Tutor</h3>
            <p>Offer music lessons</p>
          </div>
        </label>
        
        <label>
          <input type="radio" v-model="role" value="repair_specialist" />
          <div class="role-card">
            <h3>Repair Specialist</h3>
            <p>Provide instrument repair services</p>
          </div>
        </label>
      </div>
      
      <!-- Customer - No additional fields -->
      
      <!-- Tutor Fields -->
      <div v-if="role === 'tutor'" class="professional-fields">
        <h3>Professional Details</h3>
        
        <div class="form-group">
          <label>Specialization</label>
          <input v-model="specialization" type="text" placeholder="e.g., Piano, Guitar" required />
        </div>
        
        <div class="form-group">
          <label>Years of Experience</label>
          <input v-model="experience" type="number" min="0" required />
        </div>
        
        <div class="form-group">
          <label>Hourly Rate ($)</label>
          <input v-model="hourlyRate" type="number" min="0" required />
        </div>
        
        <div class="form-group">
          <label>Bio</label>
          <textarea v-model="bio" rows="4" required></textarea>
        </div>
        
        <div class="form-group">
          <label>Upload Certifications/Licenses (Required)</label>
          <input type="file" @change="handleFileUpload" multiple accept=".pdf,.jpg,.jpeg,.png" required />
          <p class="help-text">Upload up to 3 files (PDF, JPG, PNG). Max 5MB each.</p>
        </div>
        
        <div v-if="documents.length" class="uploaded-files">
          <p>Files to upload: {{ documents.length }}</p>
          <ul>
            <li v-for="(doc, index) in documents" :key="index">{{ doc.name }}</li>
          </ul>
        </div>
      </div>
      
      <!-- Repair Specialist Fields -->
      <div v-if="role === 'repair_specialist'" class="professional-fields">
        <h3>Professional Details</h3>
        
        <div class="form-group">
          <label>Service Types</label>
          <div class="checkbox-group">
            <label><input type="checkbox" value="String Instruments" v-model="serviceTypes" /> String Instruments</label>
            <label><input type="checkbox" value="Wind Instruments" v-model="serviceTypes" /> Wind Instruments</label>
            <label><input type="checkbox" value="Percussion" v-model="serviceTypes" /> Percussion</label>
            <label><input type="checkbox" value="Brass" v-model="serviceTypes" /> Brass</label>
          </div>
        </div>
        
        <div class="form-group">
          <label>Bio</label>
          <textarea v-model="bio" rows="4" required></textarea>
        </div>
        
        <div class="form-group">
          <label>Upload Certifications/Licenses (Required)</label>
          <input type="file" @change="handleFileUpload" multiple accept=".pdf,.jpg,.jpeg,.png" required />
          <p class="help-text">Upload up to 3 files (PDF, JPG, PNG). Max 5MB each.</p>
        </div>
        
        <div v-if="documents.length" class="uploaded-files">
          <p>Files to upload: {{ documents.length }}</p>
          <ul>
            <li v-for="(doc, index) in documents" :key="index">{{ doc.name }}</li>
          </ul>
        </div>
      </div>
      
      <button type="submit" :disabled="loading">
        {{ loading ? 'Submitting...' : 'Complete Profile' }}
      </button>
      
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const role = ref('customer')
const specialization = ref('')
const experience = ref(0)
const hourlyRate = ref(0)
const bio = ref('')
const serviceTypes = ref([])
const documents = ref([])
const loading = ref(false)
const error = ref('')

const handleFileUpload = (event) => {
  const files = Array.from(event.target.files)
  
  if (files.length > 3) {
    error.value = 'Maximum 3 files allowed'
    return
  }
  
  // Validate file sizes
  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) {
      error.value = `File ${file.name} exceeds 5MB limit`
      return
    }
  }
  
  documents.value = files
  error.value = ''
}

const handleSubmit = async () => {
  try {
    loading.value = true
    error.value = ''
    
    const formData = new FormData()
    formData.append('role', role.value)
    
    if (role.value === 'tutor') {
      formData.append('specialization', specialization.value)
      formData.append('experience', experience.value)
      formData.append('hourlyRate', hourlyRate.value)
      formData.append('bio', bio.value)
      
      // Append documents
      documents.value.forEach(doc => {
        formData.append('documents', doc)
      })
    } else if (role.value === 'repair_specialist') {
      formData.append('serviceTypes', JSON.stringify(serviceTypes.value))
      formData.append('bio', bio.value)
      
      // Append documents
      documents.value.forEach(doc => {
        formData.append('documents', doc)
      })
    }
    
    const response = await authStore.completeProfile(formData)
    
    // Route based on role
    if (response.user.requiresApproval) {
      router.push('/pending-approval')
    } else {
      router.push(`/${response.user.role}/dashboard`)
    }
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to complete profile'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.complete-profile {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.role-selection {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 2rem 0;
}

.role-card {
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s;
}

input[type="radio"]:checked + .role-card {
  border-color: #4285f4;
  background-color: #e8f0fe;
}

.professional-fields {
  margin: 2rem 0;
  padding: 1.5rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.checkbox-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: normal;
}

.help-text {
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.5rem;
}

.uploaded-files {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #e8f0fe;
  border-radius: 4px;
}

button[type="submit"] {
  width: 100%;
  padding: 1rem;
  background-color: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.error {
  color: #d32f2f;
  margin-top: 1rem;
}
</style>
```

### 5. Pending Approval Component

```vue
<!-- views/PendingApproval.vue -->
<template>
  <div class="pending-approval">
    <div class="status-card">
      <div class="icon">⏳</div>
      <h1>Verification Pending</h1>
      <p>Your {{ userRole }} account is currently under review by our admin team.</p>
      
      <div class="info-box">
        <h3>What happens next?</h3>
        <ul>
          <li>Our team is reviewing your submitted documents</li>
          <li>You will receive an email notification once your account is approved</li>
          <li>This process typically takes 1-2 business days</li>
        </ul>
      </div>
      
      <div class="status-info">
        <p><strong>Status:</strong> {{ user.verificationStatus }}</p>
        <p><strong>Submitted:</strong> {{ formatDate(user.createdAt) }}</p>
      </div>
      
      <button @click="checkStatus" :disabled="checking">
        {{ checking ? 'Checking...' : 'Check Status' }}
      </button>
      
      <button @click="logout" class="secondary">Sign Out</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const checking = ref(false)

const user = computed(() => authStore.user)
const userRole = computed(() => {
  return user.value.role === 'tutor' ? 'Tutor' : 'Repair Specialist'
})

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const checkStatus = async () => {
  try {
    checking.value = true
    const updatedUser = await authStore.fetchProfileStatus()
    
    if (updatedUser.isVerified && updatedUser.verificationStatus === 'APPROVED') {
      // User has been approved, redirect to dashboard
      router.push(`/${updatedUser.role}/dashboard`)
    } else if (updatedUser.verificationStatus === 'REJECTED') {
      // Handle rejection
      alert('Your application was not approved. Please contact support for more information.')
    }
  } catch (error) {
    console.error('Failed to check status:', error)
  } finally {
    checking.value = false
  }
}

const logout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.pending-approval {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 2rem;
}

.status-card {
  background: white;
  border-radius: 12px;
  padding: 3rem;
  max-width: 600px;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

h1 {
  color: #333;
  margin-bottom: 1rem;
}

.info-box {
  background-color: #e8f0fe;
  border-left: 4px solid #4285f4;
  padding: 1.5rem;
  margin: 2rem 0;
  text-align: left;
}

.info-box h3 {
  margin-top: 0;
  color: #1967d2;
}

.info-box ul {
  margin: 1rem 0 0 0;
  padding-left: 1.5rem;
}

.info-box li {
  margin-bottom: 0.5rem;
}

.status-info {
  background-color: #f9f9f9;
  padding: 1rem;
  border-radius: 8px;
  margin: 1.5rem 0;
  text-align: left;
}

.status-info p {
  margin: 0.5rem 0;
}

button {
  width: 100%;
  padding: 1rem;
  margin: 0.5rem 0;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  background-color: #4285f4;
  color: white;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

button.secondary {
  background-color: #fff;
  color: #4285f4;
  border: 2px solid #4285f4;
}
</style>
```

---

## Security Best Practices Implemented

### 1. **OAuth-Only Authentication**
- Google OAuth handles user authentication
- Backend validates Google ID tokens
- No passwords stored for OAuth users

### 2. **Backend-Enforced Role Control**
- All role checks happen on the backend
- Frontend routing is for UX only, not security
- JWT contains only user ID, role is fetched from database

### 3. **Middleware Protection**
- `protect` middleware validates JWT tokens
- `requireVerification` blocks unverified users
- `requireCompletedProfile` blocks PENDING users
- `checkRole` enforces role-based access

### 4. **Document Upload Security**
- File type validation (PDF, JPG, PNG only)
- File size limits (5MB max)
- Unique filename generation
- Stored outside public web root

### 5. **Admin Approval Workflow**
- Two-step verification for professional roles
- Admin can add notes during approval/rejection
- Users cannot self-approve

### 6. **Separation of Concerns**
- Authentication (Google OAuth)
- Profile completion (role selection)
- Authorization (admin approval)
- Access control (middleware)

---

## Testing the Implementation

### 1. Test New User Flow (Customer)
1. Click "Sign in with Google"
2. Complete OAuth flow
3. Should see "Complete Profile" page
4. Select "Customer" role
5. Submit
6. Should redirect to customer dashboard immediately

### 2. Test New User Flow (Tutor)
1. Click "Sign in with Google"
2. Complete OAuth flow
3. Should see "Complete Profile" page
4. Select "Tutor" role
5. Fill in professional details
6. Upload certification documents
7. Submit
8. Should redirect to "Pending Approval" page
9. As admin, approve the user
10. User can now access tutor dashboard

### 3. Test Existing User Flow
1. Sign in with Google (existing user)
2. Should redirect directly to their role-based dashboard

### 4. Test Access Control
1. Try accessing tutor dashboard without approval → Should be blocked
2. Try accessing admin dashboard as customer → Should be blocked
3. Try accessing any protected route with PENDING role → Should redirect to complete profile

---

## Environment Variables Required

```env
# Backend (.env)
GOOGLE_CLIENT_ID=your_google_client_id
JWT_SECRET=your_jwt_secret
```

```env
# Frontend (.env)
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_API_URL=http://localhost:5000
```

---

## API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/google-login` | No | Google OAuth login |
| POST | `/api/auth/complete-profile` | Yes | Complete user profile with role |
| GET | `/api/auth/profile-status` | Yes | Get current user status |
| GET | `/api/admin/pending-users` | Admin | Get users pending approval |
| PATCH | `/api/admin/verify-user/:userId` | Admin | Approve/reject user |

---

## Additional Considerations

### 1. Email Notifications
Consider adding email notifications for:
- Profile submission confirmation
- Approval notification
- Rejection notification with feedback

### 2. Document Download for Admin
Add endpoint for admin to download submitted documents:
```javascript
// GET /api/admin/user/:userId/documents/:documentId
```

### 3. User Re-submission
If rejected, allow users to re-submit documents:
- Add "Resubmit Documents" button on pending approval page
- Update verification status back to PENDING_APPROVAL

### 4. Audit Trail
Log all admin actions:
- Who approved/rejected
- When
- Notes provided

### 5. Frontend State Management
- Store JWT in httpOnly cookies instead of localStorage for better security
- Implement token refresh mechanism
- Handle token expiration gracefully

---

## Troubleshooting

### Issue: Users stuck in PENDING state
**Solution:** Check if `completeProfile` endpoint is being called successfully. Verify documents are being uploaded correctly.

### Issue: Approved users still can't access dashboard
**Solution:** Check middleware order in routes. Ensure `requireVerification` is called after `protect`.

### Issue: File uploads failing
**Solution:** Ensure `uploads/documents/` directory exists and has write permissions. Check file size and type validations.

### Issue: Google OAuth fails
**Solution:** Verify GOOGLE_CLIENT_ID matches in both frontend and backend. Check OAuth consent screen configuration in Google Cloud Console.

---

## Migration Guide for Existing Users

If you have existing users in your database, run this migration script:

```javascript
// scripts/migrateExistingUsers.js
import mongoose from 'mongoose';
import User from '../src/models/user.js';
import dotenv from 'dotenv';

dotenv.config();

async function migrateUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Update all existing customers
    await User.updateMany(
      { role: 'customer', profileCompleted: { $exists: false } },
      { 
        $set: { 
          profileCompleted: true,
          verificationStatus: 'APPROVED',
          isVerified: true
        }
      }
    );
    
    // Update all existing tutors/repair specialists
    await User.updateMany(
      { 
        role: { $in: ['tutor', 'repair_specialist'] },
        profileCompleted: { $exists: false }
      },
      { 
        $set: { 
          profileCompleted: true,
          // Keep their existing verificationStatus
        }
      }
    );
    
    // Update old verification status values
    await User.updateMany(
      { verificationStatus: 'pending' },
      { $set: { verificationStatus: 'PENDING_APPROVAL' } }
    );
    
    await User.updateMany(
      { verificationStatus: 'approved' },
      { $set: { verificationStatus: 'APPROVED' } }
    );
    
    await User.updateMany(
      { verificationStatus: 'rejected' },
      { $set: { verificationStatus: 'REJECTED' } }
    );
    
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateUsers();
```

Run the migration:
```bash
node src/scripts/migrateExistingUsers.js
```

---

This implementation provides a secure, scalable OAuth flow with proper role-based access control and admin approval workflow!
