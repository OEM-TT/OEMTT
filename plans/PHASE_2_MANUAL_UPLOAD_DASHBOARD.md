# Phase 2: Manual Upload Dashboard
## Date: February 17, 2026
## Goal: Create web interface for manual upload, categorization, and processing

---

## 🎯 OBJECTIVES

1. ✅ Create dashboard page on backend (Express server)
2. ✅ Allow user to select: OEM → Category → Sub-Category → Product Line → Model
3. ✅ Drag-and-drop PDF upload
4. ✅ Automatic processing: Extract → Chunk → Embed → Store
5. ✅ Real-time progress feedback
6. ✅ Error handling and validation
7. ✅ Manual metadata editing (title, revision, type)

---

## 📐 ARCHITECTURE

### Tech Stack
- **Backend**: Express.js (existing)
- **Frontend**: React (single-page dashboard)
- **File Upload**: Multer (multipart/form-data)
- **PDF Processing**: pdf-parse (existing)
- **Chunking**: LangChain (existing)
- **Embeddings**: OpenAI API (existing)
- **Storage**: Supabase Storage (existing)
- **Database**: PostgreSQL via Supabase (existing)
- **Vector DB**: Pinecone (existing)

### File Structure
```
backend/
├── src/
│   ├── controllers/
│   │   └── dashboard.controller.ts (NEW)
│   ├── routes/
│   │   └── dashboard.routes.ts (NEW)
│   ├── services/
│   │   ├── ingestion/
│   │   │   ├── manualProcessor.ts (EXISTING - enhance)
│   │   │   ├── manualUpload.ts (NEW)
│   │   │   └── progressTracker.ts (NEW)
│   ├── public/
│   │   └── dashboard/
│   │       ├── index.html (NEW)
│   │       ├── app.js (NEW)
│   │       └── styles.css (NEW)
```

---

