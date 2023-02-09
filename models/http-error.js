class HttpError extends Error {
  // constructor with message and errorCode as input parameters
  constructor(message, errorCode) {
    // Call the parent class constructor
    super(message); // Add a "Message" property to the object
    this.code = errorCode; // Add a "code" property to the object
  }
}
// Export the HttpError class
module.exports = HttpError;
