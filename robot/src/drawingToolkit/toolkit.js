import { flattenSVG } from "./flatten-svg/index.js";
import { translate, scale } from "./affineTransformations.js";

export const toolkit = {
  /**
   * Converts an SVG string into polylines.
   * @param {string} svgString - The SVG content as a string.
   * @returns {Array} Polylines represented as arrays of [x, y] coordinates.
   */
  svgToPolylines(svgString) {
    if (typeof svgString !== "string") {
      throw new Error("Argument must be a string representing an SVG.");
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgString, "image/svg+xml");
      const svg = doc.querySelector("svg");
      const polylines = flattenSVG(svg, { maxError: 0.001 }).map((pl) => pl.points);

      // Flip Y-coordinates and adjust based on maximum Y-value.
      let maxYVal = 0;
      polylines.forEach((polyline) => {
        polyline.forEach((point) => {
          if (point[1] > maxYVal) {
            maxYVal = point[1];
          }
          point[1] = -point[1];
        });
      });

      polylines.forEach((polyline) => {
        polyline.forEach((point) => {
          point[1] += maxYVal;
        });
      });

      return polylines;
    } catch (err) {
      throw new Error("SVG parsing failed. Ensure this runs outside of web workers.");
    }
  },

  /**
   * Scales polylines to fit within specified dimensions, optionally with padding.
   * @param {string} polylines - JSON stringified polylines.
   * @param {number} width - Desired width.
   * @param {number} height - Desired height.
   * @param {boolean} addPadding - Whether to add padding during scaling.
   * @returns {string} JSON stringified scaled polylines.
   */
  scalePolylinesToDimension(polylines, width, height, addPadding) {
    polylines = JSON.parse(polylines);

    // Find min X and Y values
    let minXVal = Number.POSITIVE_INFINITY;
    let minYVal = Number.POSITIVE_INFINITY;
    polylines.forEach((polyline) => {
      polyline.forEach(([x, y]) => {
        if (x < minXVal) minXVal = x;
        if (y < minYVal) minYVal = y;
      });
    });

    // Translate polylines to origin
    translate(polylines, [-minXVal, -minYVal]);

    // Find max X and Y values
    let maxXVal = Number.NEGATIVE_INFINITY;
    let maxYVal = Number.NEGATIVE_INFINITY;
    polylines.forEach((polyline) => {
      polyline.forEach(([x, y]) => {
        if (x > maxXVal) maxXVal = x;
        if (y > maxYVal) maxYVal = y;
      });
    });

    // Calculate scaling ratio
    const ratio = Math.min(width / maxXVal, height / maxYVal);
    polylines.forEach((polyline) => {
      polyline.forEach((point) => {
        point[0] *= ratio;
        point[1] *= ratio;
      });
    });

    // Center polylines within target dimensions
    if (ratio === height / maxYVal) {
      translate(polylines, [width / 2 - (maxXVal * ratio) / 2, 0]);
    } else if (ratio === width / maxXVal) {
      translate(polylines, [0, height / 2 - (maxYVal * ratio) / 2]);
    }

    // Add padding if specified
    if (addPadding) {
      scale(polylines, 0.97);
    }

    return JSON.stringify(polylines);
  },
};