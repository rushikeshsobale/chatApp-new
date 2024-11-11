import { SET_USER } from './action';

const initialState = {
  userId: {},
 
};

const authReducer = (state= initialState, action) => {
  console.log(state , 'action from userSlice')
  switch (action.type) {
    case SET_USER:
      return {
        ...state,
        userId: action.payload.userId,
       
      };
    default:
      return state;
  }
};

export default authReducer;
