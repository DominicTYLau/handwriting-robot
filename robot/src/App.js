import React, { useState, useEffect } from "react";
import axios from "axios";
import { toolkit } from "./drawingToolkit/toolkit.js";
import { addMachineControl } from "./events/addMachineControl.js";
import "./styles.css";
import svgPath from "./logo.svg";

import { createHaxidraw } from "./haxidraw/createHaxidraw.js";
import { createWebSerialBuffer } from "./haxidraw/createWebSerialBuffer.js";

let haxidraw = null;
let connected = false;

const App = () => {
  const [text, setText] = useState("");
  const [polylines, setPolylines] = useState(null);
  const [svgContent, setSvgContent] = useState("");
  const [error, setError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");

  const handleTextChange = (event) => setText(event.target.value);

  const disconnect = async () => {
    try {
      if (haxidraw && haxidraw.port) {
        await haxidraw.port.close();
      }
    } catch (e) {
      console.error("Disconnect error:", e);
    } finally {
      haxidraw = null;
      connected = false;
      setConnectionStatus("Disconnected");
    }
  };

  const sleep = (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  const connect = async () => {
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
          console.log("connecting");
          const comsBuffer = await createWebSerialBuffer(port);
          haxidraw = await createHaxidraw(comsBuffer);

          console.log(haxidraw);
          connected = true;
        })
        .catch((e) => {
          // The user didn't select a port.
        });
    } else {
      // disconnect
      console.log("disconnecting");
      await haxidraw.port.close();
      haxidraw = null;
      connected = false;
    }
  };


  const secret = async() => {
    try {
            // Fetch the SVG content
        const response = await fetch(svgPath);
        if (!response.ok) {
            throw new Error(`Failed to fetch SVG: ${response.statusText}`);
        }
        const stringSvg = await response.text(); // Get SVG as a string
        
        console.log("SVG Content as String:", stringSvg);

        const result = toolkit.svgToPolylines(stringSvg);
        const resizedPolylines = toolkit.scalePolylinesToDimension(
          JSON.stringify(result),
          100,
          100,
          true
        );
    
        // Convert resizedPolylines to a 3D array by wrapping each 2D polyline
    
        setPolylines(resizedPolylines);
  
        const resizedPolylines3D = JSON.parse(resizedPolylines);
    
        drawNotFlipped(resizedPolylines3D);
    
        setError("");
      } catch (err) {
        setError(`Error converting SVG: ${err.message}`);
      }


      };
  
      const drawNotFlipped = async (lines) => {
        await haxidraw.goTo(0, 0);
        // await haxidraw.servo(1700);  // pen Down
        await haxidraw.servo(1000); // pen Up
        await haxidraw.goTo(50, 50);
        await haxidraw.goTo(0, 0);
    
    
        for (let i = 0; i < lines.length; i++) {
    
            
            // Loop through the second dimension of the 3D array
            for (let j = 0; j < lines[i].length; j++) {
                let line = lines[i][j]; // Each line is an array of points
    
              if(j === 0){
                await haxidraw.goTo(line[0], line[1]);
                await haxidraw.servo(1700);  // pen Down
                await sleep(100);
              }
      
              await haxidraw.goTo(line[0], line[1]);
    
            }
                await haxidraw.servo(1000); // pen Up
              await sleep(75);
          }
    
      };
  const draw = async (lines) => {
    await haxidraw.goTo(0, 0);
    // await haxidraw.servo(1700);  // pen Down
    await haxidraw.servo(1000); // pen Up
    await haxidraw.goTo(50, 50);
    await haxidraw.goTo(0, 0);


    for (let i = 0; i < lines.length; i++) {        
        // Loop through the second dimension of the 3D array
        for (let j = 0; j < lines[i].length; j++) {
            let line = lines[i][j]; // Each line is an array of points

          if(j === 0){
            await haxidraw.goTo(line[0], (125 - line[1]));
            await haxidraw.servo(1700);  // pen Down
            await sleep(100);
          }
  
          await haxidraw.goTo(line[0], (125 - line[1]));

        }
            await haxidraw.servo(1000); // pen Up
          await sleep(75);
      }

  };

  const convertToPolylines = async (svg) => {
    try {
      const result = toolkit.svgToPolylines(svg);
      const resizedPolylines = toolkit.scalePolylinesToDimension(
        JSON.stringify(result),
        100,
        100,
        true
      );
  
      // Convert resizedPolylines to a 3D array by wrapping each 2D polyline
  
      setPolylines(resizedPolylines);

      const resizedPolylines3D = JSON.parse(resizedPolylines);
  
      draw(resizedPolylines3D);
  
      setError("");
    } catch (err) {
      setError(`Error converting SVG: ${err.message}`);
    }
  };

  const generateSvg = async () => {
    try {
      const { data } = await axios.post(
        "http://127.0.0.1:5000/foo",
        { text },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (data.svg) {
        setSvgContent(data.svg);
        convertToPolylines(data.svg);
      } else {
        setError("Error generating SVG");
      }
    } catch (err) {
      console.error("Error sending text to Python:", err);
      setError("Error processing text");
    }
  };

  const startVoiceRecognition = () => {
    const recognition = new (window.SpeechRecognition ||
      window.webkitSpeechRecognition ||
      window.mozSpeechRecognition ||
      window.msSpeechRecognition)();

    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setText((prevText) => prevText + " " + transcript);
    };

    recognition.start();
  };

  // Disconnect on component mount
  useEffect(() => {
    disconnect();
  }, []);

  return (
    <div className={`app-container ${isHighContrast ? "high-contrast" : ""}`}>
      <div className="top-right-toggle">
        <button
          onClick={() => setIsHighContrast(!isHighContrast)}
          className="button contrast-toggle"
        >
          Toggle {isHighContrast ? "Normal Mode" : "High Contrast Mode"}
        </button>
      </div>
      <h1
        onDoubleClick={secret} // Attach the double-click event
        style={{ cursor: "pointer" }} // Optional: Adds a visual indicator for interactivity
      >
        Text to SVG Converter with Machine Control
      </h1>
  
      <input
        type="text"
        value={text}
        onChange={handleTextChange}
        placeholder="Enter text"
        className="input-field"
      />
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}
      <div className="button-container">
        <button
          onClick={generateSvg}
          disabled={!text}
          className="button primary-button"
        >
          Generate SVG
        </button>
        <button
          onClick={startVoiceRecognition}
          className="button secondary-button"
          disabled={isListening}
        >
          {isListening ? "Listening..." : "Start Voice Input"}
        </button>
        <button
          className="button warning-button"
          onClick={connectionStatus === "Connected" ? disconnect : connect}
        >
          {connectionStatus === "Connected" ? "Disconnect" : "Connect"}
        </button>
      </div>
  
      {polylines && (
        <div className="output-container">
          <h3>Generated Code:</h3>
          <pre className="code-block">
            {`const polylines = ${JSON.stringify(polylines, null, 2)};`}
          </pre>
        </div>
      )}
      {svgContent && (
        <div className="output-container">
          <h3>Generated SVG:</h3>
          <div
            className="svg-preview"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        </div>
      )}
    </div>
  );
};

export default App;
