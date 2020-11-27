const Sequelize = require("sequelize");
const sequelize = new Sequelize("deepLearning", "sa", "P@ssw0rd", {
  host: "127.0.0.1", 
  dialect: "mssql",
  dialectOptions: {
    options: {
      instanceName: "",
    },
  },
});
 
(async () => {
  await sequelize.authenticate();
})();

module.exports = sequelize;
