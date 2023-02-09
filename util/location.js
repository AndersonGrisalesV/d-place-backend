const axios = require("axios");
const HttpError = require("../models/http-error");

// API Key for accessing Google Maps API
const API_KEY = process.env.GOOGLE_MAPS_TOKEN;

// Function to get coordinates for a given address
async function getCoordinatesForAddress(address) {
  // Making a GET request to Google Maps API
  const response = await axios.get(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${API_KEY}`
  );

  // Data received from the API response
  const data = response.data;

  // If no data or ZERO_RESULTS status, throw an error
  if (!data || data.status === "ZERO_RESULTS") {
    const error = new HttpError(
      "Could not find a location for the specified address.",
      422
    );
    throw error;
  }

  // Extracting the coordinates from the API response
  const coordinates = data.results[0].geometry.location;

  // Returning the extracted coordinates
  return coordinates;
}

module.exports = getCoordinatesForAddress;
