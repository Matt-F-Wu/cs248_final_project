/*
Copyright (c) 2012 Juan Mellado

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var HT = HT || {};

HT.Tracker = function(params){
  this.params = params || {};

  this.mask = new CV.Image();
  this.eroded = new CV.Image();
  this.contours = [];
  
  this.skinner = new HT.Skinner();
};

HT.Tracker.prototype.detect = function(image){
  this.skinner.mask(image, this.mask);
  
  if (this.params.fast){
    this.blackBorder(this.mask);
  }else{
    CV.erode(this.mask, this.eroded);
    CV.dilate(this.eroded, this.mask);
  }

  this.contours = CV.findContours(this.mask);

  return this.findCandidate(this.contours, image.width * image.height * 0.05, 0.005);
};

HT.Tracker.prototype.findCandidate = function(contours, minSize, epsilon){
  var contour, candidate = {contour: [], hull: [], defects: []};
  
  contour = this.findMaxArea(contours, minSize);

  console.debug("Contours: " + contours);

  if (contour){
    contour = CV.approxPolyDP(contour, contour.length * epsilon);
  
    candidate = new HT.Candidate(contour);
  }
  
  return candidate;
};

HT.Tracker.prototype.findMaxArea = function(contours, minSize){
  var len = contours.length, i = 0,
      maxArea = -Infinity, area, contour;

  for (; i < len; ++ i){
    area = CV.area(contours[i]);
    if (area >= minSize){
    
      if (area > maxArea) {
        maxArea = area;
      
        contour = contours[i];
      }
    }
  }
  
  return contour;
};

HT.Tracker.prototype.blackBorder = function(image){
  var img = image.data, width = image.width, height = image.height,
      pos = 0, i;

  for (i = 0; i < width; ++ i){
    img[pos ++] = 0;
  }
  
  for (i = 2; i < height; ++ i){
    img[pos] = img[pos + width - 1] = 0;

    pos += width;
  }

  for (i = 0; i < width; ++ i){
    img[pos ++] = 0;
  }
  
  return image;
};

HT.Candidate = function(contour){
  this.contour = contour;
  this.hull = CV.convexHull(contour);
  this.defects = CV.convexityDefects(contour, this.hull);
};

HT.Skinner = function(){
};

HT.Skinner.prototype.mask = function(imageSrc, imageDst){
  var src = imageSrc.data, dst = imageDst.data, len = src.length,
      i = 0, j = 0,
      r, g, b, h, s, v, value;

  for(; i < len; i += 4){
    r = src[i];
    g = src[i + 1];
    b = src[i + 2];

    let hsv = rgbToHsv(r, g, b);
    let h = hsv[0]*255;
    let s = hsv[1]*255;
    let v = hsv[2]*255;

    value = 0;

    if (inRange(h, s, v, r, g, b)){
      value = 255;
    }
    
    dst[j ++] = value;
  }
  
  imageDst.width = imageSrc.width;
  imageDst.height = imageSrc.height;
  
  return imageDst;
};

function inRange(h, s, v, R, G, B, A=255){
  // Hao: skin color range according to this paper:
  // https://arxiv.org/ftp/arxiv/papers/1708/1708.02694.pdf
  //console.log(h, s, v, R, G, B);
  if(h >= hsv_min[0] && h <= hsv_max[0] && s >= hsv_min[1] && s <= hsv_max[1] && v >= hsv_min[2] && v <= hsv_max[2] && R > 95 && G > 40 && B > 20 && R > G && R > B && Math.abs(R - G) > 15 && A > 15){
    return true;
  }else{
    return false;
  }
}

/**
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSL representation
 */
function rgbToHsl(r, g, b) {
  r /= 255, g /= 255, b /= 255;

  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }

    h /= 6;
  }

  return [ h, s, l ];
}

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  l       The lightness
 * @return  Array           The RGB representation
 */
function hslToRgb(h, s, l) {
  var r, g, b;

  if (s == 0) {
    r = g = b = l; // achromatic
  } else {
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }

    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;

    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [ r * 255, g * 255, b * 255 ];
}

/**
 * Converts an RGB color value to HSV. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and v in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSV representation
 */
function rgbToHsv(r, g, b) {
  r /= 255, g /= 255, b /= 255;

  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, v = max;

  var d = max - min;
  s = max == 0 ? 0 : d / max;

  if (max == min) {
    h = 0; // achromatic
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }

    h /= 6;
  }

  return [ h, s, v ];
}

/**
 * Converts an HSV color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes h, s, and v are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  v       The value
 * @return  Array           The RGB representation
 */
function hsvToRgb(h, s, v) {
  var r, g, b;

  var i = Math.floor(h * 6);
  var f = h * 6 - i;
  var p = v * (1 - s);
  var q = v * (1 - f * s);
  var t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }

  return [ r * 255, g * 255, b * 255 ];
}



const scaleSatLower = 0.24;
const scaleSatUpper = 0.9;
//Throwing away the V channel in HSV and only considering H and S channels is really enough (surprisingly) to detect different skin tones and under different lighting variations. A plus side is that its computation is fast.
const hsv_min = [0, 255*scaleSatLower, 0];
const hsv_max = [55, 255*scaleSatUpper, 255];


//Hao: another broader range
/*
const hsv_min = [0, 30, 60];
const hsv_max = [20, 150, 255];
*/