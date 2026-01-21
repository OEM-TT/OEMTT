# OEM TechTalk Backend API Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:3000/api`  
**Environment:** Development

---

## 🔐 Authentication

All API endpoints (except `/health` and `/auth/dev-login`) require Bearer token authentication.

### Get Token

```bash
POST /api/auth/dev-login
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "session": {
    "access_token": "eyJhbGci...",
    "refresh_token": "abc123",
    "expires_in": 3600,
    "token_type": "bearer"
  }
}
```

**Usage:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:3000/api/users/me
```

---

## 📊 API Endpoints

### Health Check

#### `GET /api/health`
Check server and database health.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-01-20T03:00:00.000Z",
    "database": "connected"
  }
}
```

---

## 👤 Users

### Get Current User

#### `GET /api/users/me`
Get authenticated user's profile.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "supabaseUserId": "uuid",
    "name": "John Doe",
    "phone": "+1234567890",
    "role": "technician",
    "subscriptionTier": "free",
    "subscriptionStatus": "active",
    "createdAt": "2026-01-20T02:50:05.585Z",
    "lastActiveAt": "2026-01-20T02:50:05.759Z",
    "onboardingCompleted": true
  }
}
```

### Update Current User

#### `PATCH /api/users/me`
Update authenticated user's profile.

**Headers:** `Authorization: Bearer {token}`

**Body:**
```json
{
  "name": "John Doe",
  "phone": "+1234567890",
  "onboardingCompleted": true
}
```

**Response:** Same as GET /api/users/me

---

## 🏭 OEMs (Original Equipment Manufacturers)

### List OEMs

#### `GET /api/oems`
Get all active OEMs.

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `vertical` (optional): Filter by vertical (e.g., "HVAC", "Appliance")

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Carrier",
      "vertical": "HVAC",
      "website": "https://carrier.com",
      "logoUrl": null,
      "regionsSupported": ["US", "CA"],
      "status": "active"
    }
  ]
}
```

### Get OEM by ID

#### `GET /api/oems/:id`
Get specific OEM with product lines.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Carrier",
    "vertical": "HVAC",
    "productLines": [
      {
        "id": "uuid",
        "name": "Infinity Series",
        "category": "Heat Pump",
        "description": null
      }
    ]
  }
}
```

### Get Product Lines for OEM

#### `GET /api/oems/:id/product-lines`
Get all product lines for a specific OEM.

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `category` (optional): Filter by category

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "oemId": "uuid",
      "name": "Infinity Series",
      "category": "Heat Pump",
      "_count": {
        "models": 5
      }
    }
  ]
}
```

### Get Models for Product Line

#### `GET /api/oems/product-lines/:id/models`
Get all models for a product line.

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `discontinued` (optional): "true" or "false"

**Response:**
```json
{
  "success": true,
  "data": {
    "productLine": {
      "id": "uuid",
      "name": "Infinity Series",
      "category": "Heat Pump",
      "oem": {
        "id": "uuid",
        "name": "Carrier"
      }
    },
    "models": [
      {
        "id": "uuid",
        "modelNumber": "CA-HPX-024",
        "variants": ["CA-HPX-024-1", "CA-HPX-024-2"],
        "_count": {
          "manuals": 3
        }
      }
    ]
  }
}
```

---

## 🔧 Models

### Search Models

#### `GET /api/models/search?q={query}`
Search models by model number (case-insensitive).

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `q` (required): Search query
- `limit` (optional): Max results (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "CA",
    "count": 1,
    "models": [
      {
        "id": "uuid",
        "modelNumber": "CA-HPX-024",
        "variants": ["CA-HPX-024-1"],
        "productLine": {
          "name": "Infinity Series",
          "oem": {
            "name": "Carrier",
            "vertical": "HVAC"
          }
        },
        "_count": {
          "manuals": 3
        }
      }
    ]
  }
}
```

### Get Model by ID

#### `GET /api/models/:id`
Get specific model with full details.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "modelNumber": "CA-HPX-024",
    "variants": ["CA-HPX-024-1", "CA-HPX-024-2"],
    "productLine": {
      "name": "Infinity Series",
      "oem": {
        "name": "Carrier",
        "vertical": "HVAC"
      }
    },
    "manuals": [
      {
        "id": "uuid",
        "title": "Service Manual",
        "manualType": "service",
        "revision": "Rev 2023",
        "confidenceScore": 1.0
      }
    ],
    "_count": {
      "savedUnits": 5
    }
  }
}
```

