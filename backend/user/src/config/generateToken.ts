import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_TOKEN = process.env.JWT_TOKEN as string;

export const generateToken = (user: any) =>{  
     
    return jwt.sign({user}, JWT_TOKEN, {expiresIn:"15d"});
}