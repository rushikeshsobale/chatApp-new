import React from 'react';
import { FaCalendarAlt } from 'react-icons/fa';
import moment from 'moment';

const EventCard = ({ events }) => {
  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white d-flex justify-content-between align-items-center">
        <h6 className="mb-0 fw-bold">Upcoming Events</h6>
        <button className="btn p-0 text-primary">See All</button>
      </div>
      <div className="card-body">
        {events.length > 0 ? (
          events.map((event) => (
            <div key={event._id} className="mb-3">
              <div className="d-flex align-items-start">
                <div className="bg-primary rounded p-2 me-3 text-white">
                  <FaCalendarAlt size={20} />
                </div>
                <div>
                  <h6 className="mb-1">{event.title}</h6>
                  <small className="text-muted d-block">
                    {moment(event.date).format("MMM D, YYYY")} • {event.location}
                  </small>
                  <button className="btn btn-sm btn-outline-primary mt-2">
                    Interested
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-muted small">No upcoming events</p>
        )}
      </div>
    </div>
  );
};

export default EventCard;