### Get Model Manuals

#### `GET /api/models/:id/manuals`
Get all manuals for a specific model.

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `type` (optional): Filter by manual type
- `status` (optional): Filter by status (default: "active")

**Response:**
```json
{
  "success": true,
  "data": {
    "model": {
      "id": "uuid",
      "modelNumber": "CA-HPX-024",
      "productLine": "Infinity Series",
      "oem": "Carrier"
    },
    "manuals": []
  }
}
```

---

## 📚 Manuals

### Get Manual by ID

#### `GET /api/manuals/:id`
Get specific manual with details.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Service Manual",
    "manualType": "service",
    "revision": "Rev 2023",
    "publishDate": "2023-01-01",
    "confidenceScore": 1.0,
    "model": {
      "modelNumber": "CA-HPX-024",
      "productLine": {
        "name": "Infinity Series",
        "oem": {
          "name": "Carrier"
        }
      }
    },
    "_count": {
      "sections": 45
    }
  }
}
```

### Get Manual Sections

#### `GET /api/manuals/:id/sections`
Get sections for a specific manual.

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `type` (optional): Filter by section type
- `page` (optional): Filter by page number
- `limit` (optional): Max results (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "manual": {
      "id": "uuid",
      "title": "Service Manual",
      "revision": "Rev 2023",
      "modelNumber": "CA-HPX-024"
    },
    "sections": [
      {
        "id": "uuid",
        "sectionTitle": "Troubleshooting",
        "sectionType": "troubleshooting",
        "content": "...",
        "pageReference": "Pages 45-47",
        "metadata": {}
      }
    ],
    "count": 1
  }
}
```

### Search Manual Sections

#### `GET /api/manuals/search-sections?q={query}`
Search manual sections by content.

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `q` (required): Search query
- `modelId` (optional): Filter by model
- `type` (optional): Filter by section type
- `limit` (optional): Max results (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "troubleshooting",
    "count": 0,
    "sections": []
  }
}
```

---

## 📦 Saved Units

### List Saved Units

#### `GET /api/saved-units`
Get all saved units for authenticated user.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nickname": "Johnson Residence HVAC",
      "serialNumber": "1234ABC567",
      "installDate": "2023-05-15T00:00:00.000Z",
      "location": "Basement",
      "notes": "Main unit for 3-story home",
      "model": {
        "modelNumber": "CA-HPX-024",
        "productLine": {
          "name": "Infinity Series",
          "oem": {
            "name": "Carrier"
          }
        }
      }
    }
  ]
}
```

### Get Saved Unit by ID

#### `GET /api/saved-units/:id`
Get specific saved unit.

**Headers:** `Authorization: Bearer {token}`

**Response:** Same structure as list item

### Create Saved Unit

#### `POST /api/saved-units`
Create a new saved unit.

**Headers:** `Authorization: Bearer {token}`

**Body:**
```json
{
  "modelId": "uuid",
  "nickname": "Johnson Residence HVAC",
  "serialNumber": "1234ABC567",
  "installDate": "2023-05-15T00:00:00Z",
  "location": "Basement",
  "notes": "Main unit for 3-story home"
}
```

**Response:** Created saved unit (same structure as GET)

### Update Saved Unit

#### `PATCH /api/saved-units/:id`
Update an existing saved unit.

**Headers:** `Authorization: Bearer {token}`

**Body:** (all fields optional)
```json
{
  "nickname": "Johnson Residence - Updated",
  "notes": "Updated notes"
}
```

**Response:** Updated saved unit

### Delete Saved Unit

#### `DELETE /api/saved-units/:id`
Delete a saved unit.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Saved unit deleted successfully"
  }
}
```

---

## ❌ Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "details": []
  }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` (400): Invalid request data
- `UNAUTHORIZED` (401): Missing or invalid token
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `INTERNAL_ERROR` (500): Server error

---

## 🧪 Testing

Use the provided `test-api.sh` script:

```bash
cd backend
chmod +x test-api.sh

# Get a token first
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/dev-login \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com"}' | jq -r '.session.access_token')

# Test endpoints
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/users/me
```

---

## 📝 Notes

- All timestamps are in ISO 8601 format (UTC)
- All IDs are UUIDs
- Session tokens expire after 1 hour (3600 seconds)
- **Dev Mode Login** (`/api/auth/dev-login`) is only available in development
- All endpoints support CORS
- Database queries are logged in development mode

---

**Last Updated:** January 20, 2026