## 🎨 UI/UX DESIGN

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│  OEM Tech Talk - Manual Upload Dashboard                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Step 1: Select Equipment                                   │
├─────────────────────────────────────────────────────────────┤
│  OEM:            [▼ Carrier         ]                       │
│  Category:       [▼ Rooftop Units   ]                       │
│  Sub-Category:   [▼ Standard RTUs   ]                       │
│  Product Line:   [▼ 48A Series      ]                       │
│  Model:          [▼ 48A             ] or [+ Create New]     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Step 2: Upload Manual(s)                                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                       │   │
│  │         Drag & Drop PDF Files Here                   │   │
│  │              or click to browse                      │   │
│  │                                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Manual Type:    [▼ Service Manual  ]                      │
│  Title:          [Auto-detected from PDF]                  │
│  Revision:       [Optional]                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Step 3: Process & Upload                                   │
├─────────────────────────────────────────────────────────────┤
│  [        Process Manual        ]                           │
│                                                             │
│  Status: Extracting text... (23%)                           │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                  │
│                                                             │
│  ✓ PDF uploaded to storage                                 │
│  ✓ Text extracted (234 pages)                              │
│  ⏳ Chunking text...                                        │
│  ⏸ Generating embeddings...                                │
│  ⏸ Storing in vector database...                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Recent Uploads                                             │
├─────────────────────────────────────────────────────────────┤
│  ✓ Carrier 48A - Service Manual - 2 mins ago               │
│  ✓ Carrier 48FC - Installation Guide - 5 mins ago          │
│  ✗ Trane RTAC - Service Manual - Failed (retry)            │
└─────────────────────────────────────────────────────────────┘
```

### Features
1. **Cascading Dropdowns**: Category selection updates sub-category options
2. **Model Creation**: If model doesn't exist, create on-the-fly
3. **Drag-and-Drop**: Modern file upload interface
4. **Real-time Progress**: WebSocket or SSE for live updates
5. **Validation**: Check file type, size, duplicate hash
6. **Error Recovery**: Retry failed uploads, rollback on error
7. **Batch Upload**: Upload multiple PDFs for same model

---

## 🔌 API ENDPOINTS

### GET `/dashboard`
- Serves dashboard HTML page
- Authentication: Admin only

### GET `/api/dashboard/taxonomy`
- Returns full equipment taxonomy
- Response:
  ```json
  {
    "oems": [
      {
        "id": "uuid",
        "name": "Carrier",
        "categories": [
          {
            "id": "uuid",
            "name": "Rooftop Units",
            "slug": "rtus",
            "subCategories": [
              {
                "id": "uuid",
                "name": "Standard RTUs",
                "slug": "standard-rtus",
                "productLines": [
                  {
                    "id": "uuid",
                    "name": "48A Series",
                    "models": [
                      {"id": "uuid", "modelNumber": "48A"}
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
  ```

### POST `/api/dashboard/models`
- Creates new model if doesn't exist
- Body:
  ```json
  {
    "productLineId": "uuid",
    "modelNumber": "48A",
    "variants": [],
    "specifications": {}
  }
  ```

### POST `/api/dashboard/upload`
- Upload PDF and process
- Multipart form-data:
  - `file`: PDF file
  - `modelId`: Model UUID
  - `manualType`: "service" | "installation" | "controls" | "parts" | "other"
  - `title`: Optional title
  - `revision`: Optional revision
- Response:
  ```json
  {
    "success": true,
    "manualId": "uuid",
    "progress": {
      "stage": "extracting",
      "percent": 0
    }
  }
  ```

### GET `/api/dashboard/progress/:manualId`
- Server-Sent Events (SSE) for progress updates
- Events:
  ```javascript
  event: progress
  data: {"stage": "uploading", "percent": 25, "message": "Uploading PDF..."}

  event: progress
  data: {"stage": "extracting", "percent": 50, "message": "Extracting text (page 45/234)"}

  event: progress
  data: {"stage": "chunking", "percent": 75, "message": "Creating chunks (123 chunks)"}

  event: progress
  data: {"stage": "embedding", "percent": 90, "message": "Generating embeddings (batch 2/5)"}

  event: complete
  data: {"manualId": "uuid", "sections": 342, "cost": 0.23}

  event: error
  data: {"error": "Failed to extract text", "stage": "extracting"}
  ```

### GET `/api/dashboard/recent`
- Returns recent uploads
- Response:
  ```json
  {
    "uploads": [
      {
        "id": "uuid",
        "modelNumber": "48A",
        "oem": "Carrier",
        "title": "Service Manual",
        "status": "completed",
        "uploadedAt": "2026-02-17T10:30:00Z",
        "sections": 342
      }
    ]
  }
  ```

---

## 💻 IMPLEMENTATION

### 1. Dashboard Controller (`dashboard.controller.ts`)

```typescript
import { Request, Response } from 'express';
import { prisma } from '../config/database';

// GET /api/dashboard/taxonomy
export async function getTaxonomy(req: Request, res: Response) {
  try {
    const oems = await prisma.oem.findMany({
      include: {
        equipmentCategories: {
          include: {
            subCategories: {
              include: {
                productLines: {
                  include: {
                    models: {
                      select: {
                        id: true,
                        modelNumber: true,
                        discontinued: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ oems });
  } catch (error) {
    console.error('Error fetching taxonomy:', error);
    res.status(500).json({ error: 'Failed to fetch taxonomy' });
  }
}

// POST /api/dashboard/models
export async function createModel(req: Request, res: Response) {
  const { productLineId, modelNumber, variants, specifications } = req.body;

  try {
    // Check if model already exists
    const existing = await prisma.model.findFirst({
      where: {
        productLineId,
        modelNumber
      }
    });

    if (existing) {
      return res.status(409).json({ 
        error: 'Model already exists', 
        modelId: existing.id 
      });
    }

    // Create new model
    const model = await prisma.model.create({
      data: {
        productLineId,
        modelNumber,
        variants: variants || [],
        specifications: specifications || {},
        discontinued: false
      }
    });

    res.json({ success: true, model });
  } catch (error) {
    console.error('Error creating model:', error);
    res.status(500).json({ error: 'Failed to create model' });
  }
}

// GET /api/dashboard/recent
export async function getRecentUploads(req: Request, res: Response) {
  try {
    const uploads = await prisma.manual.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        model: {
          include: {
            productLine: {
              include: {
                oem: true
              }
            }
          }
        }
      }
    });

    const formatted = uploads.map(u => ({
      id: u.id,
      modelNumber: u.model.modelNumber,
      oem: u.model.productLine.oem.name,
      title: u.title,
      status: u.status,
      uploadedAt: u.createdAt,
      sections: u._count?.sections || 0
    }));

    res.json({ uploads: formatted });
  } catch (error) {
    console.error('Error fetching recent uploads:', error);
    res.status(500).json({ error: 'Failed to fetch recent uploads' });
  }
}
```

### 2. Manual Upload Service (`manualUpload.ts`)

```typescript
import { EventEmitter } from 'events';
import { processManualPDF } from './manualProcessor';
import { uploadToSupabase } from '../storage/supabase';
import { storeEmbeddings } from '../vectordb/pinecone';

export class ManualUploadService extends EventEmitter {
  async processManual(
    filePath: string,
    modelId: string,
    manualType: string,
    title?: string,
    revision?: string
  ) {
    try {
      // Stage 1: Upload PDF to storage
      this.emit('progress', {
        stage: 'uploading',
        percent: 10,
        message: 'Uploading PDF to storage...'
      });

      const storagePath = await uploadToSupabase(filePath, modelId);

      // Stage 2: Extract text from PDF
      this.emit('progress', {
        stage: 'extracting',
        percent: 30,
        message: 'Extracting text from PDF...'
      });

      const extracted = await processManualPDF(filePath);

      // Stage 3: Create manual record
      const manual = await prisma.manual.create({
        data: {
          modelId,
          manualType,
          title: title || extracted.title,
          revision,
          storagePath,
          fileHash: extracted.hash,
          pageCount: extracted.pageCount,
          language: 'en',
          confidenceScore: 1.0,
          status: 'processing',
          sourceType: 'manual_upload'
        }
      });

      // Stage 4: Chunk text
      this.emit('progress', {
        stage: 'chunking',
        percent: 50,
        message: `Chunking text (${extracted.pageCount} pages)...`
      });

      const chunks = await chunkText(extracted.text);

      // Stage 5: Generate embeddings in batches
      const batchSize = 100;
      const totalBatches = Math.ceil(chunks.length / batchSize);
      
      for (let i = 0; i < totalBatches; i++) {
        const batch = chunks.slice(i * batchSize, (i + 1) * batchSize);
        
        this.emit('progress', {
          stage: 'embedding',
          percent: 50 + (i / totalBatches) * 35,
          message: `Generating embeddings (batch ${i + 1}/${totalBatches})...`
        });

        const embeddings = await generateEmbeddings(batch);

        // Store in database and Pinecone
        await Promise.all([
          storeInDatabase(manual.id, batch, embeddings),
          storeEmbeddings(manual.id, batch, embeddings)
        ]);
      }

      // Stage 6: Finalize
      await prisma.manual.update({
        where: { id: manual.id },
        data: { status: 'active' }
      });

      this.emit('complete', {
        manualId: manual.id,
        sections: chunks.length,
        cost: estimateCost(chunks.length)
      });

      return { success: true, manualId: manual.id };

    } catch (error) {
      this.emit('error', {
        error: error.message,
        stage: 'processing'
      });
      throw error;
    }
  }
}
```

### 3. Upload Controller with SSE

```typescript
import multer from 'multer';
import { ManualUploadService } from '../services/ingestion/manualUpload';

// Configure multer for file uploads
const upload = multer({
  dest: '/tmp/uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files allowed'));
    }
  }
});

// POST /api/dashboard/upload
export const uploadManual = [
  upload.single('file'),
  async (req: Request, res: Response) => {
    const { modelId, manualType, title, revision } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      // Create manual upload service
      const service = new ManualUploadService();
      const manualId = generateId();

      // Store service instance for progress tracking
      activeUploads.set(manualId, service);

      // Start processing (async)
      service.processManual(
        file.path,
        modelId,
        manualType,
        title,
        revision
      ).catch(error => {
        console.error('Upload failed:', error);
        activeUploads.delete(manualId);
      });

      // Return immediately with manual ID
      res.json({
        success: true,
        manualId,
        message: 'Processing started'
      });

    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  }
];

// GET /api/dashboard/progress/:manualId
export async function streamProgress(req: Request, res: Response) {
  const { manualId } = req.params;

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const service = activeUploads.get(manualId);
  if (!service) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: 'Upload not found' })}\n\n`);
    res.end();
    return;
  }

  // Listen to events
  const onProgress = (data: any) => {
    res.write(`event: progress\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onComplete = (data: any) => {
    res.write(`event: complete\ndata: ${JSON.stringify(data)}\n\n`);
    cleanup();
  };

  const onError = (data: any) => {
    res.write(`event: error\ndata: ${JSON.stringify(data)}\n\n`);
    cleanup();
  };

  const cleanup = () => {
    service.removeListener('progress', onProgress);
    service.removeListener('complete', onComplete);
    service.removeListener('error', onError);
    activeUploads.delete(manualId);
    res.end();
  };

  service.on('progress', onProgress);
  service.on('complete', onComplete);
  service.on('error', onError);

  // Cleanup on client disconnect
  req.on('close', cleanup);
}
```

### 4. Frontend Dashboard (`public/dashboard/index.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OEM Tech Talk - Manual Upload Dashboard</title>
  <link rel="stylesheet" href="/dashboard/styles.css">
</head>
<body>
  <div class="container">
    <h1>OEM Tech Talk - Manual Upload Dashboard</h1>

    <!-- Step 1: Select Equipment -->
    <section class="card">
      <h2>Step 1: Select Equipment</h2>
      <div class="form-group">
        <label for="oem">OEM:</label>
        <select id="oem" onchange="loadCategories()">
          <option value="">Select OEM...</option>
        </select>
      </div>
      <div class="form-group">
        <label for="category">Category:</label>
        <select id="category" onchange="loadSubCategories()" disabled>
          <option value="">Select Category...</option>
        </select>
      </div>
      <div class="form-group">
        <label for="subCategory">Sub-Category:</label>
        <select id="subCategory" onchange="loadProductLines()" disabled>
          <option value="">Select Sub-Category...</option>
        </select>
      </div>
      <div class="form-group">
        <label for="productLine">Product Line:</label>
        <select id="productLine" onchange="loadModels()" disabled>
          <option value="">Select Product Line...</option>
        </select>
      </div>
      <div class="form-group">
        <label for="model">Model:</label>
        <select id="model" disabled>
          <option value="">Select Model...</option>
        </select>
        <button id="createModel" onclick="showCreateModelModal()">+ Create New</button>
      </div>
    </section>

    <!-- Step 2: Upload Manual -->
    <section class="card">
      <h2>Step 2: Upload Manual</h2>
      <div 
        id="dropZone" 
        class="drop-zone"
        ondrop="handleDrop(event)"
        ondragover="handleDragOver(event)"
        ondragleave="handleDragLeave(event)"
      >
        <p>Drag & Drop PDF Files Here</p>
        <p>or</p>
        <button onclick="document.getElementById('fileInput').click()">Browse Files</button>
        <input type="file" id="fileInput" accept=".pdf" multiple onchange="handleFiles(event)" style="display:none">
      </div>

      <div id="fileList" class="file-list"></div>

      <div class="form-group">
        <label for="manualType">Manual Type:</label>
        <select id="manualType">
          <option value="service">Service Manual</option>
          <option value="installation">Installation Manual</option>
          <option value="controls">Controls Manual</option>
          <option value="parts">Parts List</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div class="form-group">
        <label for="title">Title (optional):</label>
        <input type="text" id="title" placeholder="Auto-detected from PDF">
      </div>
      <div class="form-group">
        <label for="revision">Revision (optional):</label>
        <input type="text" id="revision" placeholder="e.g., Rev A">
      </div>
    </section>

    <!-- Step 3: Process -->
    <section class="card">
      <h2>Step 3: Process & Upload</h2>
      <button id="processBtn" onclick="processManuals()" disabled>Process Manual(s)</button>
      <div id="progressContainer" style="display:none">
        <div id="progressStatus"></div>
        <div class="progress-bar">
          <div id="progressFill" class="progress-fill"></div>
        </div>
        <ul id="progressSteps"></ul>
      </div>
    </section>

    <!-- Recent Uploads -->
    <section class="card">
      <h2>Recent Uploads</h2>
      <div id="recentUploads"></div>
    </section>
  </div>

  <script src="/dashboard/app.js"></script>
</body>
</html>
```

### 5. Frontend JavaScript (`public/dashboard/app.js`)

```javascript
let taxonomy = null;
let selectedFiles = [];

// Load taxonomy on page load
async function loadTaxonomy() {
  const res = await fetch('/api/dashboard/taxonomy');
  taxonomy = await res.json();
  
  const oemSelect = document.getElementById('oem');
  taxonomy.oems.forEach(oem => {
    const option = document.createElement('option');
    option.value = oem.id;
    option.textContent = oem.name;
    oemSelect.appendChild(option);
  });
}

function loadCategories() {
  const oemId = document.getElementById('oem').value;
  const oem = taxonomy.oems.find(o => o.id === oemId);
  
  const categorySelect = document.getElementById('category');
  categorySelect.innerHTML = '<option value="">Select Category...</option>';
  categorySelect.disabled = false;
  
  oem.categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat.id;
    option.textContent = cat.name;
    categorySelect.appendChild(option);
  });
}

// Similar functions for loadSubCategories(), loadProductLines(), loadModels()...

function handleFiles(event) {
  const files = Array.from(event.target.files);
  selectedFiles.push(...files);
  updateFileList();
  enableProcessButton();
}

function handleDrop(event) {
  event.preventDefault();
  const files = Array.from(event.dataTransfer.files).filter(f => f.type === 'application/pdf');
  selectedFiles.push(...files);
  updateFileList();
  enableProcessButton();
}

function updateFileList() {
  const fileList = document.getElementById('fileList');
  fileList.innerHTML = selectedFiles.map((f, i) => `
    <div class="file-item">
      <span>${f.name}</span>
      <button onclick="removeFile(${i})">✕</button>
    </div>
  `).join('');
}

async function processManuals() {
  const modelId = document.getElementById('model').value;
  const manualType = document.getElementById('manualType').value;
  const title = document.getElementById('title').value;
  const revision = document.getElementById('revision').value;

  for (const file of selectedFiles) {
    await uploadManual(file, modelId, manualType, title, revision);
  }
}

async function uploadManual(file, modelId, manualType, title, revision) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('modelId', modelId);
  formData.append('manualType', manualType);
  if (title) formData.append('title', title);
  if (revision) formData.append('revision', revision);

  // Upload and get manual ID
  const res = await fetch('/api/dashboard/upload', {
    method: 'POST',
    body: formData
  });
  const data = await res.json();

  if (data.success) {
    // Connect to SSE for progress
    const eventSource = new EventSource(`/api/dashboard/progress/${data.manualId}`);
    
    eventSource.addEventListener('progress', (e) => {
      const progress = JSON.parse(e.data);
      updateProgress(progress);
    });

    eventSource.addEventListener('complete', (e) => {
      const result = JSON.parse(e.data);
      showSuccess(result);
      eventSource.close();
    });

    eventSource.addEventListener('error', (e) => {
      const error = JSON.parse(e.data);
      showError(error);
      eventSource.close();
    });
  }
}

function updateProgress(progress) {
  document.getElementById('progressContainer').style.display = 'block';
  document.getElementById('progressStatus').textContent = progress.message;
  document.getElementById('progressFill').style.width = `${progress.percent}%`;
}

// Initialize
loadTaxonomy();
```

---

## ✅ SUCCESS CRITERIA

- ✅ Dashboard accessible at `/dashboard`
- ✅ Cascading dropdowns work correctly
- ✅ Drag-and-drop upload functional
- ✅ Real-time progress updates via SSE
- ✅ PDF processing (extract, chunk, embed, store) works
- ✅ Error handling and validation
- ✅ Manual metadata correctly saved
- ✅ Vector search finds newly added content
- ✅ Chat can answer questions from new manuals

---

## 🚀 ROLLOUT PLAN

1. Complete Phase 1 (database restructure)
2. Build dashboard backend (controllers, services)
3. Build dashboard frontend (HTML, CSS, JS)
4. Test with single manual upload
5. Validate end-to-end flow
6. Use dashboard to ingest all OEMTT_MANUALS
7. Monitor and fix issues

---

**Estimated Development Time**: 1-2 days  
**Estimated Upload Time (all manuals)**: 4-6 hours using dashboard
