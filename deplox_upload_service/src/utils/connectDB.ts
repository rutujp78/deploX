import mongoose from "mongoose";

export const connectDB = async () => {
    mongoose.connect(process.env.MONGODB_URL || '')
    .then(() => console.log("MongoDB connected"))
    .catch((err: Error) => console.log("Error while connecting mongodb.", err));
    console.log("App listening to port: 3000");
}