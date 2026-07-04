import api from '../api';

export const getNotifications = async (id) => {
   if(!id) return [];

    try {
        const response = await api.get(`/notifications/fetch/${id}`);
        return response.data;
    } catch (error) {
        throw new Error("Failed to fetch notifications");
    }
};

export const updateNotification = async (notificationId, read) => {
    try {
        const response = await api.put(`/notifications/${notificationId}`, { read });
        return response.data;
    } catch (error) {
        throw new Error("Failed to update notification");
    }
};

export const deleteNotification = async (notificationId) => {
    try {
        const response = await api.delete(`/notifications/${notificationId}`);  
        return response.data;
    } catch (error) {
        throw new Error("Failed to delete notification");
    }   
};