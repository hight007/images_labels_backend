const express = require("express");
const constants = require("../constant/constant");
const router = express.Router();
const fs = require('fs-extra')
const formidable = require("formidable");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const moment = require("moment");
const path = require('path');

//Models
const trainingData = require("../model/trainingModel");
const modelsList = require('../model/modelsList');
const constant = require("../constant/constant");

//Training data
router.post("/trainingData", async (req, res) => {
  try {
    console.log('trainingData');
    const form = new formidable.IncomingForm();
    await form.parse(req, async (error, fields, files) => {
      console.log("error : " + JSON.stringify(error));
      console.log("Fields : " + JSON.stringify(fields));
      console.log("Files : " + JSON.stringify(files));

      var data = {
        createBy: fields.createBy,
        images: await fs.readFileSync(files.image.path),
        modelsName: fields.modelsName,
      };

      let result = await trainingData.create(data);

      res.json({
        // result,
        api_result: constants.kResultOk,
      });
    });
  } catch (error) {
    res.json({
      api_result: constants.kResultNok,
      error,
    });
  }
});

router.delete("/trainingData", async (req, res) => {
  try {
    const { id, modelsName } = req.body
    let trainingResult = await trainingData.destroy({ where: { id, modelsName } })

    const dirImg = path.join(__dirname, '..', '/imagesLabels', `/${modelsName}/`, `${id}.jpg`)
    const dirXml = path.join(__dirname, '..', '/imagesLabels', `/${modelsName}/`, `${id}.xml`)
    // fs.rmdirSync(dir, { recursive: true });
    await fs.removeSync(dirImg);
    await fs.removeSync(dirXml);

    res.json({
      trainingResult,
      api_result: constants.kResultOk,
    })

  } catch (error) {
    console.log(error);
    res.json({
      error,
      api_result: constants.kResultNok,
    });
  }
});

router.get("/trainingData/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log('find trainingData Img');
    let result = await trainingData.findOne({ where: { id: id } });
    //   res.type(result.fileType);
    res.type(".jpg");
    res.end(result.images);
  } catch (error) {
    console.log(error);
    res.json({
      error,
      api_result: constants.kResultNok,
    });
  }
});

router.get(
  "/trainingDataSearch/startDate=:startDate&toDate=:toDate&status=:status&modelsName=:modelsName",
  async (req, res) => {
    try {
      console.log('trainingDataSearch');
      const { startDate, toDate, status, modelsName } = req.params;

      console.log(moment(startDate).format('DD-MMM-Y'));
      console.log(moment(toDate).format('DD-MMM-Y'));
      let condition = {
        where: {
          createdAt: {
            [Op.between]: [
              moment(startDate).add(7, 'hours').toDate(),
              moment(toDate).add(7, 'hours').toDate(),
            ],

          },

        },
        attributes: ["id", 'status', 'modelsName', "createdAt", 'updatedAt'],
        // order: [["createdAt", "DESC"]],
        order: [["createdAt", "ASC"]],
      };

      if (status !== 'All') {
        Object.assign(condition.where, { status });
      }

      if (modelsName !== 'All') {
        Object.assign(condition.where, { modelsName });
      }

      let result = await trainingData.findAll(condition);

      // console.log(result);

      res.json({
        result,
        api_result: constants.kResultOk,
      });
    } catch (error) {
      console.log(error);
      res.json({
        error,
        api_result: constants.kResultNok,
      });
    }
  }
);

//Training Models list
router.patch('/modelsList', async (req, res) => {
  try {
    console.log('start add modelList');
    const { modelsName, listLabelTag } = req.body

    //get listLabeTagDb
    let result = await modelsList.findAll({
      where: {
        modelsName,
      },
      attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('labelTag')), 'labelTag']]
    })
    let listLabelTagDb = []
    result.forEach(async (item) => {
      await listLabelTagDb.push(item.labelTag)
    });

    //check add
    let addListLabel = []
    // listLabelTag [1,2,3,4,5]
    // listLabelTagDb [2,3,4,5,6]
    for (let i in listLabelTag) {
      if (listLabelTagDb.indexOf(listLabelTag[i]) < 0) {
        await addListLabel.push(listLabelTag[i])
      }
    }
    addListLabel.forEach(labelTag => {
      modelsList.create({ modelsName, labelTag })
    });

    //check delete
    // listLabelTag [1,2,3,4,5]
    // listLabelTagDb [2,3,4,5,6]
    let delListLabel = []
    for (let j in listLabelTagDb) {
      if (listLabelTag.indexOf(listLabelTagDb[j]) < 0) {
        await delListLabel.push(listLabelTagDb[j])
      }
    }
    delListLabel.forEach(labelTag => {
      modelsList.destroy({ where: { modelsName, labelTag } })
    });

    res.json({
      echo: req.body,
      api_result: constants.kResultOk,
    });
  } catch (error) {
    console.log(error);
    res.json({
      error,
      api_result: constants.kResultNok,
    });
  }
})

router.delete('/modelsList/', async (req, res) => {
  try {
    const { modelsName } = req.body
    let result = await modelsList.destroy({ where: { modelsName } })
    let trainingResult = await trainingData.destroy({ where: { modelsName } })
    const dir = path.join(__dirname, '..', '/imagesLabels', `/${modelsName}/`)
    // fs.rmdirSync(dir, { recursive: true });
    fs.removeSync(dir);
    res.json({
      result,
      trainingResult,
      api_result: constants.kResultOk,
    })
    console.log(`${dir} is deleted!`);
  } catch (error) {
    console.log(error);
    res.json({
      error,
      api_result: constants.kResultNok,
    });
  }
})

router.get('/modelsList', async (req, res) => {
  try {
    let result = await modelsList.findAll({
      attributes: [
        // specify an array where the first element is the SQL function and the second is the alias
        [Sequelize.fn('DISTINCT', Sequelize.col('modelsName')), 'modelsName'],
      ]
    })

    let modelsName = []
    for (let index in result) {
      await modelsName.push(result[index].modelsName)
    }

    res.json({
      modelsName,
      api_result: constants.kResultOk,
    })
  } catch (error) {
    console.log(error);
    res.json({
      api_result: constants.kResultNok,
      error
    })
  }
})

router.get('/listLabelTag/modelsName=:modelsName', async (req, res) => {
  try {
    const { modelsName } = req.params
    let result = await modelsList.findAll({
      attributes: ['labelTag', [Sequelize.fn('min', Sequelize.col('createdAt')), 'createdAt']],
      // attributes: [
      //   [Sequelize.fn('DISTINCT', Sequelize.col('labelTag')), 'labelTag'],
      // ],
      group: ['labelTag', 'createdAt'],
      where: {
        modelsName,
      },
      order: [["createdAt", "ASC"]],

    })
    labelTagList = []
    result.forEach(async (item) => {
      await labelTagList.push(item.labelTag)
    });
    res.json({ result, labelTagList, api_result: constants.kResultOk })
  } catch (error) {
    console.log(error);
    res.json({
      error,
      api_result: constants.kResultNok,
    });
  }
})

module.exports = router;
