const { Sequelize, DataTypes } = require("sequelize");
const database = require("./../instance/hb_instance");

const modelsName = database.define(
    "modelsName",
    {
        modelsName: {
            type: Sequelize.STRING,
            allowNull: false,
            primaryKey: true,
        },
        labelTag: {
            type: Sequelize.STRING,
            allowNull: false,
            primaryKey: true,
        },
        
    },
    {
        //option
    }
);

(async () => {
    await modelsName.sync({ force: false });
})();

module.exports = modelsName;
