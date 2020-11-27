const express = require("express");
const router = express.Router();
const constants = require("../constant/constant");
const fs = require("fs-extra");
const formidable = require("formidable");
const moment = require("moment");
const axios = require('axios');
const jsonxml = require('jsontoxml');
const path = require('path');
const archiver = require('archiver');
const Sequelize = require("sequelize");
const Op = Sequelize.Op;

const trainingData = require("../model/trainingModel");

router.post('/labeled', async (req, res) => {
    try {
        let { id, labeledData } = req.body

        //get modelsName of this image subject
        var modelsData = await trainingData.findOne({
            where: { id },
            attributes: ['modelsName', 'images'],
        })

        //Create constant
        const dir = path.join(__dirname, '..', '/imagesLabels', `/${modelsData.modelsName}`)
        const imageFileName = `${id}.jpg`
        const imagePath = path.join(dir, imageFileName)

        //create annotation object
        var object = []
        for (let i in labeledData.boxes) {
            let xmin = Math.round(labeledData.boxes[i].x) < 0 ? 0 : Math.round(labeledData.boxes[i].x)
            let ymin = Math.round(labeledData.boxes[i].y) < 0 ? 0 : Math.round(labeledData.boxes[i].y)
            let xmax = (Math.round(labeledData.boxes[i].x) + Math.round(labeledData.boxes[i].w)) < 0 ? 0 : Math.round(labeledData.boxes[i].x) + Math.round(labeledData.boxes[i].w)
            let ymax = (Math.round(labeledData.boxes[i].y) + Math.round(labeledData.boxes[i].h)) < 0 ? 0 : Math.round(labeledData.boxes[i].y) + Math.round(labeledData.boxes[i].h)
            await object.push({
                name: 'object',
                children:
                    [
                        {
                            name: 'name',
                            text: labeledData.boxes[i].annotation
                        },
                        {
                            name: 'pose',
                            text: 'Unspecified'
                        },
                        {
                            name: 'truncated',
                            text: 0
                        },
                        {
                            name: 'difficult',
                            text: 0
                        },
                        {
                            name: 'bndbox',
                            children: {
                                xmin,
                                ymin,
                                xmax,
                                ymax,
                            }
                        }
                    ]
            }
            )
        }

        //create JSON to deeplearning format
        var jsonAnnotation = {
            annotation: [
                { name: 'folder', text: modelsData.modelsName },
                { name: 'filename', text: imageFileName },
                { name: 'path', text: imagePath },
                { name: 'source', children: { database: 'Unknown' } },
                {
                    name: 'size', children: {
                        width: labeledData.width,
                        height: labeledData.height,
                        depth: 3,
                    }
                },
                { name: 'segmented', text: 0 },
                object
            ]
        }

        //convert json to XML
        var xml = await jsonxml(jsonAnnotation)

        // create dir if no dir
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        //save XML file
        await fs.writeFileSync(path.join(dir, `${id}.xml`), xml);
        console.log('labeled XML saved !!!');

        //save JPG file
        await fs.writeFile(imagePath, modelsData.images, 'binary')
        console.log('labeled image saved !!!');

        //update labels status
        await trainingData.update({ status: 'Trained', labelsResult: JSON.stringify(labeledData.boxes) }, { where: { id } })
        res.json({
            api_result: constants.kResultOk,
            echo: req.body
        })
    } catch (error) {
        console.log(error);
        res.json({
            api_result: constants.kResultNok,
            error
        })
    }

})

router.put('/labeled', async (req, res) => {
    try {
        const { id, modelsName, labelsResult} = req.body
        let result = await trainingData.update({ labelsResult, status:'unTrain'}, { where: { id } })

        const dirImg = path.join(__dirname, '..', '/imagesLabels', `/${modelsName}/`, `${id}.jpg`)
        const dirXml = path.join(__dirname, '..', '/imagesLabels', `/${modelsName}/`, `${id}.xml`)
        // fs.rmdirSync(dir, { recursive: true });
        await fs.removeSync(dirImg);
        await fs.removeSync(dirXml);

        res.json({
            result,
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

router.get('/labeled/id=:id', async (req, res) => {
    try {
        let { id } = req.params
        let result = await trainingData.findOne({ where: { id }, attributes: ['labelsResult'] })
        res.json({
            defaultBoxes: JSON.parse(result.labelsResult),
            api_result: constants.kResultOk
        })
    } catch (error) {
        console.log(error);
        res.json({
            api_result: constants.kResultNok,
            error
        })
    }
})

router.get('/archivedModels/modelsName=:modelsName', async (req, res) => {
    try {
        const { modelsName } = req.params
        console.log(modelsName);
        if (modelsName === 'All') {
            res.json({
                api_result: constants.kResultNok,
                error: 'Please select models name'
            })
            return
        }
        const outDir = path.join(__dirname, '..', '/imagesLabels', `/${modelsName}.zip`)
        const sourceDir = path.join(__dirname, '..', '/imagesLabels', `/${modelsName}`)
        await zipDirectory(sourceDir, outDir)

        try {
            console.log(outDir);
            res.writeHead(200, {
                "Content-Type": "application/octet-stream",
                "Content-Disposition": "attachment; filename=" + `${modelsName}.zip`
            });

            var readStream = fs.createReadStream(outDir);
            readStream.pipe(res);
        } catch (error) {
            console.log(error);
            res.json({
                api_result: constants.kResultNok,
                error: 'can not get file archived'
            })
        }
    } catch (error) {
        console.log(error);
        res.json({
            api_result: constants.kResultNok,
            error
        })
    }
})

function zipDirectory(source, out) {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = fs.createWriteStream(out);

    return new Promise((resolve, reject) => {
        archive
            .directory(source, false)
            .on('error', err => reject(err))
            .pipe(stream)
            ;

        stream.on('close', () => resolve());
        archive.finalize();
    });

}

router.get('/modelsList', async (req, res) => {
    try {
        let result = await trainingData.findAll({
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

router.get("/nextLabel/:id&:modelsName", async (req, res) => {
    try {
        const { id, modelsName } = req.params;

        // let modelsName = await trainingData.findOne({
        //     attributes: ['id', 'modelsName'],
        //     where: { id },
        // })

        let result = await trainingData.findAll({
            attributes: ['id'],
            limit: 1,
            order: [["id", "ASC"]],
            where: {
                id: { [Op.gt]: id },
                modelsName,
                // status : 'unTrain',
            }
        });

        if (result.length < 1) {
            res.json({
                error: 'next images not found',
                api_result: constants.kResultNok
            })

        } else {
            res.json({
                id: result[0].id,
                api_result: constants.kResultOk
            })
        }


    } catch (error) {
        console.log(error);
        res.json({
            error,
            api_result: constants.kResultNok,
        });
    }
});

router.get("/previousLabel/:id&:modelsName", async (req, res) => {
    try {
        const { id, modelsName } = req.params;


        let result = await trainingData.findAll({
            attributes: ['id'],
            limit: 1,
            order: [["id", "DESC"]],
            where: {
                id: { [Op.lt]: id },
                modelsName
            }
        });

        if (result.length < 1) {
            res.json({
                error: 'previous images not found',
                api_result: constants.kResultNok
            })

        } else {
            res.json({
                id: result[0].id,
                api_result: constants.kResultOk
            })
        }


    } catch (error) {
        console.log(error);
        res.json({
            error,
            api_result: constants.kResultNok,
        });
    }
});

module.exports = router;
