import api from '../api';

export const createNotification = async (notificationData) => {
    console.log(notificationData, 'notificationData')
    try {
        const response = await api.post('/notifications/create', notificationData);
        return response.data;
    } catch (error) {
        throw new Error("Failed to create notification");
    }
};

export const getNotifications = async (id) => {
    if (!id) throw new Error("User ID is required to fetch notifications");
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

