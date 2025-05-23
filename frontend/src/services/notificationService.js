import api from '../api';
import { getAccessToken } from './authService';

const apiUrl = process.env.REACT_APP_API_URL;

export const createNotification = async (notificationData) => {
    console.log(notificationData, 'notificationData')
    const token = getAccessToken();
    const response = await fetch(`${apiUrl}/notifications/create`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(notificationData),
    });
    if (!response.ok) {
        throw new Error("Failed to create notification");
    }
    return response.json();
};

export const getNotifications = async (id) => {
    const token = getAccessToken();
    const response = await fetch(`${apiUrl}/notifications/fetch/${id}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        throw new Error("Failed to fetch notifications");
    }
    return response.json();
};

export const updateNotification = async (notificationId, read) => {
    const token = getAccessToken();
    const response = await fetch(`${apiUrl}/notifications/${notificationId}`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ read }),
    });
    if (!response.ok) {
        throw new Error("Failed to update notification");
    }
    return response.json();
};

