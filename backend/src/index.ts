import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import shaderRoutes from './routes/shaders';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Mount auth routes
app.use('/api/auth', authRoutes);

// Mount shader routes
app.use('/api/shaders', shaderRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

// Database connection test endpoint
app.get('/db-test', async (req, res) => {
    try {
        await prisma.$connect();
        res.json({ database: 'Connected successfully!' });
    } catch (error) {
        res.status(500).json({ error: 'Database connection failed', details: error });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});