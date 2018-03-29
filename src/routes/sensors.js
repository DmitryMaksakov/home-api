const
  express = require('express'),
  router = express.Router(),
  moment = require('moment'),
  escape = require('sql-escape'),
  authHelpers = require('../helpers/auth'),
  db = require('../modules/db/db'),
  {SERVER_TIMESTAMP_FORMAT} = require('../config/defaults'),
  caseMapper = require('../helpers/caseMapper'),
  modulesRepository = require('../modules/modules-repository/ModulesRepository');

// Returns all registered sensors data
router.get('/', authHelpers.loginRequired, async (req, res) => {
  try {
    const
      // Sensors info from database
      dbSensors =
        (await db.query(
          `select sensors.id, device_types.name as type, sensors.name, serial_number, sensors.description, unit 
          from sensors 
          left join device_types on sensors.type = device_types.id
        `)).map(caseMapper),

      // Current online sensors info
      onlineSensors = (modulesRepository.getModule('sensorsObserver')).getDataForAll(),

      // Current inlone sensors trends info
      sensorsTrendsObserver = modulesRepository.getModule('sensorsTrendsObserver');

    // Filling online sensors dictionary by serial number
    let onlineSensorsDataBySerialNumber = {};
    onlineSensors.forEach(sensorData => onlineSensorsDataBySerialNumber[sensorData.serialNumber] = sensorData);

    // Filling result
    const data = dbSensors.map(dbSensor => {
      dbSensor.isOnline = !!onlineSensorsDataBySerialNumber[dbSensor.serialNumber];

      // Enriching data if sensor is online
      if (dbSensor.isOnline) {
        dbSensor.value = onlineSensorsDataBySerialNumber[dbSensor.serialNumber].value;
        dbSensor.timestamp = onlineSensorsDataBySerialNumber[dbSensor.serialNumber].timestamp;

        const sensorTrendsData = sensorsTrendsObserver.getDataBySerialNumber(dbSensor.serialNumber);
        if (sensorTrendsData) {
          dbSensor.longTrendChange = sensorTrendsData.longTrendChange;
          dbSensor.shortTrendChange = sensorTrendsData.shortTrendChange;
        }
      }

      return dbSensor;
    });

    return res.send(data);
  } catch (e) {
    return res.status(500).send(e.toString());
  }
});

// Returns all obtained sensors data in raw form
router.get('/raw', authHelpers.loginRequired, async (req, res) => {
  try {
    const onlineSensors = (modulesRepository.getModule('sensorsObserver')).getDataForAll().map(caseMapper);
    return res.send(onlineSensors);
  } catch (e) {
    return res.status(500).send(e.toString());
  }
});

// Returns sensor history by ID
router.get('/:id/log', authHelpers.loginRequired, async (req, res) => {
  const
    from = moment().utc().subtract(24, 'hour').format(SERVER_TIMESTAMP_FORMAT),
    to = moment().utc().format(SERVER_TIMESTAMP_FORMAT);

  try {
    const sensorLog =
      (await
        db.query(`select value, timestamp from sensors_log 
        where sensor_id=${Number(req.params.id)} and 
        timestamp >= '${escape(req.query.from || from)}' and timestamp <= '${escape(req.query.to || to)}'`))
        .map(caseMapper);

    res.send(sensorLog);
  } catch (e) {
    return res.status(500).send(e.toString());
  }
});

module.exports = router;