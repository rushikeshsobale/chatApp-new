// Action Types
export const SET_USER = 'SET_USER';
export const ADD_MESSAGE = 'ADD_MESSAGE';
export const setUser = (userId) => {
  return {
    type: SET_USER,
    payload: {
      userId,
     
    },
  };
};
export const addMessage = (neededId, message) => {
  return {
    type: ADD_MESSAGE,
    payload: {
      neededId,
      message,
    },
  };
};
