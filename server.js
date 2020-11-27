const express = require("express");
const app = express();
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, "./files")));
app.use(cors());

app.use("/api/models_training/images_labels/", require("./api/api_images_labels"));
app.use("/api/models_training/models_training/", require("./api/api_models_training"));

app.listen(5001, () => {
  console.log("Backend is running...");
});
