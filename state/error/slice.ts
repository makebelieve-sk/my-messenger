import { createSlice } from "@reduxjs/toolkit";
import reducers from "./reducers";
import { InitialStateType, RootState } from "../../types/redux.types";

export type ErrorType = Pick<InitialStateType, "error">;

// Начальное состояние
export const initialState: ErrorType = {
  error: null
};

export const errorSlice = createSlice({
  name: 'error',
  initialState,
  reducers,
});

// Состояние
export const selectErrorState = (state: RootState) => state.error;

// Экшены
export const { setError } = errorSlice.actions;

// Редьюсер
export default errorSlice.reducer;