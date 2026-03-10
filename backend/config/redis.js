// const { createClient } = require("redis");

// let redisClient;

// try {
//   redisClient = createClient({
//     url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
//   });

//   redisClient.on("error", () => {
//     console.log("⚠ Redis not available. Running without online status.");
//   });

//   (async () => {
//     if (!redisClient.isOpen) {
//       await redisClient.connect();
//       console.log("✅ Redis Connected");
//     }
//   })();
// } catch (err) {
//   console.log("⚠ Redis initialization failed.");
// }

// module.exports = redisClient;