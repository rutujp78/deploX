import path from 'path';
import fs from 'fs';

export const createEnvFile = async (env: string[], pathOfDir: string) => {
    const envContent = env.map((line: string) => line.split(' ').join('=')).join('\n');
    const envFilePath = path.join(pathOfDir, '.env');
    fs.writeFile(envFilePath, envContent, (err) => {
        if(err) {
            console.error("Error creating .env file: ", err);
        }
        else {
            console.log(".env file created successfully");
        }
    });
}