// Returns sensor data modifier that adds sensor database id by sensor serial number
function registrationIdModifierFactory(registeredSensors) {
  let sensorsDictionaryBySerialNumber = {};

  registeredSensors.forEach(s => sensorsDictionaryBySerialNumber[s.serialNumber] = s);

  return sensor => {
    sensor.id = (sensorsDictionaryBySerialNumber[sensor.serialNumber] || {}).id;

    return sensor;
  };
}

module.exports = registrationIdModifierFactory;