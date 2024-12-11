import { SerialPort } from "serialport";

SerialPort.list().then((ports) => {
  ports.forEach((port) => {
    console.log(`Path: ${port.path} | Friendly Name: ${port.friendlyName}`);
  });
});