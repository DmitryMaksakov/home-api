(function (routeConfig) {

  'use strict';

  routeConfig.init = function (app) {

    const
      authRoutes = require('../routes/auth'),
      sensorsRoutes = require('../routes/sensors');

    app.use('/api/auth', authRoutes);
    app.use('/api/sensors', sensorsRoutes);
  };

})(module.exports);