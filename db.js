import { config } from "dotenv";
import mongoose from "mongoose";
config();

const mongodburl = process.env.MONGO_URL
const database =async()=>{
    try {
        const connection = await mongoose.connect(mongodburl).then(()=>{
            console.log("database has been connected successfully")
        })
    } catch (error) {
        console.log("failed")
    }
}
export default database;