import api from '../api';

export const createGroup = async (groupData) => {
  const response = await api.post('group/createGroup', groupData);
  return response.data;
};

export const updateGroupName = async (groupId, name) => {
  const response = await api.put(`group/${groupId}/name`, { name });
  return response.data;
};

export const addGroupMembers = async (groupId, members) => {
  const response = await api.put(`group/${groupId}/members/add`, { members });
  return response.data;
};

export const removeGroupMembers = async (groupId, members) => {
  const response = await api.put(`group/${groupId}/members/remove`, { members });
  return response.data;
};

export const addGroupAdmins = async (groupId, admins) => {
  const response = await api.put(`group/${groupId}/admins/add`, { admins });
  return response.data;
};

export const removeGroupAdmins = async (groupId, admins) => {
  const response = await api.put(`group/${groupId}/admins/remove`, { admins });
  return response.data;
};

export const getAllGroups = async () => {
  const response = await api.get('group/getAllGroups');
  return response.data;
};

export const getGroupById = async (groupId) => {
  const response = await api.get(`group/getGroups/${groupId}`);
  return response.data;
};

export const deleteGroup = async (groupId) => {
  const response = await api.delete(`group/delete/Groups/${groupId}`);
  return response.data;
};
