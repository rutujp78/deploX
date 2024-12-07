import mongoose from "mongoose";

export async function connectDB() {
    mongoose.connect(process.env.MONGODB_URL || "")
    .then(() => console.log("Connected to mongoDB"))
    .catch((err: Error) => console.log(err));
};