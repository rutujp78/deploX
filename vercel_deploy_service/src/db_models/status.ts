import mongoose from "mongoose";

const statusSchema = new mongoose.Schema({
    projectId: { type: String, required: true },
    status: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model("STATUS", statusSchema);