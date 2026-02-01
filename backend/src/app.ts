import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
import { dashboardAuth } from './middleware/dashboardAuth';
import routes from './routes';

// Create Express app
const app = express();

// Security middleware - Allow inline scripts for dashboard
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for dashboard
}));
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Request logging (simple)
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Dashboard route (protected by auth)
app.get('/dashboard', dashboardAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Mount API routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            message: 'Route not found',
            code: 'NOT_FOUND',
        },
    });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
