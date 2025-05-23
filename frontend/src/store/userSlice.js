import { SET_USER } from './action';

const initialState = {
  user: {},
 
};

const authReducer = (state= initialState, action) => {
  
  switch (action.type) {
    case SET_USER:
      return {
        ...state,
        user: action.payload.user,    
      }
    default:
      return state;
  }
};
export default authReducer;
