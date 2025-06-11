"use strict";

console.log("🚀 ~ process.env.NODE_ENV:", process.env.NODE_ENV);
if (process.env.NODE_ENV === "production") {
  module.exports = require("./cjs/react.production.js");
} else {
  module.exports = require("./cjs/react.development.js");
}
