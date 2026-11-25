import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slices/userSlice"
import forgotPasswordReducer from "./slices/forgotResetPasswordSlice"

export const store = configureStore({
    reducer: {
        user: userReducer,
        forgotPassword: forgotPasswordReducer
    }
})