import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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

// Get all public shaders
app.get('/api/shaders', async (req, res) => {
    try {
        const shaders = await prisma.shader.findMany({
            where: {
                isPublic: true
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(shaders);
    } catch (error) {
        console.error('Error fetching shaders:', error);
        res.status(500).json({ error: 'Failed to fetch shaders' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});