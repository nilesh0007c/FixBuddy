const server =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://fixbuddy-ywb4.onrender.com";

export default server;