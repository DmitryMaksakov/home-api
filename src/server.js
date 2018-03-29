require('dotenv').config();

// Importing modules
const
  express = require('express'),
  app = express(),
  mainConfig = require('./config/main'),
  routeConfig = require('./config/route'),
  errorConfig = require('./config/error'),
  db = require('./modules/db/db'),
  caseMapper = require('./helpers/caseMapper'),

  registrationIdModifierFactory = require('./modules/observers/sensor-observer/registrationIdModifierFactory'),
  SensorsObserver = require('./modules/observers/sensor-observer/SensorsObserver'),
  SensorsTrendsObserver = require('./modules/observers/sensors-trends-observer/SensorsTrendsObserver'),
  SensorsDbLogger = require('./modules/loggers/SensorsDbLogger'),
  TelegramBot = require('./modules/notifiers/TelegramBot'),
  SensorThresholdsChecker = require('./modules/checkers/SensorThresholdsChecker'),
  SecurityChecker = require('./modules/checkers/SecurityChecker'),
  modulesRepository = require('./modules/modules-repository/ModulesRepository');

const start = async () => {

  // Modules instantiation
  const
    registeredSensors = (await db.query('select * from sensors')).map(caseMapper),
    sensorsObserver = new SensorsObserver(),
    sensorsTrendsObserver = new SensorsTrendsObserver(),
    sensorsDbLogger = new SensorsDbLogger(),
    telegramBot = new TelegramBot(),
    sensorThresholdsChecker = new SensorThresholdsChecker(),
    securityChecker = new SecurityChecker();

  await sensorsObserver.init([registrationIdModifierFactory(registeredSensors)]);
  await sensorsTrendsObserver.init(sensorsObserver, registeredSensors);
  await sensorsDbLogger.init(sensorsObserver);
  await sensorThresholdsChecker.init(sensorsObserver, [telegramBot]);
  await securityChecker.init(sensorsObserver, [telegramBot], telegramBot);

  modulesRepository.registerModule('sensorsObserver', sensorsObserver);
  modulesRepository.registerModule('sensorsTrendsObserver', sensorsTrendsObserver);
  modulesRepository.registerModule('sensorsDbLogger', sensorsDbLogger);
  modulesRepository.registerModule('sensorThresholdsChecker', sensorThresholdsChecker);
  modulesRepository.registerModule('securityChecker', securityChecker);

  mainConfig.init(app, express);
  routeConfig.init(app);
  errorConfig.init(app);

  app.listen(process.env.API_PORT, async () => {
    console.log(`Home Control API listening on port ${process.env.API_PORT}!`);
    await telegramBot.sendBroadcast('Главный узел запущен');
  });
};

start().then();