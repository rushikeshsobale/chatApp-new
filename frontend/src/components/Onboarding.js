import React, { useState } from "react";
import {
  FaCamera,
  FaCheck,
  FaArrowRight,
  FaArrowLeft,
  FaTimes,
  FaSmile,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../css/OnboardingStyles.css";
import { completeProfile } from "../services/authService";
import { useSelector } from "react-redux";
const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [profilePic, setProfilePic] = useState(null);
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [skipAll, setSkipAll] = useState(false);
  const navigate = useNavigate();
  const userId = (localStorage.getItem("userId"));

  // User data state
  const [userData, setUserData] = useState({
    basicInfo: {
      firstName: "",
      lastName: "",
      gender: "",
      birthDate: "",
      location: "",
    },
    interests: {
      music: [],
      sports: [],
      movies: [],
      books: [],
      hobbies: [],
    },
    favorites: {
      singer: "",
      sportsperson: "",
      movie: "",
      book: "",
      food: "",
      cuisine: "",
    },
    professional: {
      profession: "",
      education: "",
      skills: [],
      workExperience: "",
    },
    social: {
      website: "",
      twitter: "",
      instagram: "",
      linkedin: "",
    },
  });

  // Options for various selections
  const genderOptions = [
    "Male",
    "Female",
    "Non-binary",
    "Other",
    "Prefer not to say",
  ];
  const musicGenres = [
    "Pop",
    "Rock",
    "Hip Hop",
    "R&B",
    "Electronic",
    "Jazz",
    "Classical",
    "Country",
    "Metal",
    "Indie",
  ];
  const sports = [
    "Football",
    "Basketball",
    "Tennis",
    "Cricket",
    "Swimming",
    "Running",
    "Cycling",
    "Yoga",
    "Golf",
    "MMA",
  ];
  const movieGenres = [
    "Action",
    "Comedy",
    "Drama",
    "Horror",
    "Sci-Fi",
    "Romance",
    "Thriller",
    "Documentary",
    "Animation",
    "Fantasy",
  ];
  const bookGenres = [
    "Fiction",
    "Non-fiction",
    "Mystery",
    "Science",
    "Biography",
    "History",
    "Self-help",
    "Fantasy",
    "Romance",
    "Poetry",
  ];
  const hobbyOptions = [
    "Photography",
    "Cooking",
    "Gardening",
    "Painting",
    "Traveling",
    "Gaming",
    "Reading",
    "Writing",
    "Fishing",
    "DIY",
  ];
  const professionOptions = [
    "Student",
    "Software Engineer",
    "Doctor",
    "Teacher",
    "Artist",
    "Entrepreneur",
    "Designer",
    "Engineer",
    "Writer",
    "Other",
  ];
  const cuisineOptions = [
    "Italian",
    "Indian",
    "Chinese",
    "Mexican",
    "Japanese",
    "Thai",
    "French",
    "Mediterranean",
    "American",
    "Other",
  ];

  const handleChange = (e, category, field) => {
    const { value } = e.target;
    setUserData((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
  };

  const handleMultiSelect = (category, field, value) => {
    setUserData((prev) => {
      const currentValues = prev[category][field];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

      return {
        ...prev,
        [category]: {
          ...prev[category],
          [field]: newValues,
        },
      };
    });
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const completeData = {
        profilePic,
        bio,
        ...userData,
      };

      const response = await completeProfile(userId, completeData);
      
      if (response.success) {
        // Update local storage with user data
        localStorage.setItem('userData', JSON.stringify(response.user));
        navigate('/');
      } else {
        console.error('Profile completion failed:', response.error);
        // You might want to show an error message to the user here
      }
    } catch (error) {
      console.error('Error completing profile:', error);
      // You might want to show an error message to the user here
    } finally {
      setLoading(false);
    }
  };

  const skipStep = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      setSkipAll(true);
      handleSubmit();
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="onboarding-step">
            <h4 className="text-center mb-4">Add a Profile Picture</h4>
            <div className="d-flex justify-content-center mb-4">
              <label htmlFor="profile-upload" className="profile-pic-upload">
                {profilePic ? (
                  <img
                    src={profilePic}
                    alt="Profile"
                    className="profile-pic-preview"
                  />
                ) : (
                  <div className="profile-pic-placeholder">
                    <FaCamera size={32} />
                    <span>Upload Photo</span>
                  </div>
                )}
                <input
                  id="profile-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePicChange}
                  className="d-none"
                />
              </label>
            </div>
            <p className="text-center text-muted mb-4">
              Upload a photo so friends can recognize you
            </p>
          </div>
        );
      
      // case 2:
      //   return (
      //     <div className="onboarding-step">
      //       <h4 className="text-center mb-4">Your Interests</h4>
      //       <p className="text-center mb-4">
      //         Select what you're interested in (optional)
      //       </p>

      //       <div className="mb-4">
      //         <h5>Music Genres</h5>
      //         <div className="interests-grid">
      //           {musicGenres.map((genre) => (
      //             <button
      //               key={genre}
      //               type="button"
      //               className={`interest-btn ${
      //                 userData.interests.music.includes(genre) ? "selected" : ""
      //               }`}
      //               onClick={() =>
      //                 handleMultiSelect("interests", "music", genre)
      //               }
      //             >
      //               {genre}
      //               {userData.interests.music.includes(genre) && (
      //                 <FaCheck className="ms-2" />
      //               )}
      //             </button>
      //           ))}
      //         </div>
      //       </div>

      //       <div className="mb-4">
      //         <h5>Sports</h5>
      //         <div className="interests-grid">
      //           {sports.map((sport) => (
      //             <button
      //               key={sport}
      //               type="button"
      //               className={`interest-btn ${
      //                 userData.interests.sports.includes(sport)
      //                   ? "selected"
      //                   : ""
      //               }`}
      //               onClick={() =>
      //                 handleMultiSelect("interests", "sports", sport)
      //               }
      //             >
      //               {sport}
      //               {userData.interests.sports.includes(sport) && (
      //                 <FaCheck className="ms-2" />
      //               )}
      //             </button>
      //           ))}
      //         </div>
      //       </div>

      //       <div className="mb-4">
      //         <h5>Movie Genres</h5>
      //         <div className="interests-grid">
      //           {movieGenres.map((genre) => (
      //             <button
      //               key={genre}
      //               type="button"
      //               className={`interest-btn ${
      //                 userData.interests.movies.includes(genre)
      //                   ? "selected"
      //                   : ""
      //               }`}
      //               onClick={() =>
      //                 handleMultiSelect("interests", "movies", genre)
      //               }
      //             >
      //               {genre}
      //               {userData.interests.movies.includes(genre) && (
      //                 <FaCheck className="ms-2" />
      //               )}
      //             </button>
      //           ))}
      //         </div>
      //       </div>

      //       <div className="mb-4">
      //         <h5>Book Genres</h5>
      //         <div className="interests-grid">
      //           {bookGenres.map((genre) => (
      //             <button
      //               key={genre}
      //               type="button"
      //               className={`interest-btn ${
      //                 userData.interests.books.includes(genre) ? "selected" : ""
      //               }`}
      //               onClick={() =>
      //                 handleMultiSelect("interests", "books", genre)
      //               }
      //             >
      //               {genre}
      //               {userData.interests.books.includes(genre) && (
      //                 <FaCheck className="ms-2" />
      //               )}
      //             </button>
      //           ))}
      //         </div>
      //       </div>

      //       <div className="mb-4">
      //         <h5>Hobbies</h5>
      //         <div className="interests-grid">
      //           {hobbyOptions.map((hobby) => (
      //             <button
      //               key={hobby}
      //               type="button"
      //               className={`interest-btn ${
      //                 userData.interests.hobbies.includes(hobby)
      //                   ? "selected"
      //                   : ""
      //               }`}
      //               onClick={() =>
      //                 handleMultiSelect("interests", "hobbies", hobby)
      //               }
      //             >
      //               {hobby}
      //               {userData.interests.hobbies.includes(hobby) && (
      //                 <FaCheck className="ms-2" />
      //               )}
      //             </button>
      //           ))}
      //         </div>
      //       </div>
      //     </div>
      //   );
      case 2:
        return (
          <div className="onboarding-step">
            <h4 className="text-center mb-4">Your Favorites</h4>
            <p className="text-center mb-4">
              Tell us about your favorites (optional)
            </p>

            <div className="mb-3">
              <label>Favorite Singer/Band</label>
              <input
                type="text"
                className="form-control"
                value={userData.favorites.singer}
                onChange={(e) => handleChange(e, "favorites", "singer")}
                placeholder="Taylor Swift, BTS, etc."
              />
            </div>

            <div className="mb-3">
              <label>Favorite Sportsperson</label>
              <input
                type="text"
                className="form-control"
                value={userData.favorites.sportsperson}
                onChange={(e) => handleChange(e, "favorites", "sportsperson")}
                placeholder="LeBron James, Serena Williams, etc."
              />
            </div>

            <div className="mb-3">
              <label>Favorite Movie</label>
              <input
                type="text"
                className="form-control"
                value={userData.favorites.movie}
                onChange={(e) => handleChange(e, "favorites", "movie")}
                placeholder="The Shawshank Redemption, etc."
              />
            </div>

            <div className="mb-3">
              <label>Favorite Book</label>
              <input
                type="text"
                className="form-control"
                value={userData.favorites.book}
                onChange={(e) => handleChange(e, "favorites", "book")}
                placeholder="To Kill a Mockingbird, etc."
              />
            </div>

            <div className="mb-3">
              <label>Favorite Food</label>
              <input
                type="text"
                className="form-control"
                value={userData.favorites.food}
                onChange={(e) => handleChange(e, "favorites", "food")}
                placeholder="Pizza, Sushi, etc."
              />
            </div>

            <div className="mb-3">
              <label>Favorite Cuisine</label>
              <select
                className="form-select"
                value={userData.favorites.cuisine}
                onChange={(e) => handleChange(e, "favorites", "cuisine")}
              >
                <option value="">Select cuisine</option>
                {cuisineOptions.map((cuisine) => (
                  <option key={cuisine} value={cuisine}>
                    {cuisine}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      // case 5:
      //   return (
      //     <div className="onboarding-step">
      //       <h4 className="text-center mb-4">Professional Information</h4>
      //       <p className="text-center mb-4">
      //         Tell us about your work (optional)
      //       </p>

      //       <div className="mb-3">
      //         <label>Profession</label>
      //         <select
      //           className="form-select"
      //           value={userData.professional.profession}
      //           onChange={(e) => handleChange(e, "professional", "profession")}
      //         >
      //           <option value="">Select profession</option>
      //           {professionOptions.map((profession) => (
      //             <option key={profession} value={profession}>
      //               {profession}
      //             </option>
      //           ))}
      //         </select>
      //       </div>

      //       <div className="mb-3">
      //         <label>Education</label>
      //         <input
      //           type="text"
      //           className="form-control"
      //           value={userData.professional.education}
      //           onChange={(e) => handleChange(e, "professional", "education")}
      //           placeholder="Degree, University, etc."
      //         />
      //       </div>

      //       <div className="mb-3">
      //         <label>Skills (comma separated)</label>
      //         <input
      //           type="text"
      //           className="form-control"
      //           value={
      //             Array.isArray(userData?.professional?.skills)
      //               ? userData.professional.skills.join(", ")
      //               : ""
      //           }
      //           onChange={(e) =>
      //             handleChange(
      //               e,
      //               "professional",
      //               "skills",
      //               e.target.value.split(",").map((s) => s.trim())
      //             )
      //           }
      //           placeholder="JavaScript, Design, Marketing, etc."
      //         />
      //       </div>

      //       <div className="mb-3">
      //         <label>Work Experience</label>
      //         <textarea
      //           className="form-control"
      //           rows="3"
      //           value={userData.professional.workExperience}
      //           onChange={(e) =>
      //             handleChange(e, "professional", "workExperience")
      //           }
      //           placeholder="Briefly describe your work experience..."
      //         ></textarea>
      //       </div>
      //     </div>
      //   );
      // case 6:
      //   return (
      //     <div className="onboarding-step">
      //       <h4 className="text-center mb-4">Social & Bio</h4>

      //       <div className="mb-4">
      //         <label>Bio</label>
      //         <textarea
      //           className="form-control"
      //           rows="4"
      //           placeholder="Tell others about yourself..."
      //           value={bio}
      //           onChange={(e) => setBio(e.target.value)}
      //           maxLength="300"
      //         ></textarea>
      //         <small className="text-muted">{bio.length}/300 characters</small>
      //       </div>

      //       <div className="mb-3">
      //         <label>Website</label>
      //         <input
      //           type="url"
      //           className="form-control"
      //           value={userData.social.website}
      //           onChange={(e) => handleChange(e, "social", "website")}
      //           placeholder="https://yourwebsite.com"
      //         />
      //       </div>

      //       <div className="mb-3">
      //         <label>Twitter</label>
      //         <input
      //           type="text"
      //           className="form-control"
      //           value={userData.social.twitter}
      //           onChange={(e) => handleChange(e, "social", "twitter")}
      //           placeholder="@username"
      //         />
      //       </div>

      //       <div className="mb-3">
      //         <label>Instagram</label>
      //         <input
      //           type="text"
      //           className="form-control"
      //           value={userData.social.instagram}
      //           onChange={(e) => handleChange(e, "social", "instagram")}
      //           placeholder="@username"
      //         />
      //       </div>

      //       <div className="mb-3">
      //         <label>LinkedIn</label>
      //         <input
      //           type="url"
      //           className="form-control"
      //           value={userData.social.linkedin}
      //           onChange={(e) => handleChange(e, "social", "linkedin")}
      //           placeholder="https://linkedin.com/in/username"
      //         />
      //       </div>
      //     </div>
      //   );
      default:
        return null;
    }
  };

  return (
    <div className="onboarding-container" >
      <div className="onboarding-card mb-5" style={{height:'800px', overflow:'auto'}}>
        <div className="progress-container">
          <div className="progress" style={{ height: "6px" }}>
            <div
              className="progress-bar"
              role="progressbar"
              style={{ width: `${(step / 2) * 100}%` }}
            ></div>
          </div>
          <div className="step-indicator">Step {step} of 2</div>
        </div>

        {renderStep()}

        <div className="onboarding-actions">
          <div className="d-flex justify-content-between">
            {step > 1 ? (
              <button
                className="btn btn-outline-primary"
                onClick={() => setStep(step - 1)}
              >
                <FaArrowLeft className="me-2" /> Back
              </button>
            ) : (
              <div></div>
            )}

            <div>
              <button
                className="btn btn-link text-muted me-3"
                onClick={skipStep}
              >
                {step < 2 ? "Skip" : "Skip All"}
              </button>

              {step < 2 ? (
                <button
                  className="btn btn-primary"
                  onClick={() => setStep(step + 1)}
                >
                  Continue <FaArrowRight className="ms-2" />
                </button>
              ) : (
                <button
                  className="btn btn-success"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden="true"
                    ></span>
                  ) : (
                    "Finish Setup"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
