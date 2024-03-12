import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
    github: { type: String, required: true },
    projectId: { type: String, required: true },
    folderId: { type: String },
    buildFolderId: { type: String },
}, { timestamps: true });

export default mongoose.model("PROJECT", projectSchema);