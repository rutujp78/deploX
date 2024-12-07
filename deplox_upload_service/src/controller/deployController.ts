import project from "../db_models/project";
import { generate } from "../utils/generate"
import { getRepoSize } from "../utils/getRepoSize";
import { redisPublisher } from "../utils/initRedis";
import { Request, Response } from "express";

export const deploy = async (req: Request, res: Response) => {
    const id: string = generate();
    const env = req.body.env;
    const repoUrl: string = req.body.repoUrl;

    try {
        const sizeInMegabytes = await getRepoSize(repoUrl);

        if (sizeInMegabytes > 10) {
            return res.status(400).json({ msg: 'Repository size exceeds 10 MB.' });
        }

        // add project to deploy queue
        const newProject = await project.create({
            github: repoUrl,
            projectId: id,
            status: 'Deploying'
        });
    
        const data = { id: id, env: [...env] };
        const jsonString = JSON.stringify(data);
    
        await redisPublisher.lpush("build-queue", jsonString);
        
        // return the repsonse after adding to deploy queue
        return res.status(200).json({id: id});

    } catch (error: any) {
        console.log(error);
        return res.status(500).json({ msg: error.message || "Unable to deploy the project." });   
    }
};