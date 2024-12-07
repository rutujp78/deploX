import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import httpProxy from 'http-proxy';

const app = express();
dotenv.config();
const proxy = httpProxy.createProxy();
const BASE_PATH = process.env.S3_ENDPOINT;

app.use(cors());
app.use((req, res) => {
    const host = req.hostname;
    const id = host.split('.')[0];
    const resolvesTo = `${BASE_PATH}/${id}`
    return proxy.web(req, res, { target: resolvesTo, changeOrigin: true });
});

proxy.on('proxyReq', (proxyReq, req, res) => {
    const url = req.url;
    if(url === '/') proxyReq.path += 'index.html';
    console.log(proxyReq.path);
});

app.listen(3001, async () => {
    console.log("App listening on port: " + 3001);
});