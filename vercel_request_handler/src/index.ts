import express from 'express';
import { downloadDriveFolder } from './googleDrive_download';
import path from 'path';
import dotenv from 'dotenv';


const app = express();
dotenv.config();
app.use((req, res, next) => {
    const host = req.hostname;
    const id = host.split('.')[0];
    const outputDir = path.join(__dirname, 'output', id);
    express.static(outputDir)(req, res, next);
})
// app.use(express.static(path.join(__dirname, 'output', id)));

app.get("/*", async (req, res, next) => {
    try {
        // Create a Google Drive API client
    
        // Extract host and id from the request
        const host = req.hostname;
        const id = host.split(".")[0];
        const filePath = req.path;
    
        // Get the folder ID associated with the project (replace with your logic)
        await downloadDriveFolder(id); // Implement logic to fetch build folder
           
        
        if (filePath === '/' || filePath === '/index.html') {
            return res.sendFile(path.join(__dirname, 'output', id, 'index.html'));
        }
        next();

      } catch (error) {
        console.error("Error fetching file:", error);
        res.status(500).send("Internal Server Error");
      }
})

app.listen(3001, () => {
    console.log("App listening on port: " + 3001);
})