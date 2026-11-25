import { createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const forgotResetPassSlice = createSlice({
    name: "forgotPassword",
    initialState: {
        loading: false,
        message: null,
        error: null,
    },
    reducers: {
        forgotPasswordRequest(state, action) {
            state.loading = true;
            state.message = null;
            state.error = null;
        },
        forgotPasswordSuccess(state, action) {
            state.loading = false;
            state.message = action.payload
            state.error = null;
        },
        forgotPasswordFailed(state, action) {
            state.loading = false;
            state.message = null;
            state.error = action.payload;
        },

        resetPasswordRequest(state, action) {
            state.loading = true;
            state.message = null;
            state.error = null;
        },
        resetPasswordSuccess(state, action) {
            state.loading = false;
            state.message = action.payload
            state.error = null;
        },
        resetPasswordFailed(state, action) {
            state.loading = false;
            state.message = null;
            state.error = action.payload;
        },


        clearAllErrors(state, action) {
            state.error = null;
            state.user = state;
        }
    }
});

export const forgotPassword = (email) => async (dispatch) => {
    dispatch(forgotResetPassSlice.actions.forgotPasswordRequest());
    try {
        const { data } = await axios.post(
            "http://localhost:4000/api/v1/user/password/forgot",
            { email },
            { withCredentials: true, headers: { "Content-Type": "application/json" } });
            dispatch(forgotResetPassSlice.actions.forgotPasswordSuccess(data.message));
            dispatch(forgotResetPassSlice.actions.clearAllErrors());
    } catch (error) {
        dispatch(forgotResetPassSlice.actions.forgotPasswordFailed(error.response.data.message))
    }
};

export const resetPassword = (token, password, confirmPassword) => async (dispatch) => {
    dispatch(forgotResetPassSlice.actions.resetPasswordRequest());
    try {
        const { data } = await axios.put(
            `http://localhost:4000/api/v1/user/password/reset/${token}`,
            { password, confirmPassword },
            { withCredentials: true, headers: { "Content-Type": "application/json" } });
            dispatch(forgotResetPassSlice.actions.forgotPasswordSuccess(data.message));
            dispatch(forgotResetPassSlice.actions.clearAllErrors());
    } catch (error) {
        dispatch(forgotResetPassSlice.actions.forgotPasswordFailed(error.response.data.message))
    }
};


export const clearAllForgotPasswordErrors = () => (dispatch) => {
    dispatch(forgotResetPassSlice.actions.clearAllErrors());
};

export default forgotResetPassSlice.reducer;