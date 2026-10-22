import mongoose from "mongoose";

const dbConnection = () => {
    mongoose.connect(process.env.MONGO_URI, {
        dbName: "Personal_Portfolio_Website"
    }).then(() => {
        console.log("Connected to database");
    }).catch((error) => {
        console.log(`Some Error Ocurred while Connecting to Database: ${error}`)
    });
};

export default dbConnection;