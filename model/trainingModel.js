const { Sequelize, DataTypes } = require("sequelize");
const database = require("./../instance/hb_instance");

const trainingData = database.define(
    "trainingData",
    {
        // attributes
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true,
        },
        images: {
            type: Sequelize.DataTypes.BLOB("long"),
            allowNull: false,
        },
        modelsName: {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: "unName"
        },
        status: {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: "unTrain"
        },
        labelsResult: {
            type: Sequelize.STRING('MAX'),
            allowNull: true,
            defaultValue: "[]"
        },
        createBy: {
            type: Sequelize.STRING,
            allowNull: false,
        },
    },
    {
        //option
    }
);

(async () => {
    await trainingData.sync({ force: false });
})();

module.exports = trainingData;
