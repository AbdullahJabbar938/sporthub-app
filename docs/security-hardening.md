# SportHub Security Hardening Guide

## 1. Authentication & Authorization

### Password Requirements
- Minimum 8 characters
- Must contain uppercase, lowercase, and numbers
- Hashed with bcrypt (12 rounds)

### JWT Implementation
```javascript
// Access Token: 15 minutes expiration
// Refresh Token: 7 days expiration
const accessToken = jwt.sign(
  { id: user._id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);