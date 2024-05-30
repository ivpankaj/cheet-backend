import express from 'express';
import database from './db.js';
import cors from 'cors';
import router from './routers.js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Manually set __dirname for ES6 modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({
  origin: "http://localhost:5173",
}));

app.use("/leet", router);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server has been started on port ${port}`);
});

database();
