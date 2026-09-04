import mongoose from "mongoose";

const connectDB = async () => {
    const url = process.env.MONGO_URI

    if(!url){
        throw new Error("URL not found");
    }

    try {
        await mongoose.connect(url,{
            dbName: "Chatapp"
        })
        console.log('connect mongo successfull');
        
    } catch (error) {
        console.log("Database connection error",error);
        
    }
};

export default connectDB;