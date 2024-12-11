import { createHaxidraw } from '../haxidraw/createHaxidraw.js';
import { createWebSerialBuffer } from "../haxidraw/createWebSerialBuffer.js";
import { createListener } from '../createListener.js';
import { runMachineHelper } from '../runMachineHelper.js';

let cancelled = { ref: false };
let haxidraw;
let connected = false;
let machineRunning = false;

export function addMachineControl() {
  const listener = createListener(document.body);

  listener('click', '[data-evt-connectTrigger]', async () => {
    if (!navigator.serial) {
      alert(
        "Your browser doesn't seem to support the Web Serial API, which is required for the Blot editor to connect to the machine. Chrome Version 89 or above is the recommended browser."
      );
    }
    if (!haxidraw) {
      // connect
      navigator.serial
        .requestPort({ filters: [] })
        .then(async (port) => {
          console.log('connecting');
          const comsBuffer = await createWebSerialBuffer(port);
          haxidraw = await createHaxidraw(comsBuffer);

          console.log(haxidraw);
          connected = true;
          updateUI();
        })
        .catch((e) => {
          // The user didn't select a port.
        });
    } else {
      // disconnect
      console.log('disconnecting');
      await haxidraw.port.close();
      haxidraw = null;
      connected = false;
      updateUI();
    }
  });

  listener('click', '[data-evt-machineTrigger]', (e) => {
    const runMachine = () => runMachineHelper(haxidraw, cancelled);

    if (!haxidraw) {
      console.log('not connected');
      return;
    }

    if (e.target.innerText.toLowerCase().includes('stop')) {
      cancelled.ref = true;
      machineRunning = false;
      console.log('cancelled');
      updateUI();
      return;
    }

    runMachine().then(() => {
      machineRunning = false;
      cancelled.ref = false;
      updateUI();
    });

    machineRunning = true;
    updateUI();
  });

  listener('click', '[data-evt-penUp]', () => {
    if (!haxidraw) {
      console.log('not connected');
      return;
    }

    haxidraw.servo(1000);
  });

  listener('click', '[data-evt-penDown]', () => {
    if (!haxidraw) {
      console.log('not connected');
      return;
    }

    haxidraw.servo(1700);
  });

  listener('click', '[data-evt-motorsOn]', () => {
    if (!haxidraw) {
      console.log('not connected');
      return;
    }

    haxidraw.port.send('motorsOn');
  });

  listener('click', '[data-evt-motorsOff]', () => {
    if (!haxidraw) {
      console.log('not connected');
      return;
    }

    haxidraw.port.send('motorsOff');
  });

  listener('click', '[data-evt-setOrigin]', () => {
    if (!haxidraw) {
      console.log('not connected');
      return;
    }

    haxidraw.port.send('setOrigin');
  });

  listener('click', '[data-evt-moveTowardsOrigin]', () => {
    if (!haxidraw) {
      console.log('not connected');
      return;
    }

    haxidraw.port.send('moveTowardsOrigin');
  });

  async function automaticallyConnect() {
    const ports = await navigator.serial.getPorts();

    ports.forEach(async (port) => {
      const info = port.getInfo();

      if (info.usbVendorId === 11914) {
        const comsBuffer = await createWebSerialBuffer(port);
        haxidraw = await createHaxidraw(comsBuffer);
        console.log(haxidraw);
        connected = true;
        updateUI();
      }
    });
  }

  automaticallyConnect();

  function updateUI() {
    // Example of updating the UI based on the connected and machineRunning state
    // You can use this to trigger visual changes or updates in your app
    console.log(`Connected: ${connected}, Machine Running: ${machineRunning}`);
  }
}