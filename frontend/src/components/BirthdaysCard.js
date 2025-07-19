import React, { useEffect, useState } from 'react';
import { fetchBirthdays } from '../services/profileService'; // Ensure this is correctly implemented

const BirthdaysCard = ({ userId }) => {
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBirthdays = async () => {
      try {
        const response = await fetchBirthdays(userId);
        setBirthdays(response?.birthdays || []);
      } catch (error) {
        console.error('Failed to fetch birthdays:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadBirthdays();
    }
  }, [userId]);

  const renderMessage = () => {
    if (birthdays.length === 0) {
      return <p className="mb-0 small">No birthdays today.</p>;
    }

    const firstName = birthdays[0].userName;
    const othersCount = birthdays.length - 1;

    return (
      <p className="mb-0 small">
        <span className="fw-bold">{firstName}</span>
        {othersCount > 0 && (
          <>
            {' '}and <span className="fw-bold">{othersCount} other{othersCount > 1 ? 's' : ''}</span>
          </>
        )} have birthdays today.
      </p>
    );
  };

  return (
    <div className="card border-0 shadow-sm mb-3">
      <div className="card-header bg-white">
        <h6 className="mb-0 fw-bold">Birthdays</h6>
      </div>
      <div className="card-body">
        <div className="d-flex align-items-center">
          <i
            className="bi bi-gift-fill text-primary me-2"
            style={{ fontSize: "1.5rem" }}
          ></i>
          {loading ? (
            <p className="mb-0 small">Loading...</p>
          ) : (
            renderMessage()
          )}
        </div>
      </div>
    </div>
  );
};

export default BirthdaysCard;
