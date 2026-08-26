const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({
    message: "FlyRank Widget Platform API is running!"
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});