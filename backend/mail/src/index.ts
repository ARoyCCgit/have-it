import express from 'express';
import dotenv from 'dotenv';
import { startSendOtpConsumer } from './consumer.js';

dotenv.config();

startSendOtpConsumer();

const app = express();

app.get('/', (req, res) => {
    res.status(200).json({ status: "ok", service: "haveit-mail-service" });
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: "ok", service: "haveit-mail-service" });
});

const port = process.env.PORT || 5001;
app.listen(port, () => {
    console.log(`Mail Service is running on port: ${port}`);    
});