import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const DateTimePicker = () => {
  const [selectedDate, setSelectedDate] = useState(null);

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  // Filter out past times if the selected date is today
  const filterPassedTime = (time) => {
    const currentDate = new Date();
    const selectedTime = new Date(time);

    // Allow only times equal to or greater than the current time for today
    return selectedTime.getTime() >= currentDate.getTime();
  };

  // Round up to the next 15-minute interval
  const roundToNext15Minutes = (date) => {
    const roundedDate = new Date(date);
    const minutes = roundedDate.getMinutes();
    const remainder = 15 - (minutes % 15); // Calculate the minutes needed to reach the next interval
    roundedDate.setMinutes(minutes + remainder);
    roundedDate.setSeconds(0);
    roundedDate.setMilliseconds(0);
    return roundedDate;
  };

  // Effect to update the selected time if it's no longer valid
  useEffect(() => {
    if (selectedDate) {
      const now = new Date();
      if (selectedDate < now) {
        const roundedNow = roundToNext15Minutes(now); // Round to the next 15-minute interval
        setSelectedDate(roundedNow); // Update the value
      }
    }
  }, [selectedDate]);

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Select Date and Time</h2>
      <DatePicker
        selected={selectedDate}
        onChange={handleDateChange}
        showTimeSelect
        timeIntervals={15} // Set the time interval to 15 minutes
        timeFormat="hh:mm aa" // AM/PM format
        dateFormat="MMMM d, yyyy h:mm aa" // Date with AM/PM time
        timeCaption="Time" // Label for the time picker
        placeholderText="Click to select a date and time"
        minDate={new Date()} // Restrict date selection to current date and time onwards
        filterTime={filterPassedTime} // Disable past times
      />
      {selectedDate && (
        <p style={{ marginTop: "20px" }}>
          Selected: {selectedDate.toLocaleString()}
        </p>
      )}
    </div>
  );
};

export default DateTimePicker;
